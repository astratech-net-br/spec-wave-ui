// CI/CD (fase 2): OIDC do GitHub Actions → role de deploy SEM access keys.
// A role só pode assumir as roles de bootstrap do CDK (cdk-*) — o deploy real
// acontece com as permissões que o próprio bootstrap provisionou.
//
// Deploy deste stack exige o contexto githubRepo (ex.: -c githubRepo=org/repo);
// sem ele o stack é omitido pelo bin/app.ts.

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CicdStackProps extends cdk.StackProps {
  githubRepo: string; // "org/repo"
}

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    // Provider OIDC do GitHub (1 por conta). Se a conta já tiver um, importe com
    // -c reuseGithubOidcProviderArn=arn:aws:iam::458889634344:oidc-provider/...
    const reuseArn = this.node.tryGetContext('reuseGithubOidcProviderArn') as string | undefined;
    const provider = reuseArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GithubOidc', reuseArn)
      : new iam.OpenIdConnectProvider(this, 'GithubOidc', {
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
        });

    const deployRole = new iam.Role(this, 'DeployRole', {
      roleName: 'spec-wave-github-deploy',
      description: 'spec-wave: deploy via GitHub Actions (OIDC), só branch main',
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          // Restringe ao push na main do repo — PRs/forks não assumem a role.
          'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: deployRole.roleArn,
      description: 'Configure como variável SPEC_WAVE_DEPLOY_ROLE_ARN no repositório GitHub',
    });
  }
}
