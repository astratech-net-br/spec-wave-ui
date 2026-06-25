// Controllers de repositórios:
//   - getAllRepositories  → lista do SQLite (Dashboard)
//   - getRepositoryEpics  → épicos do repo no GitHub (issues [EPIC])

import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { isValidHttpUrl } from '../lib/validation.ts';
import { HttpError } from '../lib/errors.ts';
import { loadEpicSummaries } from '../services/workItemService.ts';
import {
  createRepository,
  getRepository,
  updateRepository,
  toRepositoryDTO,
  type RepositoryRow,
} from '../services/repositoryService.ts';

export async function getAllRepositories(_req: Request, res: Response): Promise<void> {
  const rows = await db<RepositoryRow>('repositories')
    .select('id', 'name', 'url', 'created_at')
    .orderBy('created_at', 'desc') // mais recentes primeiro
    .limit(config.pageLimit); // até 50 (paginação futura)

  for (const row of rows) {
    // URL inválida (dados corrompidos): loga mas não bloqueia a listagem.
    if (!isValidHttpUrl(row.url)) logger.warn(`Repositório #${row.id} com URL inválida: ${row.url}`);
  }

  res.json(rows.map(toRepositoryDTO));
}

// POST /api/repositories — cadastra um repositório (e, opcionalmente, introspecta
// o Projects v2 informado para habilitar a movimentação de etapa pela UI).
export async function postRepository(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.url !== 'string' || body.url.trim().length === 0) {
    res.status(400).json({ error: 'Informe a URL do repositório.' });
    return;
  }
  if (body.projectUrl !== undefined && typeof body.projectUrl !== 'string') {
    res.status(400).json({ error: 'projectUrl deve ser um texto.' });
    return;
  }

  try {
    const repo = await createRepository({
      url: body.url,
      projectUrl: typeof body.projectUrl === 'string' ? body.projectUrl : undefined,
    });
    res.status(201).json(repo);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// GET /api/repositories/:id — um repositório (para pré-preencher a edição).
export async function getRepositoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = Number(req.params.id);
  if (!Number.isInteger(repoId) || repoId <= 0) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }
  try {
    res.json(await getRepository(repoId));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// PATCH /api/repositories/:id — edita url e/ou vínculo com o Projects v2.
export async function patchRepository(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = Number(req.params.id);
  if (!Number.isInteger(repoId) || repoId <= 0) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const input: { url?: string; projectUrl?: string } = {};
  if ('url' in body) {
    if (typeof body.url !== 'string' || body.url.trim().length === 0) {
      res.status(400).json({ error: 'A URL do repositório não pode ser vazia.' });
      return;
    }
    input.url = body.url;
  }
  if ('projectUrl' in body) {
    if (typeof body.projectUrl !== 'string') {
      res.status(400).json({ error: 'projectUrl deve ser um texto (vazio para desvincular).' });
      return;
    }
    input.projectUrl = body.projectUrl;
  }
  if (input.url === undefined && input.projectUrl === undefined) {
    res.status(400).json({ error: 'Nada para atualizar: informe url e/ou projectUrl.' });
    return;
  }

  try {
    res.json(await updateRepository(repoId, input));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function getRepositoryEpics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const repoId = Number(req.params.id);
  if (!Number.isInteger(repoId) || repoId <= 0) {
    res.status(400).json({ error: `Repositório inválido: "${req.params.id}".` });
    return;
  }

  try {
    res.json(await loadEpicSummaries(repoId));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
