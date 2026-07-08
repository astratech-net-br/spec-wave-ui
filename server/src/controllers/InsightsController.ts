// Controller dos AI insights (RFC-003, fase 5) —
// POST /api/repositories/:id/ai/summary { scope, topic? } → { content }.

import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.ts';
import { isValidRepoId } from '../lib/validation.ts';
import { tenantOf } from '../middleware/auth.ts';
import {
  generateInsight,
  INSIGHT_SCOPES,
  type InsightScope,
} from '../services/insightsService.ts';

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
    const content = await generateInsight(
      tenantOf(req).tenantId,
      repoId,
      body.scope as InsightScope,
      typeof body.topic === 'string' ? body.topic : undefined,
    );
    res.json({ content });
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
