// Controller do snapshot agregado (RFC-003) — GET /api/repositories/:id/snapshot.

import type { NextFunction, Request, Response } from 'express';
import { isValidRepoId } from '../lib/validation.ts';
import { HttpError } from '../lib/errors.ts';
import { tenantOf } from '../middleware/auth.ts';
import { loadSnapshotForRepository } from '../services/snapshotService.ts';
import { maybeReconcileAutomation } from '../services/automationService.ts';

export async function getRepositorySnapshot(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = req.params.id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }

  try {
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const tenantId = tenantOf(req).tenantId;
    const snapshot = await loadSnapshotForRepository(tenantId, repoId, { fresh });
    res.json(snapshot);
    // Automação de etapas por eventos de PR (workspace Dev): reconciliação
    // best-effort no ciclo de polling — depois da resposta, com throttle.
    maybeReconcileAutomation(tenantId, repoId, snapshot);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
