// Pending do Developer (RFC-003 §4): stories do milestone corrente prontas
// (etapa Ready) e não iniciadas. Start Story move para Development.

import { useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { inMilestone, isOpen, isStory, started } from '../../../lib/workspaceSelectors';
import { setStage } from '../../../data/workspace';

export function PendingPage({ repoId, snapshot, milestoneNumber, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);

  const pending = inMilestone(
    snapshot.items.filter((i) => isStory(i) && isOpen(i) && i.stage === 'Ready' && !started(i)),
    milestoneNumber,
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
      <QueueList
        repoId={repoId}
        items={pending}
        empty="Nenhuma story pronta para começar neste milestone."
        actions={(item) => [
          {
            label: 'Start Story',
            accent: true,
            disabled: busy,
            onClick: () => run(() => setStage(repoId, 'story', item.number, 'Development')),
          },
        ]}
      />
    </div>
  );
}
