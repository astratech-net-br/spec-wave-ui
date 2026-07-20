// Testes da Story #78 / Task #81: o middleware de sessão (tenantContext) injeta
// o tenant ativo no request e GET /api/tenant/active devolve os dados desse
// tenant — e só desse (RN005 / critério "Consistência multi-tenant").
//
// Sobe o app Express real (createApp) atrás de um wrapper que simula o evento do
// API Gateway, que é de onde o middleware lê os claims já validados pelo JWT
// authorizer. Assim exercitamos a cadeia completa: claims → tenantContext →
// rota → DynamoDB (dynamodb-local).

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

const TABLE = 'spec-wave-test-tenant-active';

process.env.TABLE_NAME = TABLE;
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'local';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? 'local';
process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
// Sem atalho de dev e sem hardening de STS: o tenant tem de vir do claim.
delete process.env.DEV_TENANT_ID;
delete process.env.TENANT_ROLE_ARN;

const { CreateTableCommand, DeleteTableCommand, DynamoDBClient } = await import(
  '@aws-sdk/client-dynamodb'
);
const express = (await import('express')).default;
const dynamo = await import('../src/db/dynamo.ts');
const { createApp } = await import('../src/index.ts');

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });

const ACME = 'acme';
const GLOBEX = 'globex';
const ORPHAN = 'tenant-sem-registro';

// Claims da "sessão" corrente — trocados a cada requisição do teste.
type Claims = Record<string, string> | null;
let claims: Claims = null;

let server: ReturnType<express.Express['listen']>;
let baseUrl = '';

interface ActiveTenantResponse {
  id?: string;
  name?: string;
  error?: string;
}

// Faz GET /api/tenant/active como se a sessão fosse a dos `claims` informados.
async function getActiveTenant(sessionClaims: Claims) {
  claims = sessionClaims;
  const res = await fetch(`${baseUrl}/api/tenant/active`);
  return {
    status: res.status,
    cacheControl: res.headers.get('cache-control'),
    body: (await res.json()) as ActiveTenantResponse,
  };
}

before(async () => {
  await client.send(new DeleteTableCommand({ TableName: TABLE })).catch(() => {});
  await client.send(
    new CreateTableCommand({
      TableName: TABLE,
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }),
  );

  await dynamo.putTenant({
    tenantId: ACME,
    name: 'Acme S.A.',
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
  });
  await dynamo.putTenant({
    tenantId: GLOBEX,
    name: 'Globex Ltda',
    plan: 'pro',
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  // Wrapper: anexa o evento do API Gateway ao request, como o serverless-http
  // faz em produção (ver lambda.ts). Sem claims → sessão inválida/ausente.
  const app = express();
  app.use((req, _res, next) => {
    (req as express.Request & { apiGatewayEvent?: unknown }).apiGatewayEvent = {
      requestContext: {
        requestId: 'test-request',
        ...(claims ? { authorizer: { jwt: { claims } } } : {}),
      },
    };
    next();
  });
  app.use(createApp());

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server?.close();
  await client.send(new DeleteTableCommand({ TableName: TABLE })).catch(() => {});
});

describe('tenantContext: injeção do tenant ativo da sessão (Task #81)', () => {
  it('recusa com 401 quando a sessão não traz claim de tenant', async () => {
    const res = await getActiveTenant(null);

    assert.equal(res.status, 401);
    assert.ok(res.body.error, 'deve responder um erro em JSON');
    assert.equal(res.body.id, undefined, 'não pode vazar tenant sem sessão válida');
  });

  it('injeta o tenant do claim custom:tenant_id e a rota devolve id + nome do banco', async () => {
    const res = await getActiveTenant({ 'custom:tenant_id': ACME, sub: 'user-1' });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { id: ACME, name: 'Acme S.A.' });
  });
});

describe('GET /api/tenant/active (RN005: consistência multi-tenant)', () => {
  it('cada sessão recebe o seu próprio tenant ativo, nunca o de outra', async () => {
    const acme = await getActiveTenant({ 'custom:tenant_id': ACME, sub: 'user-1' });
    const globex = await getActiveTenant({ 'custom:tenant_id': GLOBEX, sub: 'user-2' });

    assert.deepEqual(acme.body, { id: ACME, name: 'Acme S.A.' });
    assert.deepEqual(globex.body, { id: GLOBEX, name: 'Globex Ltda' });

    // O mesmo usuário, ao voltar para a sessão do primeiro tenant, não pode
    // receber resíduo da sessão anterior.
    const acmeDeNovo = await getActiveTenant({ 'custom:tenant_id': ACME, sub: 'user-1' });
    assert.deepEqual(acmeDeNovo.body, { id: ACME, name: 'Acme S.A.' });
  });

  it('não é cacheável por intermediários (resposta específica da sessão)', async () => {
    const res = await getActiveTenant({ 'custom:tenant_id': ACME, sub: 'user-1' });

    assert.match(res.cacheControl ?? '', /no-store/);
  });

  it('tenant sem registro no banco → 200 com nome vazio (client cai no placeholder de CE002)', async () => {
    const res = await getActiveTenant({ 'custom:tenant_id': ORPHAN, sub: 'user-3' });

    // Não é erro: a sessão é válida. O id continua correto e o client mostra
    // '[Dados não disponíveis]' no nome, mantendo o logout acionável.
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { id: ORPHAN, name: '' });
  });
});
