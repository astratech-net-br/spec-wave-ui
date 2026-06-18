import type { ReactNode } from 'react';
import type { ChildItem } from '../types';
import { STATUS_MAP } from '../lib/status';
import { Avatar } from './Avatar';
import { ProgressBar } from './ProgressBar';

interface ItemCardProps {
  item: ChildItem;
}

// Envolve o card num link quando há drill-down (Feature/Story); folhas (Task) não.
function CardShell({ href, children }: { href?: string; children: ReactNode }) {
  if (href) {
    return (
      <a className="feature-card feature-card-link" href={href}>
        {children}
      </a>
    );
  }
  return <article className="feature-card">{children}</article>;
}

export function ItemCard({ item }: ItemCardProps) {
  const style = STATUS_MAP[item.status];

  return (
    <CardShell href={item.href}>
      <div className="feature-card__top">
        <span className="feature-card__dot" style={{ background: style.color }} />
        <span className="feature-card__name" title={item.name}>
          {item.name}
        </span>
        <Avatar initials={item.assignee.initials} color={item.assignee.avatarColor} size={26} />
      </div>

      {item.leaf ? (
        // Task: folha binária — checkbox + badge de status, sem barra nem contagem.
        <div className="feature-card__footer">
          <div className="tags">
            {item.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="feature-card__meta">
            <span
              className={`checkbox${item.status === 'done' ? ' checkbox--done' : ''}`}
              role="checkbox"
              aria-checked={item.status === 'done'}
              aria-label={item.status === 'done' ? 'Concluída' : 'A fazer'}
            >
              {item.status === 'done' ? '✓' : ''}
            </span>
            <span className="status-badge" style={{ color: style.color, background: style.bg }}>
              {style.label}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="feature-card__progress">
            {/* A barra usa a cor do status do item (RFC seção 4.5). */}
            <ProgressBar pct={item.pct} fill={style.color} label={`${item.name}: ${item.pct}%`} />
            <span className="feature-card__pct">{item.pct}%</span>
          </div>

          <div className="feature-card__footer">
            <div className="tags">
              {item.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="feature-card__meta">
              <span className="feature-card__tasks">
                {item.doneTasks}/{item.totalTasks}
              </span>
              <span className="status-badge" style={{ color: style.color, background: style.bg }}>
                {style.label}
              </span>
            </div>
          </div>
        </>
      )}
    </CardShell>
  );
}
