// Defesa em profundidade (fase 2): credenciais DynamoDB restritas por tenant.
// A Lambda assume TENANT_ROLE_ARN com session tag tenant_id=<tenant>; a policy
// da role limita dynamodb:LeadingKeys a TENANT#<tag> (+ chaves compartilhadas
// INSTALLATION#/STATE#). Assim, além do scoping por código (PK sempre com
// tenantId), o próprio IAM bloqueia leitura de dados de outro tenant.
//
// Credenciais são cacheadas por tenant (~45 min; sessão de 1 h) — 1 STS call
// por tenant por container.

import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '../config.ts';

const sts = new STSClient({});

interface CachedClient {
  doc: DynamoDBDocumentClient;
  expiresAt: number;
}

const cache = new Map<string, CachedClient>();

export async function tenantScopedDocClient(
  tenantId: string,
): Promise<DynamoDBDocumentClient | undefined> {
  if (!config.tenantRoleArn) return undefined; // hardening desligado (dev local)

  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt - Date.now() > 5 * 60_000) return cached.doc;

  const out = await sts.send(
    new AssumeRoleCommand({
      RoleArn: config.tenantRoleArn,
      RoleSessionName: `tenant-${tenantId}`.slice(0, 64),
      DurationSeconds: 3600,
      Tags: [{ Key: 'tenant_id', Value: tenantId }],
    }),
  );
  const c = out.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
    throw new Error('STS não devolveu credenciais para a role de tenant.');
  }

  const doc = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      ...(config.dynamoEndpoint ? { endpoint: config.dynamoEndpoint } : {}),
      credentials: {
        accessKeyId: c.AccessKeyId,
        secretAccessKey: c.SecretAccessKey,
        sessionToken: c.SessionToken,
      },
    }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
  cache.set(tenantId, {
    doc,
    expiresAt: c.Expiration ? c.Expiration.getTime() : Date.now() + 45 * 60_000,
  });
  return doc;
}
