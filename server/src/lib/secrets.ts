// Segredos em runtime: Secrets Manager (produção, cache por container) com
// fallback para env var (dev local, sem AWS). Nenhum segredo vai para o SQLite/
// Dynamo nem para o browser.

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
const cache = new Map<string, string>();

// Lê um segredo pelo ARN/nome, com cache em memória (vida do container Lambda).
export async function getSecret(arn: string): Promise<string> {
  const cached = cache.get(arn);
  if (cached !== undefined) return cached;
  const out = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  const value = out.SecretString ?? '';
  cache.set(arn, value);
  return value;
}

// Resolve um segredo: env var direta (dev) tem precedência; senão Secrets Manager.
export async function resolveSecret(envValue: string, secretArn: string): Promise<string> {
  if (envValue) return envValue;
  if (secretArn) return getSecret(secretArn);
  return '';
}
