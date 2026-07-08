// Code Review do Tech Leader (RFC-003 §3): stories esperando aprovação de PR
// — story, PR, reviewer e tempo de espera (desde a abertura do PR; precisão
// por timeline ficou fora do MVP — risco #6 do plano).

import type { SnapshotItem } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { hrefForItem } from '../../../lib/router';
import { isOpen, isStory, waitingReview } from '../../../lib/workspaceSelectors';

// Fila compartilhada com o workspace do Developer (variante por milestone).
export function CodeReviewQueue({ repoId, items }: { repoId: string; items: SnapshotItem[] }) {
  return (
    <QueueList
      repoId={repoId}
      items={items}
      empty="Nenhum PR esperando review. 🎉"
      showPrs
      actions={(item) => {
        const pr = item.prs.find(
          (p) => p.state === 'open' && !p.isDraft && p.reviewDecision !== 'APPROVED',
        );
        return [
          ...(pr ? [{ label: 'Open PR', href: pr.url, accent: true }] : []),
          {
            label: 'Open Story',
            href:
              item.level === 'story'
                ? hrefForItem(repoId, 'story', item.number)
                : item.url,
          },
        ];
      }}
    />
  );
}

export function TechCodeReviewPage({ repoId, snapshot }: WorkspacePageProps) {
  const waiting = snapshot.items.filter((i) => isStory(i) && isOpen(i) && waitingReview(i));
  return (
    <div className="ws-page">
      <CodeReviewQueue repoId={repoId} items={waiting} />
    </div>
  );
}
