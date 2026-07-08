// Prioritization do PM (RFC-003 §2): itens já priorizados, agrupados P0→P3.
// Ações: trocar prioridade (move entre grupos) e Send to Specification
// (Features: aplica spec-wave:spec + move a etapa — fluxo existente).
// "Business Value" não tem fonte de dados no MVP (risco #4 do plano) — a
// ordenação disponível é prioridade/data de criação.

import { useMemo, useState } from 'react';
import type { Priority } from '@spec-flow/shared';
import { PRIORITIES } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { byPriority, isBacklogLevel, isOpen } from '../../../lib/workspaceSelectors';
import { setPriority } from '../../../data/workspace';
import { createArtifact } from '../../../data/workItem';

const PRIORITY_TITLES: Record<Priority, string> = {
  P0: 'P0 — Crítica',
  P1: 'P1 — Alta',
  P2: 'P2 — Média',
  P3: 'P3 — Baixa',
};

export function PrioritizationPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [sort, setSort] = useState<'priority' | 'created'>('priority');
  const [busy, setBusy] = useState(false);

  const prioritized = useMemo(
    () =>
      snapshot.items
        .filter((item) => isBacklogLevel(item) && isOpen(item) && item.priority !== null)
        .sort(sort === 'priority' ? byPriority : (a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [snapshot.items, sort],
  );

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      <div className="ws-toolbar">
        <label className="ws-toolbar__label">
          Ordenar por{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as 'priority' | 'created')}>
            <option value="priority">Prioridade</option>
            <option value="created">Data de criação</option>
          </select>
        </label>
      </div>

      {PRIORITIES.map((priority) => {
        const group = prioritized.filter((item) => item.priority === priority);
        if (group.length === 0) return null;
        return (
          <section key={priority} className="ws-section">
            <h3 className={`ws-section__title prio prio--${priority.toLowerCase()}`}>
              {PRIORITY_TITLES[priority]} <span className="ws-section__count">{group.length}</span>
            </h3>
            <QueueList
              repoId={repoId}
              items={group}
              empty=""
              meta={(item) => (
                <select
                  className="queue__priosel"
                  value={item.priority ?? ''}
                  disabled={busy}
                  onChange={(e) =>
                    run(() =>
                      setPriority(
                        repoId,
                        item.level,
                        item.number,
                        (e.target.value || null) as Priority | null,
                      ),
                    )
                  }
                  aria-label={`Prioridade de #${item.number}`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="">Remover prioridade</option>
                </select>
              )}
              actions={(item) =>
                item.level === 'feature' && item.stage !== 'Spec'
                  ? [
                      {
                        label: 'Send to Specification',
                        accent: true,
                        disabled: busy,
                        onClick: () => run(() => createArtifact(repoId, item.number, 'spec')),
                      },
                    ]
                  : []
              }
            />
          </section>
        );
      })}

      {prioritized.length === 0 && (
        <p className="queue__empty">Nada priorizado ainda — defina prioridades no Backlog.</p>
      )}
    </div>
  );
}
