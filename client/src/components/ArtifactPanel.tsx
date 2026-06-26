// Painel de uma aba de artefato (Spec ou Plan) de uma Feature. Cobre o ciclo:
//   • vazio    → botão "Create" (aplica label spec-wave + move etapa; a Action gera)
//   • waiting  → poll do WorkItemView até o arquivo gerado pela Action aparecer
//   • idle     → exibe o conteúdo + "Solicitar alteração"
//   • prompting→ textarea de prompt + "Gerar" (chama a LLM via OpenRouter)
//   • review   → rascunho gerado + Salvar / Solicitar alteração / Descartar
//
// O conteúdo (`content`) vem do WorkItemView do pai (view.specMdx/planMdx). Após
// create/save/poll, `applyView` substitui a view do pai e o `content` se atualiza.

import { useEffect, useRef, useState } from 'react';
import type { ArtifactKind, WorkItemView } from '@spec-flow/shared';
import { Mdx } from './Mdx';
import { EditError } from './EditControls';
import {
  approvePlan,
  createArtifact,
  fetchWorkItem,
  refineArtifact,
  saveArtifact,
} from '../data/workItem';

interface ArtifactPanelProps {
  kind: ArtifactKind;
  content: string | null;
  repoId: number;
  featureNumber: number;
  applyView: (view: WorkItemView) => void;
}

type Phase =
  | { t: 'idle' }
  | { t: 'creating' }
  | { t: 'waiting' }
  | { t: 'prompting'; base: string }
  | { t: 'generating' }
  | { t: 'review'; draft: string };

const LABEL: Record<ArtifactKind, string> = { spec: 'Spec', plan: 'Plan' };
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 40; // ~2 min aguardando a Action

