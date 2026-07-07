// API do SaaS: Lambda "api" (Express via serverless-http) atrás de um HTTP API
// com JWT authorizer do Cognito, e Lambda "webhook" (rota pública, assinatura
// HMAC verificada no código). IAM mínimo: Dynamo na tabela + GetSecretValue nos
// 3 segredos.

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverSrc = path.resolve(__dirname, '../../server/src');

export interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  secretsKey: kms.Key;
  tenantDataKey: kms.Key;
  githubAppPrivateKeySecret: secretsmanager.Secret;
  githubWebhookSecret: secretsmanager.Secret;
  openrouterSecret: secretsmanager.Secret;
  stripeSecretKey: secretsmanager.Secret;
  stripeWebhookSecret: secretsmanager.Secret;
}

export class ApiStack extends cdk.Stack {
  readonly httpApi: apigwv2.HttpApi;
  readonly apiFn: NodejsFunction;
  readonly webhookFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const githubAppId = (this.node.tryGetContext('githubAppId') as string) ?? '';
    const githubAppSlug = (this.node.tryGetContext('githubAppSlug') as string) ?? '';
    const appUrl = (this.node.tryGetContext('appUrl') as string) ?? '';
    const stripePricePro = (this.node.tryGetContext('stripePricePro') as string) ?? '';

    const commonEnv = {
      NODE_ENV: 'production',
      TABLE_NAME: props.table.tableName,
      GITHUB_APP_ID: githubAppId,
      GITHUB_APP_SLUG: githubAppSlug,
      GITHUB_APP_PRIVATE_KEY_SECRET_ARN: props.githubAppPrivateKeySecret.secretArn,
      GITHUB_WEBHOOK_SECRET_ARN: props.githubWebhookSecret.secretArn,
      OPENROUTER_SECRET_ARN: props.openrouterSecret.secretArn,
      STRIPE_SECRET_ARN: props.stripeSecretKey.secretArn,
      STRIPE_WEBHOOK_SECRET_ARN: props.stripeWebhookSecret.secretArn,
      STRIPE_PRICE_PRO: stripePricePro,
      APP_URL: appUrl,
      TENANT_KMS_KEY_ID: props.tenantDataKey.keyId,
    };
    const bundling = { format: OutputFormat.ESM, target: 'node22' };

