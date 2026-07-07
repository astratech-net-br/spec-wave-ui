// Fonte de dados do Dashboard — consome GET /api/repositories do backend
// (Express + SQLite). Em dev, o Vite faz proxy de /api para a porta 3001
// (veja vite.config.ts). Timeout de 10s (spec — caso de erro "Timeout").

import type {
  CreateRepositoryRequest,
  Repository,
  UpdateRepositoryRequest,
} from '@spec-flow/shared';
import { apiFetch } from './apiFetch';

const REQUEST_TIMEOUT_MS = 10_000;

function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.url === 'string' &&
    typeof r.createdAt === 'string'
  );
}

export async function fetchRepositories(signal?: AbortSignal): Promise<Repository[]> {
  // Aborta por timeout OU pelo signal externo (troca de rota / unmount).
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => timeout.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await apiFetch('/api/repositories', {
      headers: { Accept: 'application/json' },
      signal: timeout.signal,
    });
    if (!res.ok) {
      throw new Error(`Falha ao carregar dados (HTTP ${res.status}).`);
    }
    const json: unknown = await res.json();
    if (!Array.isArray(json) || !json.every(isRepository)) {
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

// Tenta extrair a mensagem de erro do corpo JSON ({ error }) da resposta.
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* corpo não-JSON: usa o status abaixo */
  }
  return `Falha ao cadastrar o repositório (HTTP ${res.status}).`;
}

// Helper de requisição que devolve um Repository (POST/PATCH), com o mesmo
// scaffolding de timeout/abort dos demais.
async function repositoryRequest(
  url: string,
  method: 'POST' | 'PATCH',
  payload: unknown,
  signal?: AbortSignal,
): Promise<Repository> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => timeout.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });
    if (!res.ok) {
      throw new Error(await errorMessage(res));
    }
    const json: unknown = await res.json();
    if (!isRepository(json)) {
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

// Cadastra um repositório (e, opcionalmente, vincula um Projects v2). Devolve o
// Repository criado. Introspecção do projeto pode demorar um pouco mais que um GET.
export async function createRepository(
  input: CreateRepositoryRequest,
  signal?: AbortSignal,
): Promise<Repository> {
  return repositoryRequest('/api/repositories', 'POST', input, signal);
}

// Edita um repositório (url e/ou vínculo com o Projects v2). Devolve o atualizado.
export async function updateRepository(
  id: string,
  input: UpdateRepositoryRequest,
  signal?: AbortSignal,
): Promise<Repository> {
  return repositoryRequest(`/api/repositories/${id}`, 'PATCH', input, signal);
}

// Busca um repositório pelo id (pré-preenche a edição).
export async function fetchRepository(id: string, signal?: AbortSignal): Promise<Repository> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => timeout.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await apiFetch(`/api/repositories/${id}`, {
      headers: { Accept: 'application/json' },
      signal: timeout.signal,
    });
    if (!res.ok) {
      throw new Error(await errorMessage(res));
    }
    const json: unknown = await res.json();
    if (!isRepository(json)) {
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
