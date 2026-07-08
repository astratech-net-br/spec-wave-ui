// Cotas por tenant (fase 3). Refine: token bucket mensal atômico no DynamoDB
// (USAGE#<mês>); estourou → 429 com orientação de upgrade. Repositórios: teto
// do plano checado no cadastro → 402.

import {
  consumeMonthlyRefine,
  getMonthlyUsage,
  getTenant,
  queryRepositoryRecords,
} from '../db/dynamo.ts';
import { currentMonth, planLimits, type PlanLimits } from '../lib/plans.ts';
import { HttpError } from '../lib/errors.ts';

async function limitsOf(tenantId: string): Promise<{ plan: string; limits: PlanLimits }> {
  const tenant = await getTenant(tenantId);
  const plan = tenant?.plan ?? 'free';
  return { plan, limits: planLimits(plan) };
}

// Consome 1 refine da cota do mês — chame ANTES da chamada à LLM.
export async function consumeRefineOrThrow(tenantId: string): Promise<void> {
  const { plan, limits } = await limitsOf(tenantId);
  const ok = await consumeMonthlyRefine(tenantId, currentMonth(), limits.refinesPerMonth);
  if (!ok) {
    throw new HttpError(
      429,
      `Cota de refinamentos do mês esgotada (${limits.refinesPerMonth} no plano ${plan}). ` +
        'Faça upgrade em Configurações para continuar.',
    );
  }
}

// Valida o teto de repositórios do plano antes do cadastro.
export async function assertRepoQuota(tenantId: string): Promise<void> {
  const { plan, limits } = await limitsOf(tenantId);
  const repos = await queryRepositoryRecords(tenantId, limits.maxRepos + 1);
  if (repos.length >= limits.maxRepos) {
    throw new HttpError(
      402,
      `Limite de ${limits.maxRepos} repositórios do plano ${plan} atingido. ` +
        'Faça upgrade em Configurações para conectar mais.',
    );
  }
}

// Resumo de plano/uso para a tela de Configurações.
export async function usageSummary(tenantId: string): Promise<{
  plan: string;
  refinesUsed: number;
  refinesLimit: number;
  reposUsed: number;
  reposLimit: number;
  membersLimit: number;
}> {
  const { plan, limits } = await limitsOf(tenantId);
  const [refinesUsed, repos] = await Promise.all([
    getMonthlyUsage(tenantId, currentMonth()),
    queryRepositoryRecords(tenantId),
  ]);
  return {
    plan,
    refinesUsed,
    refinesLimit: limits.refinesPerMonth,
    reposUsed: repos.length,
    reposLimit: limits.maxRepos,
    membersLimit: limits.maxMembers,
  };
}
