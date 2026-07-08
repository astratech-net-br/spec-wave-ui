// Progress do Tech Leader (RFC-003 §3): execução completa — stories por
// milestone × etapas (Spec → Done; sem Backlog, foco em execução).

import type { StageName } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { StageBoard } from '../StageBoard';
import { isStory } from '../../../lib/workspaceSelectors';

const TECH_STAGES: StageName[] = [
  'Spec',
  'Plan',
  'Ready',
  'Development',
  'Code Review',
  'QA',
  'UAT',
  'Done',
];

export function TechProgressPage({ repoId, snapshot }: WorkspacePageProps) {
  const stories = snapshot.items.filter(isStory);
  return (
    <div className="ws-page">
      <StageBoard repoId={repoId} items={stories} stages={TECH_STAGES} />
    </div>
  );
}
