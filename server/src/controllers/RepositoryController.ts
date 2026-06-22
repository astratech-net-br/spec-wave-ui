// Controller de repositórios. Lê do SQLite via Knex (queries parametrizadas) e
// devolve o DTO no schema acordado com o frontend:
//   { id, name, url, createdAt }  — createdAt em ISO 8601.

import type { Request, Response } from 'express';
import type { Repository } from '@spec-flow/shared';
import { db } from '../db/index.ts';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { isValidHttpUrl } from '../lib/validation.ts';

interface RepositoryRow {
  id: number;
  name: string;
  url: string;
  created_at: string;
}

// SQLite guarda CURRENT_TIMESTAMP como "YYYY-MM-DD HH:MM:SS" em UTC, sem
// sufixo de fuso. Normalizamos para ISO 8601 para o frontend formatar.
function toIso(raw: string): string {
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}

function toDTO(row: RepositoryRow): Repository {
  // URL inválida no banco (dados corrompidos): logamos mas não bloqueamos a
  // listagem (spec — caso de erro "Violação/URL inválida": não bloquear).
  if (!isValidHttpUrl(row.url)) {
    logger.warn(`Repositório #${row.id} com URL inválida: ${row.url}`);
  }
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    createdAt: toIso(row.created_at),
  };
}

export async function getAllRepositories(_req: Request, res: Response): Promise<void> {
  const rows = await db<RepositoryRow>('repositories')
    .select('id', 'name', 'url', 'created_at')
    .orderBy('created_at', 'desc') // mais recentes primeiro
    .limit(config.pageLimit); // até 50 (paginação futura)

  res.json(rows.map(toDTO));
}
