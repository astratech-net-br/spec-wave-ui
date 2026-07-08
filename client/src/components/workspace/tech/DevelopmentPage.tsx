// Development do Tech Leader (RFC-003 §3): stories com progresso > 0,
// agrupadas por milestone — progresso, responsável e PRs vinculados.

import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { groupByMilestone, isOpen, isStory, started } from '../../../lib/workspaceSelectors';

export function DevelopmentPage({ repoId, snapshot }: WorkspacePageProps) {
  const active = snapshot.items.filter((i) => isStory(i) && isOpen(i) && started(i));

  return (
    <div className="ws-page">
      {active.length === 0 && <p className="queue__empty">Nenhuma story em desenvolvimento.</p>}
      {groupByMilestone(active).map((group) => (
        <section key={group.key} className="ws-section">
          <h3 className="ws-section__title">
            {group.title} <span className="ws-section__count">{group.items.length}</span>
          </h3>
          <QueueList repoId={repoId} items={group.items} empty="" showProgress showPrs />
        </section>
      ))}
    </div>
  );
}
