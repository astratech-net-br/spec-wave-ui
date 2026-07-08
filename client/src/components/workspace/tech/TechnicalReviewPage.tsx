// Technical Review do Tech Leader (RFC-003 §3): features na etapa Plan, com
// status de spec/plan/aprovação. Approve Plan = label spec-wave:ready (fluxo
// existente) + etapa Ready; Return for changes devolve para Spec.

import { useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { isFeature, isOpen } from '../../../lib/workspaceSelectors';
import { setStage } from '../../../data/workspace';
import { approvePlan, createArtifact } from '../../../data/workItem';

export function TechnicalReviewPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);
  const features = snapshot.items.filter((i) => isFeature(i) && isOpen(i) && i.stage === 'Plan');

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      <QueueList
        repoId={repoId}
        items={features}
        empty="Nenhuma feature aguardando revisão técnica."
        meta={(item) => (
          <span className="queue__flags">
            {item.labels.includes('spec-wave:plan-approved') || item.labels.includes('spec-wave:ready')
              ? '✅ plan aprovado'
              : '⏳ aguardando aprovação'}
          </span>
        )}
        actions={(item) => [
          { label: 'Review Plan', href: hrefForItem(repoId, 'feature', item.number) },
          {
            label: 'Generate Plan',
            disabled: busy,
            onClick: () => run(() => createArtifact(repoId, item.number, 'plan')),
          },
          {
            label: 'Approve Plan',
            accent: true,
            disabled: busy,
            onClick: () =>
              run(() =>
                approvePlan(repoId, item.number).then(() =>
                  setStage(repoId, 'feature', item.number, 'Ready'),
                ),
              ),
          },
          {
            label: 'Return for changes',
            disabled: busy,
            onClick: () => run(() => setStage(repoId, 'feature', item.number, 'Spec')),
          },
        ]}
      />
    </div>
  );
}
