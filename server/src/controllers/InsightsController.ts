// Controller dos AI insights (RFC-003, fase 5) — assíncrono (a geração pode
// passar do teto de 29s do API Gateway):
//   POST /api/repositories/:id/ai/summary { scope, topic? } → 202 { jobId }
//   GET  /api/repositories/:id/ai/summary/:jobId → { status, content?, error? }

import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.ts';
import { isValidRepoId } from '../lib/validation.ts';
import { tenantOf } from '../middleware/auth.ts';
import {
  INSIGHT_SCOPES,
  startInsightJob,
  type InsightScope,
} from '../services/insightsService.ts';
import { getRefineJobForTenant } from '../services/artifactService.ts';

export async function postRepositoryInsight(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = req.params.id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!INSIGHT_SCOPES.includes(body.scope as InsightScope)) {
    res.status(400).json({ error: `Escopo inválido. Use um de: ${INSIGHT_SCOPES.join(', ')}.` });
    return;
  }
  if (body.topic !== undefined && typeof body.topic !== 'string') {
    res.status(400).json({ error: 'topic deve ser um texto.' });
    return;
  }

  try {
    const { jobId } = await startInsightJob(
      tenantOf(req).tenantId,
      repoId,
      body.scope as InsightScope,
      typeof body.topic === 'string' ? body.topic : undefined,
    );
    res.status(202).json({ jobId });
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function getInsightJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = req.params.id;
  const { jobId } = req.params;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    res.status(400).json({ error: `jobId inválido: "${jobId}".` });
    return;
  }

  try {
    const job = await getRefineJobForTenant(tenantOf(req).tenantId, jobId);
    if (!job) {
      res.status(404).json({ error: 'Job não encontrado (ou expirado).' });
      return;
    }
    res.json({ status: job.status, content: job.content, error: job.error });
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
