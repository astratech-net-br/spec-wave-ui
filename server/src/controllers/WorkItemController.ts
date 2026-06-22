// Controller de work item — valida a rota, chama o serviço e devolve o
// WorkItemView pronto para exibição. Mapeia erros de domínio para HTTP:
// 400 (entrada inválida), 404 (não encontrado), 502 (GitHub), 503 (não configurado).

import type { NextFunction, Request, Response } from 'express';
import type { Level } from '@spec-flow/shared';
import { loadWorkItem } from '../services/workItemService.ts';
import { HttpError } from '../lib/errors.ts';

const LEVELS: Level[] = ['epic', 'feature', 'story'];

export async function getWorkItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { level, number } = req.params;

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
    const view = await loadWorkItem(level as Level, n);
    res.json(view);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err); // erro inesperado → handler central (500)
  }
}
