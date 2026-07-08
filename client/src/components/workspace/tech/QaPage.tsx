// QA do Tech Leader (RFC-003 §3): stories esperando validação funcional,
// por milestone. "Open Test Results" abre a aba de checks do PR (não há
// integração de CI no MVP — risco #5 do plano).

import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { groupByMilestone, isOpen, isStory } from '../../../lib/workspaceSelectors';

export function TechQaPage({ repoId, snapshot }: WorkspacePageProps) {
  const inQa = snapshot.items.filter((i) => isStory(i) && isOpen(i) && i.stage === 'QA');

  return (
    <div className="ws-page">
      {inQa.length === 0 && <p className="queue__empty">Nenhuma story esperando QA.</p>}
      {groupByMilestone(inQa).map((group) => (
        <section key={group.key} className="ws-section">
          <h3 className="ws-section__title">
            {group.title} <span className="ws-section__count">{group.items.length}</span>
          </h3>
          <QueueList
            repoId={repoId}
            items={group.items}
            empty=""
            showPrs
            actions={(item) => {
              const pr = item.prs[0];
              return [
                { label: 'Open Story', href: hrefForItem(repoId, 'story', item.number) },
                ...(pr ? [{ label: 'Open Test Results', href: `${pr.url}/checks` }] : []),
              ];
            }}
          />
        </section>
      ))}
    </div>
  );
}
