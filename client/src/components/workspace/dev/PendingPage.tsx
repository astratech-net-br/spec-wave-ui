// Pending do Developer (spec "Workspace do Developer" §3.2): Stories e Bugs em
// ✅ Ready do milestone corrente, na ordem de pull definida pelo TL (Rank). O
// primeiro item é o "próximo recomendado" — puxar qualquer outro é permitido.
// Start Story: assignee = eu + etapa Desenvolvimento, otimista, com WIP pessoal
// persuasivo (≥ wipThreshold em andamento → confirmação leve, nunca bloqueia).

import { useMemo, useState } from 'react';
import type { SnapshotItem } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { FeatureDrawer } from '../FeatureDrawer';
import { ToastStack, useToasts } from '../Toasts';
import { hrefForWorkspace } from '../../../lib/router';
import { isOpen } from '../../../lib/workspaceSelectors';
import { startWork } from '../../../data/workspace';
import {
  AssigneeCell,
  TimeCell,
  TypeBadgeExec,
  featureOf,
  isExecItem,
  itemsByNumber,
  useStageAges,
} from '../tech/executionShared';
import { DevGate, isMine } from './devShared';

const WARN_DAYS = 14;
const DEFAULT_WIP = 2;

export function PendingPage({ repoId, snapshot, milestoneNumber, refresh }: WorkspacePageProps) {
  const [pulledLocal, setPulledLocal] = useState<Set<number>>(new Set());
  const [drawer, setDrawer] = useState<SnapshotItem | null>(null);
  const [busy, setBusy] = useState(false);
  const { toasts, addToast, dismissToast } = useToasts();
  const byNumber = useMemo(() => itemsByNumber(snapshot.items), [snapshot.items]);
  const ages = useStageAges(repoId, 'Ready', snapshot.generatedAt);

  const pending = useMemo(
    () =>
      snapshot.items
        .filter(
          (i) =>
            isExecItem(i) &&
            isOpen(i) &&
            i.stage === 'Ready' &&
            i.milestone?.number === milestoneNumber &&
            !pulledLocal.has(i.number),
        )
        .sort(
          (a, b) =>
            (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
            (a.createdAt < b.createdAt ? -1 : 1),
        ),
    [snapshot.items, milestoneNumber, pulledLocal],
  );

  const wipThreshold = snapshot.repository.wipThreshold ?? DEFAULT_WIP;

  const goInProgress = () => {
    window.location.hash = hrefForWorkspace('dev', 'in-progress');
  };

  return (
    <DevGate snapshot={snapshot} milestoneNumber={milestoneNumber}>
      {(login) => {
        const myInDev =
          snapshot.items.filter(
            (i) => isExecItem(i) && isOpen(i) && i.stage === 'Development' && isMine(i, login),
          ).length + pulledLocal.size;

        const doStart = (item: SnapshotItem) => {
          // WIP pessoal persuasivo: pergunta, nunca bloqueia.
          if (
            myInDev >= wipThreshold &&
            !confirm(
              `Você já tem ${myInDev} ${myInDev === 1 ? 'item' : 'itens'} em andamento — ` +
                `concluir antes de puxar?\n\nOK = Puxar mesmo assim`,
            )
          ) {
            return;
          }
          setBusy(true);
          setPulledLocal((s) => new Set(s).add(item.number));
          startWork(repoId, 'story', item.number)
            .then(() => {
              addToast(`#${item.number} puxada — boa!`, {
                label: 'Ver In Progress',
                run: goInProgress,
              });
              refresh();
            })
            .catch((err: Error) => {
              setPulledLocal((s) => {
                const next = new Set(s);
                next.delete(item.number);
                return next;
              });
              addToast(`Falha ao puxar #${item.number}: ${err.message}`, {
                label: 'Tentar novamente',
                run: () => doStart(item),
              });
            })
            .finally(() => setBusy(false));
        };

        return (
          <div className="ws-page">
            <div className="bl-head">
              <span className="bl-head__count">
                {pending.length} {pending.length === 1 ? 'item pronto' : 'itens prontos'} para pull
                — ordem do Tech Leader
              </span>
            </div>

            {pending.length === 0 ? (
              myInDev > 0 ? (
                <div className="bl-empty">
                  <span className="bl-empty__icon">🎉</span>
                  <p>
                    Tudo puxado — {myInDev} em andamento.{' '}
                    <a href={hrefForWorkspace('dev', 'in-progress')}>Ver In Progress</a>
                  </p>
                </div>
              ) : (
                <div className="bl-empty">
                  <span className="bl-empty__icon">📦</span>
                  <p>O backlog técnico deste milestone está vazio.</p>
                  <p className="tl-empty__hint">
                    As stories chegam aqui pela decomposição do Tech Leader.
                  </p>
                </div>
              )
            ) : (
              <div className="ex-rows dv-pending">
                {pending.map((item, idx) => {
                  const feature = featureOf(item, byNumber);
                  return (
                    <div
                      key={item.number}
                      className={`ex-row${idx === 0 ? ' dv-row--next' : ''}`}
                    >
                      <span className="ex-row__lead">
                        {idx === 0 && <span className="dv-next-chip">próximo</span>}
                      </span>
                      <TypeBadgeExec item={item} />
                      <button
                        type="button"
                        className="ex-row__title"
                        onClick={() => setDrawer(item)}
                        title={item.title}
                      >
                        <span className="mono">#{item.number}</span> {item.title}
                      </button>
                      <button
                        type="button"
                        className="ex-row__feature"
                        onClick={() => feature && setDrawer(feature)}
                        title={feature?.title}
                      >
                        {feature?.title ?? '—'}
                      </button>
                      <span className="mono">{item.points != null ? `${item.points} pts` : '—'}</span>
                      <AssigneeCell item={item} />
                      <TimeCell age={ages.get(item.number)} warnDays={WARN_DAYS} />
                      <button
                        type="button"
                        className="btn btn--sm btn--accent"
                        disabled={busy}
                        onClick={() => doStart(item)}
                      >
                        Start Story
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {drawer && <FeatureDrawer repoId={repoId} item={drawer} onClose={() => setDrawer(null)} />}
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
          </div>
        );
      }}
    </DevGate>
  );
}
