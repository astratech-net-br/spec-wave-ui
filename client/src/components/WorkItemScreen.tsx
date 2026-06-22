// Tela de work item (Epic / Feature / Story). Busca o WorkItemView pronto no
// backend (GET /api/workitems/:level/:number) e renderiza hero + descrição +
// filhos. Toda integração com o GitHub fica no servidor; aqui só exibimos.

import { useEffect, useState } from 'react';
import type { Level, WorkItemView } from '@spec-flow/shared';
import { fetchWorkItem } from '../data/workItem';
import { TopBar } from './TopBar';
import { Hero } from './Hero';
import { Description } from './Description';
import { ItemsPanel } from './ItemsPanel';
import { LoadingState } from './LoadingState';

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; view: WorkItemView };

interface WorkItemScreenProps {
  level: Level;
  number: number;
}

export function WorkItemScreen({ level, number }: WorkItemScreenProps) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  // Carrega o item da rota atual. O AbortController cobre o duplo-efeito do
  // StrictMode e evita aplicar estado obsoleto ao trocar de rota.
  useEffect(() => {
    const controller = new AbortController();
    setState({ phase: 'loading' });
    fetchWorkItem(level, number, controller.signal)
      .then((view) => {
        if (!controller.signal.aborted) setState({ phase: 'ready', view });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, [level, number]);

  if (state.phase === 'loading') {
    return <LoadingState />;
  }

  if (state.phase === 'error') {
    return (
      <div className="state-msg state-msg--error">
        <p>Não foi possível carregar o item.</p>
        <p>
          <code>{state.message}</code>
        </p>
        <p>
          Verifique se o servidor está em execução e se a integração com o GitHub está
          configurada no backend.
        </p>
      </div>
    );
  }

  const { view } = state;

  return (
    <>
      <TopBar breadcrumb={view.breadcrumb} owner={view.owner} />
      <main className="page">
        <Hero view={view} />
        <div className="body-grid">
          <Description source={view.descriptionMdx} plan={view.planMdx} />
          <ItemsPanel items={view.children} label={view.childrenLabel} />
        </div>
      </main>
    </>
  );
}
