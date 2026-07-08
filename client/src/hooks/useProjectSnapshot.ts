// Hook de dados dos workspaces — segue o padrão de máquina de estados do
// useRepositories (loading / error / ready + retry). `refresh()` refaz a carga
// com ?fresh=1 (fura o cache do servidor) SEM voltar ao skeleton: mantém o
// snapshot atual visível e troca quando a nova leitura chega (`refreshing`).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectSnapshot } from '@spec-flow/shared';
import { fetchSnapshot } from '../data/snapshot';

export type SnapshotState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; snapshot: ProjectSnapshot; refreshing: boolean };

export interface UseProjectSnapshot {
  state: SnapshotState;
  retry: () => void; // recarrega do zero (estado de erro)
  refresh: () => void; // releitura fresh em background (após mutações)
}

export function useProjectSnapshot(repoId: string | null): UseProjectSnapshot {
  const [state, setState] = useState<SnapshotState>({ phase: 'loading' });
  const [nonce, setNonce] = useState(0);
  const freshRef = useRef(false);

  const retry = useCallback(() => {
    freshRef.current = false;
    setNonce((n) => n + 1);
  }, []);

  const refresh = useCallback(() => {
    freshRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!repoId) {
      setState({ phase: 'loading' });
      return;
    }
    const controller = new AbortController();
    const fresh = freshRef.current;
    freshRef.current = false;

    setState((prev) =>
      fresh && prev.phase === 'ready' ? { ...prev, refreshing: true } : { phase: 'loading' },
    );

    fetchSnapshot(repoId, { fresh }, controller.signal)
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setState({ phase: 'ready', snapshot, refreshing: false });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
      });

    return () => controller.abort();
  }, [repoId, nonce]);

  return { state, retry, refresh };
}
