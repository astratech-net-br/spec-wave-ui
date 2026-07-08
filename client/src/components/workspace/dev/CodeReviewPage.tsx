// Code Review do Developer (RFC-003 §4): variante por milestone da fila de
// code review — PR, reviewer e tempo de espera.

import type { WorkspacePageProps } from '../types';
import { CodeReviewQueue } from '../tech/CodeReviewPage';
import { inMilestone, isOpen, isStory, waitingReview } from '../../../lib/workspaceSelectors';

export function DevCodeReviewPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const waiting = inMilestone(
    snapshot.items.filter((i) => isStory(i) && isOpen(i) && waitingReview(i)),
    milestoneNumber,
  );
  return (
    <div className="ws-page">
      <CodeReviewQueue repoId={repoId} items={waiting} />
    </div>
  );
}
