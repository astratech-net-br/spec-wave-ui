// Code Review do Developer (spec "Workspace do Developer" §3.4): duas filas no
// milestone corrente. "Esperando meu review" (o que devo aos outros) tem
// precedência visual — fica acima quando não vazia. Sem escritas: o review
// acontece no GitHub; cada linha linka o PR. A espera conta desde a abertura do
// PR (aproximação de reviewRequestedAt — o snapshot não expõe o timestamp).

import { useMemo, useState } from 'react';
import type { PullRequestRef, SnapshotItem } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { FeatureDrawer } from '../FeatureDrawer';
import { isOpen } from '../../../lib/workspaceSelectors';
import {
  TypeBadgeExec,
  daysFrom,
  isExecItem,
} from '../tech/executionShared';
import { DevGate, isMine, prInReview, prWaitingMyReview } from './devShared';

const WAIT_WARN = 2;
const WAIT_DANGER = 5;

interface PrRow {
  item: SnapshotItem;
  pr: PullRequestRef;
}

function waitCls(days: number): string {
  return days > WAIT_DANGER ? ' ex-time--danger' : days > WAIT_WARN ? ' ex-time--warn' : '';
}

export function DevCodeReviewPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const [drawer, setDrawer] = useState<SnapshotItem | null>(null);

  const scope = useMemo(
    () =>
      snapshot.items.filter(
        (i) => isExecItem(i) && isOpen(i) && i.milestone?.number === milestoneNumber,
      ),
    [snapshot.items, milestoneNumber],
  );

  const renderRow = (row: PrRow, showReviewer: boolean) => {
    const days = daysFrom(row.pr.createdAt);
    const reviewer = row.pr.reviewers[0] ?? null;
    const changes = row.pr.reviewDecision === 'CHANGES_REQUESTED';
    return (
      <div key={`${row.item.number}-${row.pr.number}`} className="ex-row">
        <span className="ex-row__lead" />
        <TypeBadgeExec item={row.item} />
        <button
          type="button"
          className="ex-row__title"
          onClick={() => setDrawer(row.item)}
          title={row.item.title}
        >
          <span className="mono">#{row.item.number}</span> {row.item.title}
        </button>
        <span className="ex-row__prs">
          <a
            className={`prchip prchip--${row.pr.state}${row.pr.isDraft ? ' prchip--draft' : ''}`}
            href={row.pr.url}
            target="_blank"
            rel="noreferrer"
            title={row.pr.title}
          >
            PR #{row.pr.number}
          </a>
          {changes && <span className="ex-badge-changes">mudanças pedidas</span>}
        </span>
        {showReviewer ? (
          <span className={reviewer ? 'ex-reviewer' : 'ex-reviewer ex-reviewer--none'}>
            {reviewer ?? 'sem reviewer'}
          </span>
        ) : (
          <span className="pl2-dim">
            {row.item.assignees[0] ? `@${row.item.assignees[0].login}` : '—'}
          </span>
        )}
        <span className={`mono ex-time${waitCls(days)}`} title="Espera desde a abertura do PR">
          {days}d
        </span>
      </div>
    );
  };

  return (
    <DevGate snapshot={snapshot} milestoneNumber={milestoneNumber}>
      {(login) => {
        // Fila 2 — o que devo aos outros (precedência quando não vazia).
        const waitingMe: PrRow[] = scope.flatMap((item) =>
          item.prs.filter((pr) => prWaitingMyReview(pr, login)).map((pr) => ({ item, pr })),
        );
        // Fila 1 — o que espero dos outros (PRs dos meus itens).
        const myPrs: PrRow[] = scope
          .filter((i) => isMine(i, login))
          .flatMap((item) => item.prs.filter(prInReview).map((pr) => ({ item, pr })));

        const queues = [
          {
            key: 'waiting-me',
            title: `Esperando meu review (${waitingMe.length})`,
            rows: waitingMe,
            showReviewer: false,
            empty: 'Ninguém espera o seu review agora.',
            className: waitingMe.length > 0 ? ' dv-queue--urgent' : '',
          },
          {
            key: 'my-prs',
            title: `Meus PRs em review (${myPrs.length})`,
            rows: myPrs,
            showReviewer: true,
            empty: 'Nenhum PR seu esperando review.',
            className: '',
          },
        ];
        // Precedência visual: a fila 2 sobe quando não vazia (já está acima).

        return (
          <div className="ws-page">
            {queues.map((q) => (
              <section key={q.key} className={`ex-group${q.className}`}>
                <div className="ex-group__head dv-queue__head">
                  <span className="ex-group__title">{q.title}</span>
                </div>
                {q.rows.length === 0 ? (
                  <div className="dv-queue__empty">{q.empty}</div>
                ) : (
                  <div className="ex-rows">{q.rows.map((r) => renderRow(r, q.showReviewer))}</div>
                )}
              </section>
            ))}

            {drawer && (
              <FeatureDrawer repoId={repoId} item={drawer} onClose={() => setDrawer(null)} />
            )}
          </div>
        );
      }}
    </DevGate>
  );
}
