// Worker Lambda do refino assíncrono. Invocado com InvocationType=Event pela
// ApiFn (foge do teto de 29s do API Gateway). Roda a chamada LLM e grava o
// resultado no job (DynamoDB); `runRefineJob` captura erros internamente e nunca
// lança, então este handler não precisa de try/catch (retryAttempts=0 na infra).

import type { RefineJobPayload } from './services/artifactService.ts';
import { runRefineJob } from './services/artifactService.ts';
import { logger } from './lib/logger.ts';

export const handler = async (event: RefineJobPayload): Promise<void> => {
  logger.info(`Refine worker: job ${event.jobId} (feature #${event.number}, ${event.kind})`);
  await runRefineJob(event);
};
