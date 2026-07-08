// Dashboard do Product Manager (RFC-003 §2): resumo executivo do projeto.

import { STAGE_NAMES } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { WidgetCard } from '../WidgetCard';
import { AiSummary } from '../AiSummary';
import { isFeature, isStory } from '../../../lib/workspaceSelectors';

export function PmDashboard({ repoId, snapshot }: WorkspacePageProps) {
  const stories = snapshot.items.filter(isStory);
  const features = snapshot.items.filter(isFeature);

  const doneStories = stories.filter((s) => s.stage === 'Done' || s.state === 'closed').length;
  const health = stories.length > 0 ? Math.round((doneStories / stories.length) * 100) : 0;
  const deliveredFeatures = features.filter(
    (f) => f.stage === 'Done' || f.state === 'closed',
  ).length;

  const upcoming = snapshot.milestones
    .filter((m) => m.state === 'open')
    .sort((a, b) => (a.dueOn ?? '9999') < (b.dueOn ?? '9999') ? -1 : 1)
    .slice(0, 5);

  return (
    <div className="ws-page">
      <div className="widgets">
        <WidgetCard label="Project Health" value={`${health}%`} hint="stories concluídas" />
        <WidgetCard label="Features Delivered" value={deliveredFeatures} hint={`de ${features.length}`} />
        <WidgetCard label="Stories" value={stories.length} hint={`${doneStories} concluídas`} />
        <WidgetCard
          label="Upcoming Milestones"
          value={upcoming.length}
          hint={upcoming[0] ? `próximo: ${upcoming[0].title}` : 'nenhum aberto'}
        />
      </div>

      <section className="ws-section">
        <h3 className="ws-section__title">Stories by Stage</h3>
        <div className="stage-counts">
          {STAGE_NAMES.map((stage) => (
            <div key={stage} className="stage-counts__cell">
              <span className="stage-counts__n">
                {stories.filter((s) => s.stage === stage).length}
              </span>
              <span className="stage-counts__label">{stage}</span>
            </div>
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="ws-section">
          <h3 className="ws-section__title">Milestones</h3>
          <ul className="milestone-list">
            {upcoming.map((m) => (
              <li key={m.number} className="milestone-list__row">
                <span className="milestone-list__title">{m.title}</span>
                <span className="milestone-list__meta">
                  {m.dueOn ? `alvo ${m.dueOn.slice(0, 10)} · ` : ''}
                  {m.closedCount}/{m.closedCount + m.openCount} issues
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AiSummary repoId={repoId} scope="pm-progress" title="AI Insights" />
    </div>
  );
}
