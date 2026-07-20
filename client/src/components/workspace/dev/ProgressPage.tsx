// Progress do Developer (spec "Workspace do Developer" §3.6): reuso direto da
// matriz item × etapa da spec de execução do TL, filtrada ao milestone corrente,
// com toggle meus/todas. Sem AI Summary (pertence ao papel TL); sem escritas.

import { useMemo, useState } from 'react';
import type { SnapshotItem } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { FeatureDrawer } from '../FeatureDrawer';
import {
  EXEC_STAGES,
  ProgressMatrix,
  STAGE_SHORT,
  isExecItem,
  stageOfExec,
} from '../tech/executionShared';
import { DevGate, isMine, useTeamToggle } from './devShared';

export function DevProgressPage({ repoId, snapshot, milestoneNumber }: WorkspacePageProps) {
  const { showAll, toggle } = useTeamToggle(repoId, 'progress');
  const [drawer, setDrawer] = useState<SnapshotItem | null>(null);

  const scoped = useMemo(
    () =>
      snapshot.items.filter(
        (i) =>
          isExecItem(i) && stageOfExec(i) != null && i.milestone?.number === milestoneNumber,
      ),
    [snapshot.items, milestoneNumber],
  );

  return (
    <DevGate snapshot={snapshot} milestoneNumber={milestoneNumber}>
      {(login) => {
        const items = showAll ? scoped : scoped.filter((i) => isMine(i, login));
        const counts = EXEC_STAGES.map((s) => items.filter((i) => stageOfExec(i) === s).length);
        return (
          <div className="ws-page">
            <div className="bl-head">
              <span className="bl-head__count">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
                {showAll ? ' (time)' : ' (meus)'}
              </span>
              <span className="px-widgets">
                {EXEC_STAGES.map((s, i) => (
                  <span key={s} className="px-widget" title={s}>
                    {STAGE_SHORT[s]} <b>{counts[i]}</b>
                  </span>
                ))}
              </span>
              <span className="ws-toolbar__spacer" />
              <label className="dv-toggle">
                <input type="checkbox" checked={showAll} onChange={toggle} /> ver todas do time
              </label>
            </div>

            {items.length === 0 ? (
              <div className="bl-empty">
                <span className="bl-empty__icon">📈</span>
                <p>
                  {showAll
                    ? 'Nada em execução neste milestone.'
                    : 'Nada seu em execução neste milestone.'}
                </p>
              </div>
            ) : (
              <ProgressMatrix items={items} onItem={setDrawer} />
            )}

            {drawer && <FeatureDrawer repoId={repoId} item={drawer} onClose={() => setDrawer(null)} />}
          </div>
        );
      }}
    </DevGate>
  );
}
