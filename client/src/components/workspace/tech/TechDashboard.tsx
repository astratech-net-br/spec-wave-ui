// Dashboard do Tech Leader (RFC-003 §3): planejamento técnico e qualidade.

import type { WorkspacePageProps } from '../types';
import { WidgetCard } from '../WidgetCard';
import { AiSummary } from '../AiSummary';
import { isFeature, isStory, started, waitingReview } from '../../../lib/workspaceSelectors';

export function TechDashboard({ repoId, snapshot }: WorkspacePageProps) {
  const features = snapshot.items.filter(isFeature);
  const stories = snapshot.items.filter(isStory);

  const awaitingSpec = features.filter((f) => f.stage === 'Spec' && f.state === 'open').length;
  const awaitingReviewPlan = features.filter((f) => f.stage === 'Plan' && f.state === 'open').length;
  const inDevelopment = stories.filter(
    (s) => s.state === 'open' && (s.stage === 'Development' || started(s)),
  ).length;
  const blocked = stories.filter((s) =>
    s.prs.some((pr) => pr.state === 'open' && pr.reviewDecision === 'CHANGES_REQUESTED'),
  ).length;
  const prsAwaiting = snapshot.items.filter((i) => i.state === 'open' && waitingReview(i)).length;

  return (
    <div className="ws-page">
      <div className="widgets">
        <WidgetCard label="Awaiting specification" value={awaitingSpec} hint="features em Spec" />
        <WidgetCard label="Awaiting technical review" value={awaitingReviewPlan} hint="features em Plan" />
        <WidgetCard label="Stories in development" value={inDevelopment} />
        <WidgetCard label="Blocked stories" value={blocked} hint="PR com mudanças pedidas" />
        <WidgetCard label="PRs awaiting review" value={prsAwaiting} />
      </div>

      <AiSummary repoId={repoId} scope="tech-insights" title="AI Technical Insights" />
    </div>
  );
}
