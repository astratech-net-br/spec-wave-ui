// Controller do ciclo de spec.md / plan.md de uma Feature. Valida a rota
// (repo + número + artefato) e o corpo, delega ao artifactService e mapeia erros
// de domínio para HTTP (400/404/502/503), igual ao WorkItemController.

import type { NextFunction, Request, Response } from 'express';
import type { ArtifactKind } from '@spec-flow/shared';
import {
  approvePlan,
  createArtifact,
  decomposeFeature,
  getRefineJobForTenant,
  saveArtifact,
  startRefineJob,
} from '../services/artifactService.ts';
import { HttpError } from '../lib/errors.ts';
import { isValidRepoId } from '../lib/validation.ts';
import { tenantOf } from '../middleware/auth.ts';

const KINDS: ArtifactKind[] = ['spec', 'plan'];

// Valida { repoId, number, kind } da rota. Em erro, responde 400 e devolve null.
function parseParams(
  req: Request,
  res: Response,
): { repoId: string; number: number; kind: ArtifactKind } | null {
  const { id, number, artifact } = req.params;

  const repoId = id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return null;
  }
  if (!KINDS.includes(artifact as ArtifactKind)) {
    res.status(400).json({ error: `Artefato inválido: "${artifact}". Use spec ou plan.` });
    return null;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: `Número inválido: "${number}".` });
    return null;
  }
  return { repoId, number: n, kind: artifact as ArtifactKind };
}

// Valida { repoId, number } da rota (sem :artifact). Em erro, responde 400 e null.
function parseRepoAndNumber(
  req: Request,
  res: Response,
): { repoId: string; number: number } | null {
  const { id, number } = req.params;

  const repoId = id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return null;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: `Número inválido: "${number}".` });
    return null;
  }
  return { repoId, number: n };
}

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}

// POST .../workitems/feature/:number/:artifact/create
export async function createFeatureArtifact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseParams(req, res);
  if (!p) return;
  try {
    res.json(await createArtifact(tenantOf(req).tenantId, p.repoId, p.number, p.kind));
  } catch (err) {
    handleError(err, res, next);
  }
}

// POST .../workitems/feature/:number/plan/approve → aplica spec-wave:ready.
export async function approveFeaturePlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseRepoAndNumber(req, res);
  if (!p) return;
  try {
    res.json(await approvePlan(tenantOf(req).tenantId, p.repoId, p.number));
  } catch (err) {
    handleError(err, res, next);
  }
}

// POST .../workitems/feature/:number/decompose → aplica spec-wave:decompose.
export async function decomposeFeatureHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseRepoAndNumber(req, res);
  if (!p) return;
  try {
    res.json(await decomposeFeature(tenantOf(req).tenantId, p.repoId, p.number));
  } catch (err) {
    handleError(err, res, next);
  }
}

// POST .../workitems/feature/:number/:artifact/refine  body: { prompt, base? }
// Enfileira o refino (async) e devolve 202 { jobId }. A LLM roda num worker sem
// o teto de 29s do API Gateway; o client faz polling em getRefineJobStatus.
export async function refineFeatureArtifact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseParams(req, res);
  if (!p) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    res.status(400).json({ error: 'Informe um prompt não vazio.' });
    return;
  }
  if (body.base !== undefined && typeof body.base !== 'string') {
    res.status(400).json({ error: 'base deve ser um texto.' });
    return;
  }

  try {
    const base = typeof body.base === 'string' ? body.base : undefined;
    const result = await startRefineJob(
      tenantOf(req).tenantId,
      p.repoId,
      p.number,
      p.kind,
      body.prompt.trim(),
      base,
    );
    res.status(202).json(result); // { jobId }
  } catch (err) {
    handleError(err, res, next);
  }
}

// GET .../workitems/feature/:number/:artifact/refine/:jobId → status do job de
// refino (polling). 404 se o job não existir ou tiver expirado.
export async function getRefineJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseParams(req, res);
  if (!p) return;
  const jobId = req.params.jobId;
  if (typeof jobId !== 'string' || jobId.length === 0) {
    res.status(400).json({ error: 'jobId ausente.' });
    return;
  }

  try {
    const job = await getRefineJobForTenant(tenantOf(req).tenantId, jobId);
    if (!job) {
      res.status(404).json({ error: 'Job de refino não encontrado ou expirado.' });
      return;
    }
    res.json({ status: job.status, content: job.content, error: job.error });
  } catch (err) {
    handleError(err, res, next);
  }
}

// POST .../workitems/feature/:number/:artifact/save  body: { content }
export async function saveFeatureArtifact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const p = parseParams(req, res);
  if (!p) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    res.status(400).json({ error: 'O conteúdo não pode ser vazio.' });
    return;
  }

  try {
    res.json(await saveArtifact(tenantOf(req).tenantId, p.repoId, p.number, p.kind, body.content));
  } catch (err) {
    handleError(err, res, next);
  }
}
