// Progress do Developer (RFC-003 §4): todas as stories do milestone corrente
// por etapa (Ready → Done) — visão do milestone sem navegar o projeto inteiro.

import type { StageName } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { StageBoard } from '../StageBoard';
import { inMilestone, isStory } from '../../../lib/workspaceSelectors';

const DEV_STAGES: StageName[] = ['Ready', 'Development', 'Code Review', 'QA', 'UAT', 'Done'];

export function DevProgressPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const stories = inMilestone(snapshot.items.filter(isStory), milestoneNumber);
  return (
    <div className="ws-page">
      <StageBoard repoId={repoId} items={stories} stages={DEV_STAGES} groupMilestones={false} />
    </div>
  );
}
