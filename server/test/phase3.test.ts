// Testes da fase 3 (dynamodb-local): cota mensal de refines (token bucket
// atômico), teto de repositórios do plano e ciclo de convites (aceite muda o
// tenant do usuário; código é uso único).

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.TABLE_NAME = 'spec-wave-test-p3';
process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'local';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? 'local';
process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

const { CreateTableCommand, DeleteTableCommand, DynamoDBClient } = await import(
  '@aws-sdk/client-dynamodb'
);
const dynamo = await import('../src/db/dynamo.ts');
const { consumeRefineOrThrow, assertRepoQuota, usageSummary } = await import(
  '../src/services/quotaService.ts'
);
const { createInvite, acceptInvite } = await import('../src/services/teamService.ts');
const { PLANS } = await import('../src/lib/plans.ts');
const { HttpError } = await import('../src/lib/errors.ts');

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });
const TENANT = 'quota-tenant';

before(async () => {
  await client.send(new DeleteTableCommand({ TableName: 'spec-wave-test-p3' })).catch(() => {});
  await client.send(
    new CreateTableCommand({
      TableName: 'spec-wave-test-p3',
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
    tenantId: TENANT,
    name: 'Quota Tenant',
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

describe('cota de refines (token bucket mensal)', () => {
  it(`permite exatamente ${PLANS.free.refinesPerMonth} refines no plano free e 429 no seguinte`, async () => {
    for (let i = 0; i < PLANS.free.refinesPerMonth; i++) {
      await consumeRefineOrThrow(TENANT);
    }
    await assert.rejects(
      () => consumeRefineOrThrow(TENANT),
      (err: unknown) => err instanceof HttpError && err.status === 429,
    );
    const usage = await usageSummary(TENANT);
    assert.equal(usage.refinesUsed, PLANS.free.refinesPerMonth);
  });
});

describe('cota de repositórios do plano', () => {
  it(`402 ao exceder ${PLANS.free.maxRepos} repositórios no free`, async () => {
    for (let i = 0; i < PLANS.free.maxRepos; i++) {
      await dynamo.createRepositoryRecord({
        id: `01REPOQUOTA000000000000${i}0`,
        tenantId: TENANT,
        name: `acme/r${i}`,
        url: `https://github.com/acme/r${i}`,
        installationId: 1,
        createdAt: new Date().toISOString(),
      });
    }
    await assert.rejects(
      () => assertRepoQuota(TENANT),
      (err: unknown) => err instanceof HttpError && err.status === 402,
    );
  });
});

describe('convites (multi-usuário)', () => {
  it('aceite move o usuário para o tenant convidante; código é uso único', async () => {
    // Convidado com tenant próprio (como o signup cria).
    await dynamo.putTenant({
      tenantId: 'guest-tenant',
      name: 'Guest',
      plan: 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    await dynamo.putUser({
      sub: 'guest-sub',
      tenantId: 'guest-tenant',
      email: 'guest@x.com',
      role: 'owner',
      createdAt: new Date().toISOString(),
    });
    await dynamo.putMember({
      sub: 'guest-sub',
      tenantId: 'guest-tenant',
      email: 'guest@x.com',
      role: 'owner',
      createdAt: new Date().toISOString(),
    });

    const invite = await createInvite(TENANT, 'owner-sub', 'guest@x.com', 'member');
    const result = await acceptInvite(invite.code, { sub: 'guest-sub', email: 'guest@x.com' });
    assert.equal(result.tenantId, TENANT);

    const user = await dynamo.getUser('guest-sub');
    assert.equal(user?.tenantId, TENANT);
    assert.equal(user?.role, 'member');

    const members = await dynamo.listMembers(TENANT);
    assert.ok(members.some((m) => m.sub === 'guest-sub'));

    // Reuso do código → 403.
    await assert.rejects(
      () => acceptInvite(invite.code, { sub: 'outro-sub' }),
      (err: unknown) => err instanceof HttpError && err.status === 403,
    );
  });
});
