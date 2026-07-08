// Seletores PUROS sobre o ProjectSnapshot (RFC-003). Todas as páginas de
// workspace são filtros/agrupamentos client-side sobre o mesmo snapshot —
// concentrar a lógica aqui mantém as páginas finas e as regras testáveis.

import type { SnapshotItem, StageName } from '@spec-flow/shared';

export const isOpen = (item: SnapshotItem): boolean => item.state === 'open';
export const isStory = (item: SnapshotItem): boolean => item.level === 'story';
export const isFeature = (item: SnapshotItem): boolean => item.level === 'feature';
export const isEpic = (item: SnapshotItem): boolean => item.level === 'epic';

// Item "de backlog" para o PM: Initiative (epic), Feature ou Story.
export const isBacklogLevel = (item: SnapshotItem): boolean =>
  item.level === 'epic' || item.level === 'feature' || item.level === 'story';

// Progresso 0–100 a partir do subIssuesSummary; sem filhos → null (sem barra).
export function progressPct(item: SnapshotItem): number | null {
  if (!item.progress || item.progress.total === 0) return null;
  return Math.round((item.progress.completed / item.progress.total) * 100);
}

// "Começou": ao menos uma sub-issue fechada (RFC: Progress > 0).
export const started = (item: SnapshotItem): boolean =>
  (item.progress?.completed ?? 0) > 0;

// PR aberto (não-draft) ainda sem aprovação → item esperando code review.
export function waitingReview(item: SnapshotItem): boolean {
  return item.prs.some(
    (pr) => pr.state === 'open' && !pr.isDraft && pr.reviewDecision !== 'APPROVED',
  );
}

// Tempo de espera legível desde `iso` ("3d", "5h", "agora").
export function waitingSince(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'agora';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export interface MilestoneGroup {
  key: string;
  title: string;
  milestoneNumber: number | null; // null = sem milestone
  items: SnapshotItem[];
}

// Agrupa por milestone (ordem de aparição), com o bucket "Sem milestone" por
// último. `includeEmptyFor` (títulos) força grupos vazios (colunas do Planning).
export function groupByMilestone(
  items: SnapshotItem[],
  includeEmptyFor: { number: number; title: string }[] = [],
): MilestoneGroup[] {
  const groups = new Map<string, MilestoneGroup>();
  for (const m of includeEmptyFor) {
    groups.set(`m${m.number}`, { key: `m${m.number}`, title: m.title, milestoneNumber: m.number, items: [] });
  }
  const none: MilestoneGroup = { key: 'none', title: 'Sem milestone', milestoneNumber: null, items: [] };

  for (const item of items) {
    if (!item.milestone) {
      none.items.push(item);
      continue;
    }
    const key = `m${item.milestone.number}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, title: item.milestone.title, milestoneNumber: item.milestone.number, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  const result = [...groups.values()];
  if (none.items.length > 0) result.push(none);
  return result;
}

// Particiona por etapa canônica, na ordem pedida. Itens sem etapa reconhecida
// vão para o bucket `null` (exibido como "Sem etapa" quando não-vazio).
export function groupByStage(
  items: SnapshotItem[],
  stages: StageName[],
): { stage: StageName | null; items: SnapshotItem[] }[] {
  const known = new Set<StageName>(stages);
  const buckets = stages.map((stage) => ({
    stage: stage as StageName | null,
    items: items.filter((i) => i.stage === stage),
  }));
  const rest = items.filter((i) => !i.stage || !known.has(i.stage));
  if (rest.length > 0) buckets.push({ stage: null, items: rest });
  return buckets;
}

// Filtro por milestone corrente (workspace do Developer). null = todos.
export function inMilestone(items: SnapshotItem[], milestoneNumber: number | null): SnapshotItem[] {
  if (milestoneNumber === null) return items;
  return items.filter((i) => i.milestone?.number === milestoneNumber);
}

// Ordena por prioridade (P0 primeiro; sem prioridade por último) e criação.
export function byPriority(a: SnapshotItem, b: SnapshotItem): number {
  const pa = a.priority ?? 'P9';
  const pb = b.priority ?? 'P9';
  if (pa !== pb) return pa < pb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}
