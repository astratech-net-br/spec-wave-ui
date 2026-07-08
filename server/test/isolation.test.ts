// Testes de isolamento entre tenants (fase 2). Rodam contra um dynamodb-local:
//   docker run -d --rm -p 8000:8000 amazon/dynamodb-local
//   npm -w server test
// Sem o endpoint acessível, os testes falham rápido com mensagem clara.
//
// Cobrem a garantia central do SaaS: um tenant nunca lista, lê ou colide com
// dados de outro — nem via API HTTP (401 sem token), nem via camada de serviço.

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

// Env ANTES de importar qualquer módulo da app (config lê no import).
process.env.TABLE_NAME = 'spec-wave-test';
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'local';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? 'local';
process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
delete process.env.DEV_TENANT_ID; // o teste de 401 exige auth "de verdade"

const { CreateTableCommand, DeleteTableCommand, DynamoDBClient } = await import(
  '@aws-sdk/client-dynamodb'
);
const dynamo = await import('../src/db/dynamo.ts');
const { listRepositories, getRepository } = await import('../src/services/repositoryService.ts');
const { HttpError } = await import('../src/lib/errors.ts');
const { createApp } = await import('../src/index.ts');

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const REPO_B = '01TESTREPOB000000000000000';

before(async () => {
  await client.send(new DeleteTableCommand({ TableName: 'spec-wave-test' })).catch(() => {});
  await client.send(
    new CreateTableCommand({
      TableName: 'spec-wave-test',
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

  // Repositório do tenant B.
  await dynamo.createRepositoryRecord({
    id: REPO_B,
    tenantId: TENANT_B,
    name: 'acme/segredo',
    url: 'https://github.com/acme/segredo',
    installationId: 999,
    createdAt: new Date().toISOString(),
  });
});

describe('isolamento entre tenants (camada de serviço)', () => {
  it('lista do tenant A não contém repositórios do tenant B', async () => {
    const repos = await listRepositories(TENANT_A);
    assert.equal(repos.length, 0);
  });

  it('tenant A não acessa repo do tenant B por id (404)', async () => {
    await assert.rejects(
      () => getRepository(TENANT_A, REPO_B),
      (err: unknown) => err instanceof HttpError && err.status === 404,
    );
  });

  it('tenant B acessa o próprio repo normalmente', async () => {
    const repo = await getRepository(TENANT_B, REPO_B);
    assert.equal(repo.name, 'acme/segredo');
  });

  it('urls iguais em tenants diferentes NÃO colidem (lock é por tenant)', async () => {
    await dynamo.createRepositoryRecord({
      id: '01TESTREPOA000000000000000',
      tenantId: TENANT_A,
      name: 'acme/segredo',
      url: 'https://github.com/acme/segredo', // mesma url do tenant B
      installationId: 111,
      createdAt: new Date().toISOString(),
    });
    const repos = await listRepositories(TENANT_A);
    assert.equal(repos.length, 1);
  });

  it('url duplicada DENTRO do mesmo tenant → 409', async () => {
    await assert.rejects(
      () =>
        dynamo.createRepositoryRecord({
          id: '01TESTREPOA200000000000000',
          tenantId: TENANT_A,
          name: 'acme/segredo',
          url: 'https://github.com/acme/segredo',
          installationId: 111,
          createdAt: new Date().toISOString(),
        }),
      (err: unknown) => err instanceof HttpError && err.status === 409,
    );
  });
});

describe('isolamento na borda HTTP', () => {
  it('request sem claims nem DEV_TENANT_ID → 401', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const port = (server.address() as AddressInfo).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/repositories`);
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });
});
