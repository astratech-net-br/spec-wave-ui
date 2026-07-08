// Specification do Tech Leader (RFC-003 §3): features na etapa Spec.
// Open Spec abre a Feature (aba Spec, com o fluxo de refino existente);
// Generate Spec dispara a Action (label spec-wave:spec); Approve move a
// feature para a etapa Plan. "Request changes" acontece na tela da Feature
// (refino interativo) — o link Open Spec cobre a ação.

import { useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { isFeature, isOpen } from '../../../lib/workspaceSelectors';
import { setStage } from '../../../data/workspace';
import { createArtifact } from '../../../data/workItem';

export function SpecificationPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);
  const features = snapshot.items.filter((i) => isFeature(i) && isOpen(i) && i.stage === 'Spec');

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
        empty="Nenhuma feature na etapa Spec."
        actions={(item) => [
          { label: 'Open Spec', href: hrefForItem(repoId, 'feature', item.number) },
          {
            label: 'Generate Spec',
            disabled: busy,
            onClick: () => run(() => createArtifact(repoId, item.number, 'spec')),
          },
          {
            label: 'Approve Spec',
            accent: true,
            disabled: busy,
            onClick: () => run(() => setStage(repoId, 'feature', item.number, 'Plan')),
          },
        ]}
      />
    </div>
  );
}
