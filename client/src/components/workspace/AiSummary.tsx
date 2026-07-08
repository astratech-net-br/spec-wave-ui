// Painel de AI insight (RFC-003, fase 5): gera um resumo sob demanda via
// POST /ai/summary e o renderiza em markdown. A AI só informa/recomenda —
// nenhuma ação é executada a partir daqui (princípio do RFC).

import { useState } from 'react';
import { fetchInsight, type InsightScope } from '../../data/workspace';
import { Mdx } from '../Mdx';

interface AiSummaryProps {
  repoId: string;
  scope: InsightScope;
  title: string;
  topicPlaceholder?: string; // presente = exibe campo de tema (brainstorm)
}

type AiState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; content: string };

export function AiSummary({ repoId, scope, title, topicPlaceholder }: AiSummaryProps) {
  const [state, setState] = useState<AiState>({ phase: 'idle' });
  const [topic, setTopic] = useState('');

  const generate = () => {
    setState({ phase: 'loading' });
    fetchInsight(repoId, scope, topicPlaceholder ? topic.trim() || undefined : undefined)
      .then((content) => setState({ phase: 'ready', content }))
      .catch((err: Error) => setState({ phase: 'error', message: err.message }));
  };

  return (
    <section className="ai-panel">
      <header className="ai-panel__head">
        <h3 className="ai-panel__title">✨ {title}</h3>
        <div className="ai-panel__controls">
          {topicPlaceholder && (
            <input
              type="text"
              className="ai-panel__topic"
              placeholder={topicPlaceholder}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          )}
          <button
            type="button"
            className="btn btn--sm btn--accent"
            onClick={generate}
            disabled={state.phase === 'loading'}
          >
            {state.phase === 'loading'
              ? 'Gerando…'
              : state.phase === 'ready'
                ? 'Gerar novamente'
                : 'Gerar'}
          </button>
        </div>
      </header>

      {state.phase === 'error' && <p className="ai-panel__error">{state.message}</p>}
      {state.phase === 'ready' && (
        <div className="ai-panel__body">
          <Mdx source={state.content} />
        </div>
      )}
    </section>
  );
}
