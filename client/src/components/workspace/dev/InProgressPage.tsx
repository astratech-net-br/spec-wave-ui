// In Progress do Developer (RFC-003 §4): stories do milestone corrente com
// progresso > 0 — tasks, PRs vinculados; continuar trabalho / abrir a issue.

import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { inMilestone, isOpen, isStory, started } from '../../../lib/workspaceSelectors';

export function InProgressPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const active = inMilestone(
    snapshot.items.filter((i) => isStory(i) && isOpen(i) && started(i)),
    milestoneNumber,
  );

  return (
    <div className="ws-page">
      <QueueList
        repoId={repoId}
        items={active}
        empty="Nada em andamento neste milestone."
        showProgress
        showPrs
        actions={(item) => [
          {
            label: 'Continue work',
            accent: true,
            href: hrefForItem(repoId, 'story', item.number),
          },
          { label: 'Open GitHub Issue', href: item.url },
        ]}
      />
    </div>
  );
}
