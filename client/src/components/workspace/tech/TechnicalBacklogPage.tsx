// Technical Backlog do Tech Leader (RFC-003 §3): stories agrupadas por
// milestone (+ "Sem milestone"). Ações: atribuir/mover milestone e revisar a
// decomposição (abrir a Feature pai).

import { useMemo, useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { groupByMilestone, isOpen, isStory } from '../../../lib/workspaceSelectors';
import { setStoryMilestone } from '../../../data/workspace';

export function TechnicalBacklogPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);

  const stories = useMemo(
    () => snapshot.items.filter((i) => isStory(i) && isOpen(i)),
    [snapshot.items],
  );
  const openMilestones = snapshot.milestones.filter((m) => m.state === 'open');

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      {groupByMilestone(stories).map((group) => (
        <section key={group.key} className="ws-section">
          <h3 className="ws-section__title">
            {group.title} <span className="ws-section__count">{group.items.length}</span>
          </h3>
          <QueueList
            repoId={repoId}
            items={group.items}
            empty="Nenhuma story."
            meta={(item) => (
              <select
                className="queue__priosel"
                value={group.milestoneNumber ?? ''}
                disabled={busy}
                onChange={(e) =>
                  run(() =>
                    setStoryMilestone(
                      repoId,
                      item.number,
                      e.target.value ? Number(e.target.value) : null,
                    ),
                  )
                }
                aria-label={`Milestone de #${item.number}`}
              >
                <option value="">Sem milestone</option>
                {openMilestones.map((m) => (
                  <option key={m.number} value={m.number}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
            actions={(item) =>
              item.parentNumber
                ? [
                    {
                      label: 'Review decomposition',
                      href: hrefForItem(repoId, 'feature', item.parentNumber),
                    },
                  ]
                : []
            }
          />
        </section>
      ))}
    </div>
  );
}
