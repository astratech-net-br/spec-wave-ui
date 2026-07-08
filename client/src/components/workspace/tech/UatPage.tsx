// UAT do Tech Leader (RFC-003 §3): stories esperando validação de negócio,
// por milestone. Approve → etapa Done; Return to Development → etapa
// Development. Aprovação é sempre humana (princípio do RFC).

import { useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { groupByMilestone, isOpen, isStory } from '../../../lib/workspaceSelectors';
import { setStage } from '../../../data/workspace';

export function UatPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);
  const inUat = snapshot.items.filter((i) => isStory(i) && isOpen(i) && i.stage === 'UAT');

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      {inUat.length === 0 && <p className="queue__empty">Nenhuma story esperando UAT.</p>}
      {groupByMilestone(inUat).map((group) => (
        <section key={group.key} className="ws-section">
          <h3 className="ws-section__title">
            {group.title} <span className="ws-section__count">{group.items.length}</span>
          </h3>
          <QueueList
            repoId={repoId}
            items={group.items}
            empty=""
            actions={(item) => [
              { label: 'Open Story', href: hrefForItem(repoId, 'story', item.number) },
              {
                label: 'Approve',
                accent: true,
                disabled: busy,
                onClick: () => run(() => setStage(repoId, 'story', item.number, 'Done')),
              },
              {
                label: 'Return to Development',
                disabled: busy,
                onClick: () => run(() => setStage(repoId, 'story', item.number, 'Development')),
              },
            ]}
          />
        </section>
      ))}
    </div>
  );
}
