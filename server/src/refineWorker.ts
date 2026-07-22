// Worker Lambda dos jobs de LLM assíncronos. Invocado com InvocationType=Event
// pela ApiFn (foge do teto de 29s do API Gateway). Despacha pelo payload:
// refino de spec/plan (default) ou insight/summary (type: 'insight'). Os
// corpos capturam erros internamente e nunca lançam (retryAttempts=0 na infra).

import type { RefineJobPayload } from './services/artifactService.ts';
import { runRefineJob } from './services/artifactService.ts';
import type { InsightJobPayload } from './services/insightsService.ts';
import { runInsightJob } from './services/insightsService.ts';
import type { InviteMemberSyncPayload } from './services/teamService.ts';
import { runInviteMemberSync } from './services/teamService.ts';
import { logger } from './lib/logger.ts';

type WorkerEvent = RefineJobPayload | InsightJobPayload | InviteMemberSyncPayload;

export const handler = async (event: WorkerEvent): Promise<void> => {
  const type = (event as { type?: string }).type;
  if (type === 'insight') {
    const job = event as InsightJobPayload;
    logger.info(`Insight worker: job ${job.jobId} (${job.scope}, repo ${job.repoId})`);
    await runInsightJob(job);
    return;
  }
  if (type === 'invite-member-sync') {
    const job = event as InviteMemberSyncPayload;
    logger.info(`Invite worker: membro ${job.sub} → tenant ${job.tenantId}`);
    await runInviteMemberSync(job);
    return;
  }
  const job = event as RefineJobPayload;
  logger.info(`Refine worker: job ${job.jobId} (feature #${job.number}, ${job.kind})`);
  await runRefineJob(job);
};
