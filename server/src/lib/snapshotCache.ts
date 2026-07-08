// Cache TTL in-memory do ProjectSnapshot (RFC-003). O snapshot é uma leitura
// agregada cara (issues paginadas + milestones); ~15 páginas de workspace o
// consomem em sequência, então 60s de TTL elimina quase todo o custo repetido.
// Vive por processo (Lambda warm / dev local) — perder o cache é inofensivo.
//
// Escritas no repositório (labels, milestones, etapas…) devem invalidar via
// `invalidateSnapshot(tenantId, repoId)` para a próxima leitura refletir o GitHub.

import type { ProjectSnapshot } from '@spec-flow/shared';

const TTL_MS = 60_000;

interface Entry {
  expires: number;
  value: ProjectSnapshot;
}

const cache = new Map<string, Entry>();

const keyOf = (tenantId: string, repoId: string): string => `${tenantId}:${repoId}`;

export function getCachedSnapshot(tenantId: string, repoId: string): ProjectSnapshot | null {
  const entry = cache.get(keyOf(tenantId, repoId));
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(keyOf(tenantId, repoId));
    return null;
  }
  return entry.value;
}

export function setCachedSnapshot(
  tenantId: string,
  repoId: string,
  value: ProjectSnapshot,
): void {
  cache.set(keyOf(tenantId, repoId), { expires: Date.now() + TTL_MS, value });
}

export function invalidateSnapshot(tenantId: string, repoId: string): void {
  cache.delete(keyOf(tenantId, repoId));
}
