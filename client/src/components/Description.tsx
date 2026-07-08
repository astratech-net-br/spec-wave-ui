import { useState } from 'react';
import type { Level, WorkItemPatch, WorkItemView } from '@spec-flow/shared';
import { Mdx } from './Mdx';
import { EditButton, EditError, EditActions } from './EditControls';
import { ArtifactPanel } from './ArtifactPanel';
import { useInlineEdit } from '../hooks/useInlineEdit';

interface DescriptionProps {
  level: Level;
  repoId: string;
  number: number; // número da issue do item atual (Feature, p/ spec/plan)
  source: string; // Feature (corpo da issue)
  spec?: string | null; // spec.md
  plan?: string | null; // plan.md
  planApproved?: boolean; // true se label spec-wave:plan-approved presente
  onSave?: (patch: WorkItemPatch) => Promise<void>; // edita o corpo da issue (aba Feature)
  applyView: (view: WorkItemView) => void; // substitui a view do pai (create/save/poll)
}

type Tab = 'feature' | 'spec' | 'plan';

export function Description({
  level,
  repoId,
  number,
  source,
  spec,
  plan,
  planApproved,
  onSave,
  applyView,
}: DescriptionProps) {
  const [tab, setTab] = useState<Tab>('feature');
  const body = useInlineEdit(source, (draft) => ({ descriptionMdx: draft }), onSave);

  // Spec/Plan só existem para Features. Nas Features, as abas aparecem SEMPRE
  // (mesmo vazias) — o estado vazio oferece a criação do artefato.
  const isFeature = level === 'feature';
  const tabs: { id: Tab; label: string }[] = [{ id: 'feature', label: 'Feature' }];
  if (isFeature) {
    tabs.push({ id: 'spec', label: 'Spec' }, { id: 'plan', label: 'Plan' });
  }

  // Guarda contra aba ativa indisponível (ex.: trocou de item).
  const active = tabs.some((t) => t.id === tab) ? tab : 'feature';
  const showTabs = tabs.length > 1;

  // Só o corpo da Feature (= issue body) é editável; Spec/Plan têm seu próprio fluxo.
  const editingBody = active === 'feature' && body.editing;
  const canEdit = active === 'feature' && onSave != null;

  return (
    <section className="panel description">
      <div className="description__head">
        {showTabs ? (
          <div className="description__tabs" role="tablist" aria-label="Descrição">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active === t.id}
                className={`description__tab${active === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="h2">Descrição</h2>
        )}
        <span className="badge-mono">MDX</span>
        {canEdit && !editingBody && <EditButton label="Editar descrição" onClick={body.begin} />}
      </div>

      {active === 'feature' ? (
        editingBody ? (
          <div className="description__edit">
            <textarea
              className="edit-textarea"
              value={body.draft}
              onChange={(e) => body.setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') body.cancel();
              }}
              aria-label="Descrição (markdown)"
              rows={14}
              autoFocus
            />
            <EditActions edit={body} />
            <EditError message={body.error} />
          </div>
        ) : (
          <Mdx source={source} />
        )
      ) : (
        <ArtifactPanel
          kind={active === 'spec' ? 'spec' : 'plan'}
          content={active === 'spec' ? (spec ?? null) : (plan ?? null)}
          repoId={repoId}
          featureNumber={number}
          applyView={applyView}
          planApproved={planApproved}
        />
      )}
    </section>
  );
}
