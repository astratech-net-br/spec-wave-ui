// QA do Developer (spec "Workspace do Developer" §3.5): meus itens em 🧪 QA do
// milestone corrente — o radar de "terminei, mas ainda não acabou". Somente
// leitura: o veredito (approve/return) é do Tech Leader.

import { useMemo, useState } from 'react';
import type { SnapshotItem } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { FeatureDrawer } from '../FeatureDrawer';
import { isOpen } from '../../../lib/workspaceSelectors';
import {
  TimeCell,
  TypeBadgeExec,
  featureOf,
  isExecItem,
  itemsByNumber,
  useStageAges,
} from '../tech/executionShared';
import { DevGate, isMine } from './devShared';

const WARN_DAYS = 3;

export function DevQaPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const [drawer, setDrawer] = useState<SnapshotItem | null>(null);
  const byNumber = useMemo(() => itemsByNumber(snapshot.items), [snapshot.items]);
  const ages = useStageAges(repoId, 'QA', snapshot.generatedAt);

  const inQa = useMemo(
    () =>
      snapshot.items.filter(
        (i) =>
          isExecItem(i) &&
          isOpen(i) &&
          i.stage === 'QA' &&
          i.milestone?.number === milestoneNumber,
      ),
    [snapshot.items, milestoneNumber],
  );

  return (
    <DevGate snapshot={snapshot} milestoneNumber={milestoneNumber}>
      {(login) => {
        const mine = inQa.filter((i) => isMine(i, login));
        return (
          <div className="ws-page">
            <div className="bl-head">
              <span className="bl-head__count">
                {mine.length} {mine.length === 1 ? 'item seu' : 'itens seus'} em QA
              </span>
            </div>

            {mine.length === 0 ? (
              <div className="bl-empty">
                <span className="bl-empty__icon">🧪</span>
                <p>Nada seu em QA.</p>
                <p className="tl-empty__hint">O veredito de QA é do Tech Leader.</p>
              </div>
            ) : (
              <div className="ex-rows">
                {mine.map((item) => {
                  const feature = featureOf(item, byNumber);
                  return (
                    <div key={item.number} className="ex-row">
                      <span className="ex-row__lead" />
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
                      <TimeCell age={ages.get(item.number)} warnDays={WARN_DAYS} />
                    </div>
                  );
                })}
              </div>
            )}

            {drawer && <FeatureDrawer repoId={repoId} item={drawer} onClose={() => setDrawer(null)} />}
          </div>
        );
      }}
    </DevGate>
  );
}
