// Fonte de dados dos workspaces (RFC-003) — GET /api/repositories/:id/snapshot.
// Uma leitura agregada alimenta todas as páginas; `fresh` fura o cache de 60s
// do servidor (usado após mutações e no botão de refresh).

import type { ProjectSnapshot } from '@spec-flow/shared';
import { apiFetch } from './apiFetch';

// O snapshot pagina as issues do repositório no GitHub — mais lento que um GET
// comum (o cache do servidor cobre as leituras seguintes).
const REQUEST_TIMEOUT_MS = 30_000;

function isProjectSnapshot(value: unknown): value is ProjectSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.generatedAt === 'string' &&
    Array.isArray(v.items) &&
    Array.isArray(v.milestones) &&
    typeof v.repository === 'object' &&
    v.repository !== null
  );
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* corpo não-JSON: usa o status abaixo */
  }
  return `Falha ao carregar o snapshot (HTTP ${res.status}).`;
}

export async function fetchSnapshot(
  repoId: string,
  opts: { fresh?: boolean } = {},
  signal?: AbortSignal,
): Promise<ProjectSnapshot> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => timeout.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const url = `/api/repositories/${repoId}/snapshot${opts.fresh ? '?fresh=1' : ''}`;
    const res = await apiFetch(url, {
      headers: { Accept: 'application/json' },
      signal: timeout.signal,
    });
    if (!res.ok) {
      throw new Error(await errorMessage(res));
    }
    const json: unknown = await res.json();
    if (!isProjectSnapshot(json)) {
      throw new Error('Resposta da API em formato inesperado.');
    }
    return json;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && !signal?.aborted) {
      throw new Error('Tempo de requisição esgotado.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
