// Triggers do Cognito User Pool:
//   postConfirmation   → cria TENANT# + USER# no DynamoDB (1 tenant por signup no MVP)
//   preTokenGeneration → injeta o claim custom:tenant_id no JWT (lido pelo
//                        middleware de auth em cada request, sem consulta extra)

import { putTenant, putUser, putMember, getUser } from '../db/dynamo.ts';
import { ulid } from '../lib/ulid.ts';
import { logger } from '../lib/logger.ts';

interface CognitoEvent {
  userName: string;
  request: {
    userAttributes?: Record<string, string>;
    groupConfiguration?: unknown;
  };
  response: Record<string, unknown>;
}

export async function postConfirmation(event: CognitoEvent): Promise<CognitoEvent> {
  const sub = event.request.userAttributes?.sub ?? event.userName;
  const email = event.request.userAttributes?.email ?? '';

  // Idempotente: re-confirmação (ou retry do trigger) não cria segundo tenant.
  const existing = await getUser(sub);
  if (existing) return event;

  const tenantId = ulid();
  const now = new Date().toISOString();
  await putTenant({ tenantId, name: email || sub, plan: 'free', status: 'active', createdAt: now });
  await putUser({ sub, tenantId, email, role: 'owner', createdAt: now });
  await putMember({ sub, tenantId, email, role: 'owner', createdAt: now });
  logger.info(`Tenant ${tenantId} criado para o usuário ${sub}.`);
  return event;
}

export async function preTokenGeneration(event: CognitoEvent): Promise<CognitoEvent> {
  const sub = event.request.userAttributes?.sub ?? event.userName;
  const user = await getUser(sub);
  if (user) {
    event.response = {
      ...event.response,
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          'custom:tenant_id': user.tenantId,
          'custom:role': user.role,
        },
      },
    };
  } else {
    // Usuário sem tenant (ex.: criado fora do fluxo) — token sai sem claim e a
    // API responde 401; melhor que inventar um tenant aqui.
    logger.warn(`preTokenGeneration: usuário ${sub} sem vínculo de tenant.`);
  }
  return event;
}
