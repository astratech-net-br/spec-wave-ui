// Router de hash mínimo (sem dependência). Rotas: #/epic/:n, #/feature/:n, #/story/:n.
// Permite drill-down (Epic → Feature → Story) e breadcrumb subindo, mantendo o
// estado na URL.

import type { Level } from '../types';

export interface Route {
  level: Level;
  number: number;
}

export const DEFAULT_ROUTE: Route = { level: 'epic', number: 204 };

const LEVELS: Level[] = ['epic', 'feature', 'story'];

// "#/feature/210" → { level: 'feature', number: 210 }. Inválido → DEFAULT_ROUTE.
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [level, raw] = path.split('/');
  const n = parseInt(raw, 10);
  if (LEVELS.includes(level as Level) && Number.isFinite(n)) {
    return { level: level as Level, number: n };
  }
  return DEFAULT_ROUTE;
}

// (level, number) → "#/feature/210".
export function hrefFor(level: Level, n: number): string {
  return `#/${level}/${n}`;
}
