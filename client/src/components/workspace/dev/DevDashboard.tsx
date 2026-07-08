// Dashboard do Developer (RFC-003 §4): foco exclusivo no milestone corrente
// (selecionado no topo do workspace).

import type { WorkspacePageProps } from '../types';
import { WidgetCard } from '../WidgetCard';
import { AiSummary } from '../AiSummary';
import {
  inMilestone,
  isOpen,
  isStory,
  started,
  waitingReview,
} from '../../../lib/workspaceSelectors';

export function DevDashboard({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const milestone = snapshot.milestones.find((m) => m.number === milestoneNumber);
  const stories = inMilestone(
    snapshot.items.filter((i) => isStory(i) && isOpen(i)),
    milestoneNumber,
  );

  const assigned = stories.filter((s) => s.assignees.length > 0).length;
  const inProgress = stories.filter(started).length;
  const pendingReviews = stories.filter(waitingReview).length;

  return (
    <div className="ws-page">
      <div className="widgets">
        <WidgetCard
          label="Current Milestone"
          value={milestone ? milestone.title : 'Todos'}
          hint={milestone?.dueOn ? `alvo ${milestone.dueOn.slice(0, 10)}` : undefined}
        />
        <WidgetCard label="Assigned Stories" value={assigned} hint={`de ${stories.length} abertas`} />
        <WidgetCard label="Stories in Progress" value={inProgress} />
        <WidgetCard label="Pending Reviews" value={pendingReviews} />
      </div>

      <AiSummary repoId={repoId} scope="dev-daily" title="AI Daily Summary" />
    </div>
  );
}
