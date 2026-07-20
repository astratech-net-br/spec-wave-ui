// Dashboard do Developer (spec "Workspace do Developer" §3.1): um trampolim —
// quatro cards numéricos, cada um navegando para a view correspondente. Sem
// gráficos e sem insights; o escopo é o milestone corrente do topbar.

import { useMemo } from 'react';
import type { WorkspacePageProps } from '../types';
import { hrefForWorkspace } from '../../../lib/router';
import { isOpen } from '../../../lib/workspaceSelectors';
import { isExecItem } from '../tech/executionShared';
import { DevGate, isMine, prInReview, prWaitingMyReview } from './devShared';

export function DevDashboard({ snapshot, milestoneNumber }: WorkspacePageProps) {
  const scope = useMemo(
    () =>
      snapshot.items.filter(
        (i) => isExecItem(i) && isOpen(i) && i.milestone?.number === milestoneNumber,
      ),
    [snapshot.items, milestoneNumber],
  );

  return (
    <DevGate snapshot={snapshot} milestoneNumber={milestoneNumber}>
      {(login, milestone) => {
        const inProgress = scope.filter((i) => i.stage === 'Development' && isMine(i, login)).length;
        const ready = scope.filter((i) => i.stage === 'Ready').length;
        const myPrs = scope
          .filter((i) => isMine(i, login))
          .flatMap((i) => i.prs)
          .filter(prInReview).length;
        const waitingMe = scope.flatMap((i) => i.prs).filter((pr) => prWaitingMyReview(pr, login))
          .length;

        const cards = [
          { label: 'Em andamento', value: inProgress, page: 'in-progress', warn: false },
          { label: 'Prontos para pull', value: ready, page: 'pending', warn: false },
          { label: 'Meus PRs em review', value: myPrs, page: 'code-review', warn: false },
          { label: 'Esperando meu review', value: waitingMe, page: 'code-review', warn: waitingMe > 0 },
        ];

        return (
          <div className="ws-page">
            <div className="bl-head">
              <span className="bl-head__count">
                {milestone.title}
                {milestone.dueOn ? ` — alvo ${milestone.dueOn.slice(0, 10)}` : ''}
              </span>
            </div>
            <div className="widgets">
              {cards.map((c) => (
                <a
                  key={c.label}
                  className={`widget dv-card${c.warn ? ' dv-card--warn' : ''}`}
                  href={hrefForWorkspace('dev', c.page)}
                >
                  <span className="widget__value">{c.value}</span>
                  <span className="widget__label">{c.label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      }}
    </DevGate>
  );
}
