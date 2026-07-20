// Anatomia compartilhada do workspace do Developer (spec "Workspace do
// Developer"): escopo = milestone corrente (topbar), perspectiva pessoal
// ("meu" = login do GitHub vinculado à sessão em /api/me) e os estados-portão
// comuns (sem identidade / sem milestone). As views herdam a linha padrão das
// telas de execução do TL (executionShared).

import { useState, type ReactNode } from 'react';
import type {
  MilestoneSummary,
  ProjectSnapshot,
  PullRequestRef,
  SnapshotItem,
} from '@spec-flow/shared';
import { parseMilestoneMeta } from '../../../lib/milestoneMeta';
import { useMe } from '../../../hooks/useMe';

// ---- milestone corrente ----

// Auto-seleção inicial (spec §1): o milestone Em execução (aberto, com algo já
// entregue) de ETA mais próxima; na ausência, o Planejada de início mais
// próximo (metadado do planner); por fim, o aberto de ETA mais próxima.
export function autoPickMilestone(milestones: MilestoneSummary[]): number | null {
  const open = milestones.filter((m) => m.state === 'open');
  if (open.length === 0) return null;
  const byEta = (a: MilestoneSummary, b: MilestoneSummary) =>
    (a.dueOn ?? '9999') < (b.dueOn ?? '9999') ? -1 : 1;
  const inExec = open.filter((m) => m.closedCount > 0).sort(byEta);
  if (inExec[0]) return inExec[0].number;
  const startOf = (m: MilestoneSummary) => parseMilestoneMeta(m.description).start ?? '9999';
  const planned = [...open].sort((a, b) => {
    const sa = startOf(a);
    const sb = startOf(b);
    return sa !== sb ? (sa < sb ? -1 : 1) : byEta(a, b);
  });
  return planned[0]?.number ?? null;
}

// ---- perspectiva pessoal ----

export const isMine = (item: SnapshotItem, login: string): boolean =>
  item.assignees.some((a) => a.login === login);

// Logins conhecidos no repositório (assignees + reviewers) — opções do vínculo.
export function knownLogins(snapshot: ProjectSnapshot): string[] {
  const logins = new Set<string>();
  for (const item of snapshot.items) {
    for (const a of item.assignees) logins.add(a.login);
    for (const pr of item.prs) for (const r of pr.reviewers) logins.add(r);
  }
  return [...logins].sort((a, b) => a.localeCompare(b));
}

// Toggle "ver todas do time" persistido por repo+tela.
const TOGGLE_KEY = 'spec-flow.dev-team-toggle';

export function useTeamToggle(repoId: string, screen: string) {
  const storageKey = `${TOGGLE_KEY}.${screen}`;
  const [showAll, setShowAll] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const all = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      return all[repoId] ?? false;
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setShowAll((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem(storageKey);
        const all = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
        localStorage.setItem(storageKey, JSON.stringify({ ...all, [repoId]: next }));
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  return { showAll, toggle };
}

// ---- predicados de PR ----

// PR aberto (não-draft) com review solicitado — mesma aproximação da automação
// do backend (o snapshot não expõe reviewRequestedAt).
export const prInReview = (pr: PullRequestRef): boolean =>
  pr.state === 'open' &&
  !pr.isDraft &&
  pr.reviewDecision !== 'APPROVED';

// PR esperando o MEU review (fila 2 do Code Review + notificações do topbar).
export const prWaitingMyReview = (pr: PullRequestRef, login: string): boolean =>
  pr.state === 'open' && !pr.isDraft && pr.reviewers.includes(login);

// ---- portões comuns (identidade e milestone) ----

interface DevGateProps {
  snapshot: ProjectSnapshot;
  milestoneNumber: number | null;
  children: (login: string, milestone: MilestoneSummary) => ReactNode;
}

// Envolve toda view do dev: exige o vínculo do login do GitHub e um milestone
// corrente selecionado; senão renderiza o estado-portão correspondente.
export function DevGate({ snapshot, milestoneNumber, children }: DevGateProps) {
  const { me, setLogin } = useMe();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) {
    return (
      <div className="ws-skeleton" aria-busy="true" aria-label="Carregando identidade">
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (!me.login) {
    const options = knownLogins(snapshot);
    const save = (login: string) => {
      if (!login.trim()) return;
      setSaving(true);
      setError(null);
      setLogin(login.trim())
        .catch((err: Error) => setError(err.message))
        .finally(() => setSaving(false));
    };
    return (
      <div className="bl-empty dv-identity">
        <span className="bl-empty__icon">👤</span>
        <p>Quem é você no GitHub?</p>
        <p className="tl-empty__hint">
          O workspace do Developer é pessoal: vincule o seu login do GitHub uma única vez para
          ver os seus itens e puxar trabalho.
        </p>
        <div className="dv-identity__form">
          {options.length > 0 && (
            <select
              className="queue__priosel"
              value={options.includes(draft) ? draft : ''}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Login do GitHub"
              disabled={saving}
            >
              <option value="">Selecione…</option>
              {options.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
          <input
            className="dv-identity__input"
            type="text"
            placeholder="ou digite o login"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save(draft)}
            disabled={saving}
            aria-label="Login do GitHub (texto livre)"
          />
          <button
            type="button"
            className="btn btn--accent btn--sm"
            disabled={saving || !draft.trim()}
            onClick={() => save(draft)}
          >
            {saving ? 'Salvando…' : 'Vincular'}
          </button>
        </div>
        {error && <p className="dv-identity__error">{error}</p>}
      </div>
    );
  }

  const milestone = snapshot.milestones.find((m) => m.number === milestoneNumber) ?? null;
  if (!milestone) {
    return (
      <div className="bl-empty">
        <span className="bl-empty__icon">🎯</span>
        <p>Selecione um milestone no topo.</p>
        <p className="tl-empty__hint">
          Todas as views do Developer trabalham no escopo do milestone corrente — use o seletor
          na barra superior.
        </p>
      </div>
    );
  }

  return <>{children(me.login, milestone)}</>;
}
