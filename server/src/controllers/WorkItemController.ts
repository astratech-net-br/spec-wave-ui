// Controller de work item — valida a rota (repo + nível + número), chama o
// serviço e devolve o WorkItemView pronto para exibição. Mapeia erros de domínio
// para HTTP: 400 (entrada inválida), 404 (não encontrado), 502 (GitHub),
// 503 (não configurado).

import type { NextFunction, Request, Response } from 'express';
import type {
  CreateFeatureRequest,
  Level,
  Priority,
  StageName,
  WorkItemPatch,
} from '@spec-flow/shared';
import { STAGE_NAMES } from '@spec-flow/shared';
import {
  createFeatureForRepository,
  deleteWorkItemForRepository,
  loadWorkItemForRepository,
  setPriorityForRepository,
  setStageForRepository,
  updateWorkItemForRepository,
} from '../services/workItemService.ts';
import { HttpError } from '../lib/errors.ts';
import { isValidRepoId } from '../lib/validation.ts';
import { tenantOf } from '../middleware/auth.ts';

const LEVELS: Level[] = ['epic', 'feature', 'story'];

// Valores aceitos para os campos opcionais da Feature (espelham o RFC-001 e o
// adapter, que lê Prioridade/Área dos labels da issue).
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const AREAS = ['Frontend', 'Backend', 'Mobile', 'Infra', 'DevOps', 'Data'];

export async function getRepositoryWorkItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id, level, number } = req.params;

  const repoId = id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return;
  }
  if (!LEVELS.includes(level as Level)) {
    res.status(400).json({ error: `Nível inválido: "${level}". Use epic, feature ou story.` });
    return;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: `Número inválido: "${number}".` });
    return;
  }

  try {
    res.json(await loadWorkItemForRepository(tenantOf(req).tenantId, repoId, level as Level, n));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err); // erro inesperado → handler central (500)
  }
}

// PATCH /api/repositories/:id/workitems/:level/:number — edita título/corpo da
// issue. Aceita { title?, descriptionMdx? } (ao menos um). Devolve o WorkItemView
// atualizado. Requer GITHUB_TOKEN com escopo de escrita em issues.
export async function updateRepositoryWorkItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id, level, number } = req.params;

  const repoId = id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return;
  }
  if (!LEVELS.includes(level as Level)) {
    res.status(400).json({ error: `Nível inválido: "${level}". Use epic, feature ou story.` });
    return;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: `Número inválido: "${number}".` });
    return;
  }

  // Validação do corpo (já parseado por express.json()).
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: WorkItemPatch = {};
  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      res.status(400).json({ error: 'O título não pode ser vazio.' });
      return;
    }
    patch.title = body.title.trim();
  }
  if ('descriptionMdx' in body) {
    if (typeof body.descriptionMdx !== 'string') {
      res.status(400).json({ error: 'A descrição deve ser um texto.' });
      return;
    }
    patch.descriptionMdx = body.descriptionMdx;
  }
  if (patch.title === undefined && patch.descriptionMdx === undefined) {
    res.status(400).json({ error: 'Nada para atualizar: informe title e/ou descriptionMdx.' });
    return;
  }

  try {
    res.json(await updateWorkItemForRepository(tenantOf(req).tenantId, repoId, level as Level, n, patch));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err); // erro inesperado → handler central (500)
  }
}

// Valida os params comuns (:id, :level, :number) das rotas de workspace.
// Devolve null (resposta 400 já enviada) quando algo é inválido.
function workItemParamsOr400(
  req: Request,
  res: Response,
): { repoId: string; level: Level; n: number } | null {
  const { id, level, number } = req.params;
  if (!isValidRepoId(id)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return null;
  }
  if (!LEVELS.includes(level as Level)) {
    res.status(400).json({ error: `Nível inválido: "${level}". Use epic, feature ou story.` });
    return null;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: `Número inválido: "${number}".` });
    return null;
  }
  return { repoId: id, level: level as Level, n };
}

// PATCH /api/repositories/:id/workitems/:level/:number/priority — troca os
// labels P0–P3 da issue. Corpo: { priority: 'P0'…'P3' | null } (null remove).
export async function setWorkItemPriority(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const params = workItemParamsOr400(req, res);
  if (!params) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!('priority' in body)) {
    res.status(400).json({ error: 'Informe priority (P0–P3 ou null para remover).' });
    return;
  }
  if (body.priority !== null && !PRIORITIES.includes(body.priority as string)) {
    res.status(400).json({ error: `Prioridade inválida. Use uma de: ${PRIORITIES.join(', ')} ou null.` });
    return;
  }

  try {
    await setPriorityForRepository(
      tenantOf(req).tenantId,
      params.repoId,
      params.n,
      (body.priority as Priority | null) ?? null,
    );
    res.status(204).end();
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// DELETE /api/repositories/:id/workitems/:level/:number — "Delete" do Backlog:
// fecha a issue no GitHub (issues não são deletáveis pela API).
export async function deleteRepositoryWorkItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const params = workItemParamsOr400(req, res);
  if (!params) return;

  try {
    await deleteWorkItemForRepository(tenantOf(req).tenantId, params.repoId, params.n);
    res.status(204).end();
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// PATCH /api/repositories/:id/workitems/:level/:number/stage — move a etapa
// canônica do item no board. Corpo: { stage: StageName }.
export async function setWorkItemStage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const params = workItemParamsOr400(req, res);
  if (!params) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!STAGE_NAMES.includes(body.stage as StageName)) {
    res.status(400).json({ error: `Etapa inválida. Use uma de: ${STAGE_NAMES.join(', ')}.` });
    return;
  }

  try {
    await setStageForRepository(
      tenantOf(req).tenantId,
      params.repoId,
      params.n,
      body.stage as StageName,
    );
    res.status(204).end();
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// POST /api/repositories/:id/workitems/epic/:number/features — cria uma Feature
// sob o épico :number. Corpo: { title (obrigatório), descriptionMdx?, priority?,
// area? }. Devolve 201 + o WorkItemView do épico recarregado (com a nova feature).
export async function createRepositoryFeature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id, number } = req.params;

  const repoId = id;
  if (!isValidRepoId(repoId)) {
    res.status(400).json({ error: `Repositório inválido: "${id}".` });
    return;
  }
  const epicNumber = Number(number);
  if (!Number.isInteger(epicNumber) || epicNumber <= 0) {
    res.status(400).json({ error: `Número do épico inválido: "${number}".` });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    res.status(400).json({ error: 'Informe o título da feature.' });
    return;
  }
  if (body.descriptionMdx !== undefined && typeof body.descriptionMdx !== 'string') {
    res.status(400).json({ error: 'A descrição deve ser um texto.' });
    return;
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority as string)) {
    res.status(400).json({ error: `Prioridade inválida. Use uma de: ${PRIORITIES.join(', ')}.` });
    return;
  }
  if (body.area !== undefined && !AREAS.includes(body.area as string)) {
    res.status(400).json({ error: `Área inválida. Use uma de: ${AREAS.join(', ')}.` });
    return;
  }

  const input: CreateFeatureRequest = { title: body.title.trim() };
  if (typeof body.descriptionMdx === 'string') input.descriptionMdx = body.descriptionMdx;
  if (typeof body.priority === 'string') input.priority = body.priority;
  if (typeof body.area === 'string') input.area = body.area;

  try {
    res.status(201).json(await createFeatureForRepository(tenantOf(req).tenantId, repoId, epicNumber, input));
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err); // erro inesperado → handler central (500)
  }
}
