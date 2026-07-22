// Multi-usuário por tenant (fase 3): convites e membros.
//
// Convite: owner gera um código (uso único, TTL 7 dias). O convidado cria conta
// normalmente (signup cria um tenant próprio descartável), loga e aceita o
// convite — o vínculo USER#<sub> é REESCRITO para o tenant convidante. O claim
// custom:tenant_id só muda no próximo token → o client força re-login após o
// aceite (ver client/src/pages de convite).

import { randomUUID } from 'node:crypto';
import {
  consumeInvite,
  deleteInviteMirror,
  deleteMember,
  getUser,
  listInvites,
  listMembers,
  putInvite,
  putMember,
  putUser,
  getTenant,
  type InviteRecord,
  type MemberRecord,
} from '../db/dynamo.ts';
import { planLimits } from '../lib/plans.ts';
import { HttpError, NotFoundError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { invokeAsync } from '../lib/lambdaInvoke.ts';

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function createInvite(
  tenantId: string,
  invitedBy: string,
  email: string,
  role: 'member' | 'owner',
): Promise<InviteRecord> {
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new NotFoundError('Tenant não encontrado.');

  const [members, invites] = await Promise.all([listMembers(tenantId), listInvites(tenantId)]);
  const limit = planLimits(tenant.plan).maxMembers;
  if (members.length + invites.length >= limit) {
    throw new HttpError(
      402,
      `Limite de ${limit} membros do plano ${tenant.plan} atingido (incluindo convites pendentes).`,
    );
  }

  const invite: InviteRecord = {
    code: randomUUID(),
    tenantId,
    email: email.trim().toLowerCase(),
    role,
    invitedBy,
    createdAt: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + INVITE_TTL_SECONDS,
  };
  await putInvite(invite);
  return invite;
}

// Aceita um convite: reescreve o vínculo do usuário para o tenant convidante.
// O tenant criado automaticamente no signup do convidado fica órfão (sem dados
// além do META — limpeza é tarefa administrativa futura).
//
// IMPORTANTE: esta é a ÚNICA operação legitimamente CROSS-TENANT do sistema —
// a request roda com o claim do tenant do CONVIDADO. O modelo IAM (LeadingKeys)
// já prevê o aceite: a role escopada permite `INVITECODE#*` (consumir) e
// `USER#*` (reescrever o próprio vínculo). O que ela NUNCA alcança são as
// chaves do tenant CONVIDANTE (MEMBER# e o espelho INVITE#) — e a Lambda da
// API não tem acesso direto à tabela (só a role assumida). Essas escritas são
// delegadas ao WORKER Lambda (grant total na tabela), invocado async; em dev
// local (sem worker/hardening) rodam inline.
export interface InviteMemberSyncPayload {
  type: 'invite-member-sync';
  tenantId: string; // tenant convidante
  sub: string;
  email: string;
  role: 'member' | 'owner';
  previousTenantId: string | null; // tenant órfão do signup (limpar espelho)
  inviteCode: string; // espelho INVITE# a remover
}

export async function acceptInvite(
  code: string,
  user: { sub: string; email?: string },
): Promise<{ tenantId: string }> {
  const invite = await consumeInvite(code); // INVITECODE#* — permitido no escopo
  if (!invite) throw new HttpError(403, 'Convite inválido, expirado ou já utilizado.');

  const current = await getUser(user.sub); // USER#* — permitido no escopo
  if (current?.tenantId === invite.tenantId) return { tenantId: invite.tenantId }; // idempotente

  const now = new Date().toISOString();
  await putUser({
    sub: user.sub,
    tenantId: invite.tenantId,
    email: user.email ?? invite.email,
    role: invite.role,
    createdAt: current?.createdAt ?? now,
  });

  // Escritas cross-tenant (MEMBER# novo, MEMBER# antigo, espelho INVITE#).
  const payload: InviteMemberSyncPayload = {
    type: 'invite-member-sync',
    tenantId: invite.tenantId,
    sub: user.sub,
    email: user.email ?? invite.email,
    role: invite.role,
    previousTenantId: current && current.tenantId !== invite.tenantId ? current.tenantId : null,
    inviteCode: code,
  };
  const workerFn = process.env.REFINE_WORKER_FUNCTION_NAME;
  if (workerFn) {
    await invokeAsync(workerFn, payload);
  } else {
    await runInviteMemberSync(payload);
  }

  logger.info(`Usuário ${user.sub} entrou no tenant ${invite.tenantId} como ${invite.role}.`);
  return { tenantId: invite.tenantId };
}

// Corpo do worker: roda com o client DEFAULT (fora do requestContext, com o
// grant total do worker). Idempotente; nunca lança (falha vira log — o vínculo
// USER# já foi reescrito e o membro reaparece num próximo aceite/reparo).
export async function runInviteMemberSync(payload: InviteMemberSyncPayload): Promise<void> {
  const { tenantId, sub, email, role, previousTenantId, inviteCode } = payload;
  try {
    await putMember({ sub, tenantId, email, role, createdAt: new Date().toISOString() });
    if (previousTenantId) {
      await deleteMember(previousTenantId, sub).catch(() => {});
    }
    await deleteInviteMirror(tenantId, inviteCode).catch(() => {});
  } catch (err) {
    logger.error(
      `Sincronização de membro do convite falhou (sub ${sub}, tenant ${tenantId}): ${(err as Error).message}`,
    );
  }
}

export async function teamOverview(
  tenantId: string,
): Promise<{ members: MemberRecord[]; invites: InviteRecord[] }> {
  const [members, invites] = await Promise.all([listMembers(tenantId), listInvites(tenantId)]);
  return { members, invites };
}
