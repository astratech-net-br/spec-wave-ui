// Controller do ciclo de spec.md / plan.md de uma Feature. Valida a rota
// (repo + número + artefato) e o corpo, delega ao artifactService e mapeia erros
// de domínio para HTTP (400/404/502/503), igual ao WorkItemController.

import type { NextFunction, Request, Response } from 'express';
import type { ArtifactKind } from '@spec-flow/shared';
import {
  createArtifact,
  refineArtifact,
  saveArtifact,
} from '../services/artifactService.ts';
import { HttpError } from '../lib/errors.ts';

const KINDS: ArtifactKind[] = ['spec', 'plan'];

// Valida { repoId, number, kind } da rota. Em erro, responde 400 e devolve null.
function parseParams(
  req: Request,
  res: Response,
): { repoId: number; number: number; kind: ArtifactKind } | null {
  const { id, number, artifact } = req.params;

  const repoId = Number(id);
  if (!Number.isInteger(repoId) || repoId <= 0) {
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
    res.json(await createArtifact(p.repoId, p.number, p.kind));
  } catch (err) {
    handleError(err, res, next);
  }
}

// POST .../workitems/feature/:number/:artifact/refine  body: { prompt }
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
    const content = await refineArtifact(p.repoId, p.number, p.kind, body.prompt.trim(), base);
    res.json({ content });
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
    res.json(await saveArtifact(p.repoId, p.number, p.kind, body.content));
  } catch (err) {
    handleError(err, res, next);
  }
}
