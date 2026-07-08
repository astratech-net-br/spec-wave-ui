// Sidebar do workspace (RFC-003 §5): navegação do papel corrente. O papel só
// muda as páginas disponíveis — a troca de papel vive no topbar.

import type { WorkspaceRole } from '@spec-flow/shared';
import { DASHBOARD_HREF, hrefForWorkspace } from '../../lib/router';
import { ROLE_LABELS, WORKSPACE_NAV } from '../../lib/workspaceNav';

interface WorkspaceSidebarProps {
  role: WorkspaceRole;
  page: string;
}

export function WorkspaceSidebar({ role, page }: WorkspaceSidebarProps) {
  return (
    <aside className="ws-sidebar">
      <a className="ws-sidebar__brand" href={DASHBOARD_HREF} title="Voltar aos repositórios">
        <span className="brand" aria-hidden="true" />
        <span className="ws-sidebar__role">{ROLE_LABELS[role]}</span>
      </a>

      <nav className="ws-sidebar__nav" aria-label={`Navegação — ${ROLE_LABELS[role]}`}>
        {WORKSPACE_NAV[role].map((item) => (
          <a
            key={item.page}
            className={`ws-sidebar__link${item.page === page ? ' ws-sidebar__link--active' : ''}`}
            href={hrefForWorkspace(role, item.page)}
            aria-current={item.page === page ? 'page' : undefined}
          >
            <span className="ws-sidebar__icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </a>
        ))}
      </nav>

      <a className="ws-sidebar__foot" href="#/settings">
        ⚙️ Configurações
      </a>
    </aside>
  );
}