    // ---------- Lambda api (Express monolito) ----------
    const apiFn = new NodejsFunction(this, 'ApiFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(serverSrc, 'lambda.ts'),
      handler: 'handler',
      memorySize: 512,
      // Teto do HTTP API é 29 s — o refine síncrono usa quase tudo; medir e,
      // se estourar, mover para Function URL/assíncrono (fase 2 do plano).
      timeout: cdk.Duration.seconds(29),
      environment: commonEnv,
      bundling,
    });
    this.apiFn = apiFn;

    // ---------- LeadingKeys (defesa em profundidade, fase 2) ----------
    // A Lambda api NÃO tem acesso direto à tabela. Por request ela assume a
    // TenantDataRole com session tag tenant_id, e o IAM restringe o DynamoDB a
    // TENANT#<tag> (+ chaves compartilhadas do onboarding). Mesmo um bug que
    // esquecesse o tenantId numa query seria bloqueado pelo IAM.
    const tenantDataRole = new iam.Role(this, 'TenantDataRole', {
      assumedBy: new iam.SessionTagsPrincipal(new iam.ArnPrincipal(apiFn.role!.roleArn)),
      description: 'spec-wave: acesso ao DynamoDB restrito por tenant (dynamodb:LeadingKeys)',
      maxSessionDuration: cdk.Duration.hours(1),
    });
    tenantDataRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:ConditionCheckItem',
        ],
        resources: [props.table.tableArn],
        conditions: {
          'ForAllValues:StringLike': {
            'dynamodb:LeadingKeys': [
              'TENANT#${aws:PrincipalTag/tenant_id}',
              // Chaves compartilhadas (sem dado sensível de outro tenant):
              // instalação/state do onboarding, convites e mapeamento Stripe.
              'INSTALLATION#*',
              'STATE#*',
              'INVITECODE#*',
              'STRIPECUST#*',
              // Aceite de convite reescreve o próprio vínculo USER#<sub>.
              'USER#*',
            ],
          },
        },
      }),
    );
    apiFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole', 'sts:TagSession'],
        resources: [tenantDataRole.roleArn],
      }),
    );
    apiFn.addEnvironment('TENANT_ROLE_ARN', tenantDataRole.roleArn);

    // Cifra/decifra segredos por tenant (chave OpenRouter própria — fase 3).
    props.tenantDataKey.grant(apiFn, 'kms:Encrypt', 'kms:Decrypt');

    // ---------- Lambda webhook (pública, HMAC no código) ----------
    const webhookFn = new NodejsFunction(this, 'WebhookFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(serverSrc, 'webhook.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: commonEnv,
      bundling,
    });
    this.webhookFn = webhookFn;
    props.table.grantReadWriteData(webhookFn);

    // Leitura dos segredos via policy de IDENTIDADE (na role, deste stack) — o
    // grantRead() do Secret editaria a key policy da CMK no StatefulStack,
    // criando ciclo entre os stacks. A key policy default da CMK delega ao IAM.
    const secretArns = [
      props.githubAppPrivateKeySecret.secretArn,
      props.githubWebhookSecret.secretArn,
      props.openrouterSecret.secretArn,
      props.stripeSecretKey.secretArn,
      props.stripeWebhookSecret.secretArn,
    ];
    const readSecrets = new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      // Secrets Manager sufixa o nome com 6 chars aleatórios — o ARN exportado
      // já é completo, sem wildcard necessário.
      resources: secretArns,
    });
    const decryptSecrets = new iam.PolicyStatement({
      actions: ['kms:Decrypt'],
      resources: [props.secretsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': `secretsmanager.${this.region}.amazonaws.com`,
        },
      },
    });
    for (const fn of [apiFn, webhookFn]) {
      fn.addToRolePolicy(readSecrets);
      fn.addToRolePolicy(decryptSecrets);
    }

    // ---------- HTTP API + JWT authorizer (Cognito) ----------
    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'spec-wave',
      // Throttling de stage: proteção base por conta (cota por tenant = fase 3).
      // CORS dispensável: o client chega via CloudFront /api/* (mesma origem).
    });

    const authorizer = new HttpJwtAuthorizer(
      'CognitoJwt',
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      { jwtAudience: [props.userPoolClient.userPoolClientId] },
    );

    const apiIntegration = new HttpLambdaIntegration('ApiIntegration', apiFn);
    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: apiIntegration,
      authorizer,
    });
    // Health check sem auth.
    this.httpApi.addRoutes({
      path: '/status',
      methods: [apigwv2.HttpMethod.GET],
      integration: apiIntegration,
    });
    // Webhook do GitHub App: público (o GitHub não manda JWT) — HMAC no handler.
    this.httpApi.addRoutes({
      path: '/webhooks/github',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('WebhookIntegration', webhookFn),
    });

    // Webhook do Stripe (fase 3): público — assinatura verificada no handler.
    // Único caminho que muda o plano do tenant.
    const stripeWebhookFn = new NodejsFunction(this, 'StripeWebhookFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(serverSrc, 'webhookStripe.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: commonEnv,
      bundling,
    });
    props.table.grantReadWriteData(stripeWebhookFn);
    stripeWebhookFn.addToRolePolicy(readSecrets);
    stripeWebhookFn.addToRolePolicy(decryptSecrets);
    this.httpApi.addRoutes({
      path: '/webhooks/stripe',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('StripeWebhookIntegration', stripeWebhookFn),
    });

    const stage = this.httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage | undefined;
    if (stage) {
      stage.defaultRouteSettings = {
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      };
    }

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'WebhookUrl', {
      value: `${this.httpApi.apiEndpoint}/webhooks/github`,
      description: 'Configure como Webhook URL do GitHub App',
    });
    new cdk.CfnOutput(this, 'StripeWebhookUrl', {
      value: `${this.httpApi.apiEndpoint}/webhooks/stripe`,
      description: 'Configure como endpoint de webhook no Stripe (eventos checkout.session.completed, customer.subscription.updated/deleted)',
    });
  }
}
