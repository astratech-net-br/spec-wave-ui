// Board por etapa (RFC-003, páginas Progress): itens agrupados por milestone,
// e dentro de cada milestone uma coluna por etapa canônica. Somente leitura —
// mover etapa acontece nas filas (Start Story, UAT etc.).

import type { SnapshotItem, StageName } from '@spec-flow/shared';
import { hrefForItem } from '../../lib/router';
import { groupByMilestone, groupByStage } from '../../lib/workspaceSelectors';

interface StageBoardProps {
  repoId: string;
  items: SnapshotItem[];
  stages: StageName[];
  groupMilestones?: boolean; // false = um board único (sem seções de milestone)
}

function CardLink({ repoId, item }: { repoId: string; item: SnapshotItem }) {
  const internal = item.level === 'epic' || item.level === 'feature' || item.level === 'story';
  const href =
    item.level === 'epic' || item.level === 'feature' || item.level === 'story'
      ? hrefForItem(repoId, item.level, item.number)
      : item.url;
  return (
    <a
      className="board__card"
      href={href}
      {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })}
      title={item.title}
    >
      <span className="board__cardnum">#{item.number}</span> {item.title}
    </a>
  );
}

function Columns({ repoId, items, stages }: { repoId: string; items: SnapshotItem[]; stages: StageName[] }) {
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${stages.length + 1}, minmax(140px, 1fr))` }}>
      {groupByStage(items, stages).map(({ stage, items: bucket }) => (
        <div key={stage ?? 'none'} className="board__col">
          <div className="board__colhead">
            <span>{stage ?? 'Sem etapa'}</span>
            <span className="board__count">{bucket.length}</span>
          </div>
          {bucket.map((item) => (
            <CardLink key={item.number} repoId={repoId} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StageBoard({ repoId, items, stages, groupMilestones = true }: StageBoardProps) {
  if (items.length === 0) {
    return <p className="queue__empty">Nenhum item para exibir.</p>;
  }
  if (!groupMilestones) {
    return <Columns repoId={repoId} items={items} stages={stages} />;
  }
  return (
    <div className="board-groups">
      {groupByMilestone(items).map((group) => (
        <section key={group.key} className="board-group">
          <h3 className="board-group__title">{group.title}</h3>
          <Columns repoId={repoId} items={group.items} stages={stages} />
        </section>
      ))}
    </div>
  );
}