export function ArtifactPanel({
  kind,
  content,
  repoId,
  featureNumber,
  applyView,
}: ArtifactPanelProps) {
  const [phase, setPhase] = useState<Phase>({ t: 'idle' });
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const label = LABEL[kind];

  const hasContent = content != null && content.trim().length > 0;

  // Poll do arquivo gerado pela Action enquanto em 'waiting'. Para ao detectar o
  // conteúdo (volta a 'idle') ou ao esgotar as tentativas (erro + 'idle').
  const phaseT = phase.t;
  const applyRef = useRef(applyView);
  applyRef.current = applyView;
  useEffect(() => {
    if (phaseT !== 'waiting') return;
    let attempts = 0;
    let stopped = false;
    const tick = async () => {
      attempts += 1;
      try {
        const view = await fetchWorkItem(repoId, 'feature', featureNumber);
        if (stopped) return;
        applyRef.current(view);
        const got = kind === 'spec' ? view.specMdx : view.planMdx;
        if (got != null && got.trim().length > 0) {
          stopped = true;
          clearInterval(timer);
          setPhase({ t: 'idle' });
          return;
        }
      } catch {
        /* transitório: tenta de novo no próximo tick */
      }
      if (attempts >= POLL_MAX_ATTEMPTS && !stopped) {
        stopped = true;
        clearInterval(timer);
        setError(
          `A geração do ${label} pela GitHub Action está demorando. Tente "Atualizar" em instantes.`,
        );
        setPhase({ t: 'idle' });
      }
    };
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [phaseT, repoId, featureNumber, kind, label]);

  const onCreate = async () => {
    setError(null);
    setPhase({ t: 'creating' });
    try {
      applyView(await createArtifact(repoId, featureNumber, kind));
      setPhase({ t: 'waiting' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase({ t: 'idle' });
    }
  };

  const onGenerate = async (base: string) => {
    if (prompt.trim().length === 0) return;
    setError(null);
    setPhase({ t: 'generating' });
    try {
      const draft = await refineArtifact(repoId, featureNumber, kind, prompt.trim(), base);
      setPhase({ t: 'review', draft });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase({ t: 'prompting', base });
    }
  };

  const onSave = async (draft: string) => {
    setError(null);
    const previous = phase;
    setPhase({ t: 'generating' }); // reaproveita o indicador de "trabalhando"
    try {
      applyView(await saveArtifact(repoId, featureNumber, kind, draft));
      setPrompt('');
      setPhase({ t: 'idle' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(previous);
    }
  };

  // Aprova o plano: aplica o label spec-wave:ready. Só disponível na aba Plan com
  // conteúdo salvo (plan.md existe).
  const onApprove = async () => {
    setError(null);
    setApproving(true);
    try {
      applyView(await approvePlan(repoId, featureNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  };

  // ----- Render -----

  // Estado vazio: ainda não há artefato → oferecer a criação (label + Action).
  if (!hasContent) {
    const busy = phase.t === 'creating' || phase.t === 'waiting';
    return (
      <div className="artifact artifact--empty">
        <p className="artifact__hint">
          {phase.t === 'waiting'
            ? `Aguardando a GitHub Action gerar o ${label}…`
            : `Esta feature ainda não tem ${label}.`}
        </p>
        <div className="artifact__actions">
          <button type="button" className="btn btn--accent" onClick={onCreate} disabled={busy}>
            {phase.t === 'creating'
              ? 'Criando…'
              : phase.t === 'waiting'
                ? 'Gerando…'
                : `Create ${label}`}
          </button>
          {phase.t === 'waiting' && (
            <button
              type="button"
              className="btn"
              onClick={() => fetchWorkItem(repoId, 'feature', featureNumber).then(applyView)}
            >
              Atualizar
            </button>
          )}
        </div>
        <EditError message={error} />
      </div>
    );
  }

  // Há conteúdo. Em review, mostramos o rascunho; senão o conteúdo salvo.
  const showingDraft = phase.t === 'review';
  const shown = showingDraft ? (phase as { draft: string }).draft : content!;

  return (
    <div className="artifact">
      {phase.t === 'prompting' || phase.t === 'generating' ? (
        <div className="artifact__refine">
          <label className="artifact__label" htmlFor={`prompt-${kind}`}>
            {`O que ajustar no ${label}?`}
          </label>
          <textarea
            id={`prompt-${kind}`}
            className="edit-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Descreva o ajuste desejado no ${label}…`}
            rows={4}
            disabled={phase.t === 'generating'}
            autoFocus
          />
          <div className="edit-actions">
            <button
              type="button"
              className="edit-save"
              onClick={() => onGenerate(phase.t === 'prompting' ? phase.base : content!)}
              disabled={phase.t === 'generating' || prompt.trim().length === 0}
            >
              {phase.t === 'generating' ? 'Gerando…' : 'Gerar'}
            </button>
            <button
              type="button"
              className="edit-cancel"
              onClick={() => setPhase({ t: 'idle' })}
              disabled={phase.t === 'generating'}
            >
              Cancelar
            </button>
          </div>
          <EditError message={error} />
        </div>
      ) : (
        <div className="artifact__bar">
          {showingDraft ? (
            <>
              <span className="badge-mono">Rascunho — não salvo</span>
              <div className="artifact__actions">
                <button
                  type="button"
                  className="edit-save"
                  onClick={() => onSave((phase as { draft: string }).draft)}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setPhase({ t: 'prompting', base: (phase as { draft: string }).draft })
                  }
                >
                  Solicitar alteração
                </button>
                <button type="button" className="edit-cancel" onClick={() => setPhase({ t: 'idle' })}>
                  Descartar
                </button>
              </div>
            </>
          ) : (
            <div className="artifact__actions">
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => {
                  setPrompt('');
                  setPhase({ t: 'prompting', base: content! });
                }}
              >
                Solicitar alteração
              </button>
              {kind === 'plan' && (
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={onApprove}
                  disabled={approving}
                >
                  {approving ? 'Aprovando…' : 'Aprovar Plano'}
                </button>
              )}
            </div>
          )}
          <EditError message={error} />
        </div>
      )}

      <Mdx source={shown} />
    </div>
  );
}
