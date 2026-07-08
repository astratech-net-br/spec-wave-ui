// QA do Developer (RFC-003 §4): stories do milestone corrente esperando QA.
// Fix issues = voltar ao trabalho na story; Open Story abre a issue.

import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { inMilestone, isOpen, isStory } from '../../../lib/workspaceSelectors';

export function DevQaPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const inQa = inMilestone(
    snapshot.items.filter((i) => isStory(i) && isOpen(i) && i.stage === 'QA'),
    milestoneNumber,
  );

  return (
    <div className="ws-page">
      <QueueList
        repoId={repoId}
        items={inQa}
        empty="Nenhuma story esperando QA neste milestone."
        showPrs
        actions={(item) => [
          { label: 'Fix issues', accent: true, href: hrefForItem(repoId, 'story', item.number) },
          { label: 'Open Story', href: item.url },
        ]}
      />
    </div>
  );
}
