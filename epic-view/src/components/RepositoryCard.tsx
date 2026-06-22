// Card de um repositório conectado (Task #7). Exibe nome, URL clicável e a
// data de conexão formatada. A URL é sanitizada (só http/https) para prevenir
// XSS; URLs inválidas viram um aviso não-clicável (spec — "URL inválida").

import type { Repository } from '../types';
import { formatDateTime } from '../lib/date';
import { safeHttpUrl } from '../lib/url';

interface RepositoryCardProps {
  repo: Repository;
}

export function RepositoryCard({ repo }: RepositoryCardProps) {
  const href = safeHttpUrl(repo.url);

  return (
    <article className="repo-card">
      <div className="repo-card__top">
        <span className="repo-card__dot" />
        <span className="repo-card__name" title={repo.name}>
          {repo.name}
        </span>
      </div>

      {href ? (
        <a
          className="repo-card__url"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
        >
          {repo.url}
        </a>
      ) : (
        <span className="repo-card__url repo-card__url--invalid">URL inválida</span>
      )}

      <time className="repo-card__date" dateTime={repo.createdAt}>
        {formatDateTime(repo.createdAt)}
      </time>
    </article>
  );
}
