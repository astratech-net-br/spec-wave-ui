// Progress do PM (RFC-003 §2): stories agrupadas por milestone × 9 etapas,
// com widgets e AI Summary. "Estimated completion" ficou fora do MVP (sem
// fonte de dados — risco #4 do plano); "blocked" usa o proxy de PR com
// CHANGES_REQUESTED.

import { STAGE_NAMES } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { StageBoard } from '../StageBoard';
import { WidgetCard } from '../WidgetCard';
import { AiSummary } from '../AiSummary';
import { isStory } from '../../../lib/workspaceSelectors';

export function PmProgressPage({ repoId, snapshot }: WorkspacePageProps) {
  const stories = snapshot.items.filter(isStory);
  const done = stories.filter((s) => s.stage === 'Done' || s.state === 'closed').length;
  const blocked = stories.filter((s) =>
    s.prs.some((pr) => pr.state === 'open' && pr.reviewDecision === 'CHANGES_REQUESTED'),
  ).length;
  const pct = stories.length > 0 ? Math.round((done / stories.length) * 100) : 0;

  return (
    <div className="ws-page">
      <div className="widgets">
        <WidgetCard label="Progress" value={`${pct}%`} />
        <WidgetCard label="Stories completed" value={`${done}/${stories.length}`} />
        <WidgetCard label="Stories blocked" value={blocked} hint="PR com mudanças pedidas" />
      </div>

      <StageBoard repoId={repoId} items={stories} stages={STAGE_NAMES} />

      <AiSummary repoId={repoId} scope="pm-progress" title="AI Summary" />
    </div>
  );
}
