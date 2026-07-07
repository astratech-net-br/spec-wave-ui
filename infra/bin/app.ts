// App CDK do SaaS spec-flow-ui. Conta fixada em 458889634344 (decisão do
// usuário) — deploy acidental em outra conta falha no bootstrap/lookup.

import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../lib/stateful-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { WebStack } from '../lib/web-stack.js';
import { ObservabilityStack } from '../lib/observability-stack.js';
import { CicdStack } from '../lib/cicd-stack.js';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '458889634344',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const stateful = new StatefulStack(app, 'SpecWaveStateful', { env });

const api = new ApiStack(app, 'SpecWaveApi', {
  env,
  table: stateful.table,
  userPool: stateful.userPool,
  userPoolClient: stateful.userPoolClient,
  secretsKey: stateful.secretsKey,
  tenantDataKey: stateful.tenantDataKey,
  githubAppPrivateKeySecret: stateful.githubAppPrivateKeySecret,
  githubWebhookSecret: stateful.githubWebhookSecret,
  openrouterSecret: stateful.openrouterSecret,
  stripeSecretKey: stateful.stripeSecretKey,
  stripeWebhookSecret: stateful.stripeWebhookSecret,
});

new WebStack(app, 'SpecWaveWeb', { env, httpApi: api.httpApi });

new ObservabilityStack(app, 'SpecWaveObservability', {
  env,
  httpApi: api.httpApi,
  apiFn: api.apiFn,
  webhookFn: api.webhookFn,
  table: stateful.table,
});

// CI/CD (OIDC) só quando o repo é informado: -c githubRepo=org/repo
const githubRepo = app.node.tryGetContext('githubRepo') as string | undefined;
if (githubRepo) {
  new CicdStack(app, 'SpecWaveCicd', { env, githubRepo });
}
