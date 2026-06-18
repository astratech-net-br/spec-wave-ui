import type { ChildItem, Status } from '../types';

export interface StatusStyle {
  color: string; // CSS var
  bg: string; // CSS var
  label: string;
}

// Mapa de status → estilo (RFC seção 5).
export const STATUS_MAP: Record<Status, StatusStyle> = {
  done: { color: 'var(--done)', bg: 'var(--done-bg)', label: 'Concluída' },
  prog: { color: 'var(--accent)', bg: 'var(--accent-soft)', label: 'Em andamento' },
  todo: { color: 'var(--todo)', bg: 'var(--todo-bg)', label: 'A fazer' },
};

// Deriva o status de um item a partir do seu percentual.
export function statusFromPct(pct: number): Status {
  if (pct >= 100) return 'done';
  if (pct > 0) return 'prog';
  return 'todo';
}

// Média simples dos % dos filhos, arredondada. Regra do épico (RFC seção 5).
export function meanPct(items: ChildItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, it) => acc + it.pct, 0);
  return Math.round(sum / items.length);
}

export interface Legend {
  done: number;
  prog: number;
  todo: number;
}

// Contagens por categoria, derivadas do pct dos filhos (RFC seção 5).
export function legendCounts(items: ChildItem[]): Legend {
  return items.reduce<Legend>(
    (acc, it) => {
      if (it.pct >= 100) acc.done += 1;
      else if (it.pct > 0) acc.prog += 1;
      else acc.todo += 1;
      return acc;
    },
    { done: 0, prog: 0, todo: 0 },
  );
}
