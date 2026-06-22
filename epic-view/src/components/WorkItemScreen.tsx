// Tela de work item (Epic / Feature / Story). Carrega o item do GitHub (ou do
// fixture) e renderiza hero + descrição + filhos. Extraída de App para que o
// roteador possa alternar entre o Dashboard e esta tela.

import { useEffect, useState } from 'react';
import type { Level, WorkItemView } from '../types';
import { loadWorkItem } from '../data/source';
import { TopBar } from './TopBar';
import { Hero } from './Hero';
import { Description } from './Description';
import { ItemsPanel } from './ItemsPanel';
import { LoadingState } from './LoadingState';

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; view: WorkItemView; source: 'github' | 'fixture' };

interface WorkItemScreenProps {
  level: Level;
  number: number;
}

export function WorkItemScreen({ level, number }: WorkItemScreenProps) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  // Carrega o item da rota atual. O guard `active` cobre o duplo-efeito do
  // StrictMode e evita aplicar estado obsoleto ao trocar de rota.
  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    loadWorkItem(level, number)
      .then((result) => {
        if (active) setState({ phase: 'ready', view: result.view, source: result.source });
      })
      .catch((err: unknown) => {
        if (active) setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      active = false;
    };
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
          Configure <code>VITE_GITHUB_TOKEN</code>, <code>VITE_GITHUB_REPO</code> e{' '}
          <code>VITE_GITHUB_EPIC_ISSUE</code>, ou rode sem variáveis para usar o fixture local.
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
