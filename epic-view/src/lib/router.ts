// Router de hash mínimo (sem dependência). Rotas:
//   #/dashboard            → página inicial (lista de repositórios)
//   #/epic/:n, #/feature/:n, #/story/:n → drill-down de work items
// Permite drill-down (Epic → Feature → Story) e breadcrumb subindo, mantendo o
// estado na URL. A raiz (hash vazio) canoniza para #/dashboard (Task #4).

import type { Level } from '../types';

// Rota é uma união discriminada por `view`: o dashboard não tem número; os
// demais (work items) carregam nível + número da issue.
export type Route =
  | { view: 'dashboard' }
  | { view: 'item'; level: Level; number: number };

export const DASHBOARD_ROUTE: Route = { view: 'dashboard' };
export const DASHBOARD_HREF = '#/dashboard';

// Rota inicial da aplicação: o Dashboard (spec — "/ redireciona para /dashboard").
export const DEFAULT_ROUTE: Route = DASHBOARD_ROUTE;

const LEVELS: Level[] = ['epic', 'feature', 'story'];

// "#/feature/210" → { view:'item', level:'feature', number:210 }.
// "#/dashboard" → { view:'dashboard' }. Inválido/vazio → DEFAULT_ROUTE.
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [segment, raw] = path.split('/');
  if (segment === 'dashboard') return DASHBOARD_ROUTE;
  const n = parseInt(raw, 10);
  if (LEVELS.includes(segment as Level) && Number.isFinite(n)) {
    return { view: 'item', level: segment as Level, number: n };
  }
  return DEFAULT_ROUTE;
}

// (level, number) → "#/feature/210".
export function hrefFor(level: Level, n: number): string {
  return `#/${level}/${n}`;
}

// href canônico de uma rota — usado para canonizar a URL na raiz.
export function hrefForRoute(route: Route): string {
  return route.view === 'dashboard' ? DASHBOARD_HREF : hrefFor(route.level, route.number);
}
