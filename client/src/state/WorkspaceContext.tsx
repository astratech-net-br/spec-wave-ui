// Estado compartilhado do workspace (RFC-003): repositório selecionado e
// milestone corrente (papel Developer), persistidos em localStorage. O PAPEL
// vive na URL (#/ws/:role/…) — aqui só guardamos o último usado, para o link
// "Abrir workspace" voltar ao papel anterior.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@spec-flow/shared';

const STORAGE_KEY = 'spec-flow.workspace';

interface Persisted {
  role?: WorkspaceRole;
  repoId?: string | null;
  milestoneNumber?: number | null;
}

function readPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function writePersisted(patch: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPersisted(), ...patch }));
  } catch {
    /* storage indisponível (modo privado) — estado só em memória */
  }
}

// Último papel visitado — para links de entrada fora do provider (Dashboard).
export function lastWorkspaceRole(): WorkspaceRole {
  const role = readPersisted().role;
  return role === 'pm' || role === 'tech' || role === 'dev' ? role : 'pm';
}

export function rememberWorkspaceRole(role: WorkspaceRole): void {
  writePersisted({ role });
}

interface WorkspaceContextValue {
  repoId: string | null;
  setRepoId: (id: string | null) => void;
  milestoneNumber: number | null; // milestone corrente (papel dev); null = todos
  setMilestoneNumber: (n: number | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(readPersisted, []);
  const [repoId, setRepoIdState] = useState<string | null>(persisted.repoId ?? null);
  const [milestoneNumber, setMilestoneState] = useState<number | null>(
    persisted.milestoneNumber ?? null,
  );

  const setRepoId = useCallback((id: string | null) => {
    setRepoIdState(id);
    // Trocar de repo invalida o milestone corrente (é por repositório).
    setMilestoneState(null);
    writePersisted({ repoId: id, milestoneNumber: null });
  }, []);

  const setMilestoneNumber = useCallback((n: number | null) => {
    setMilestoneState(n);
    writePersisted({ milestoneNumber: n });
  }, []);

  const value = useMemo(
    () => ({ repoId, setRepoId, milestoneNumber, setMilestoneNumber }),
    [repoId, setRepoId, milestoneNumber, setMilestoneNumber],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace precisa estar dentro de <WorkspaceProvider>.');
  return ctx;
}
