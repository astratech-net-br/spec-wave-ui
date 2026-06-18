import { useEffect, useState } from 'react';
import type { WorkItemView } from './types';
import { loadWorkItem } from './data/source';
import { DEFAULT_ROUTE, hrefFor, parseHash, type Route } from './lib/router';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { Description } from './components/Description';
import { ItemsPanel } from './components/ItemsPanel';
import { LoadingState } from './components/LoadingState';

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; view: WorkItemView; source: 'github' | 'fixture' };

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [state, setState] = useState<State>({ phase: 'loading' });

  // Canoniza a URL no primeiro mount e segue mudanças de hash.
  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = hrefFor(DEFAULT_ROUTE.level, DEFAULT_ROUTE.number);
    }
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Carrega o item da rota atual. O guard `active` cobre o duplo-efeito do
  // StrictMode e evita aplicar estado obsoleto ao trocar de rota.
  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    loadWorkItem(route.level, route.number)
      .then((result) => {
        if (active) setState({ phase: 'ready', view: result.view, source: result.source });
      })
      .catch((err: unknown) => {
        if (active) setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      active = false;
    };
  }, [route.level, route.number]);

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
