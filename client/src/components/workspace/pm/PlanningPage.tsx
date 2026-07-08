// Planning do PM (RFC-003 §2): montar releases. Milestones contêm SOMENTE
// Stories (regra do RFC; o server rejeita outros níveis). Atribuir uma Story
// atualiza o campo Milestone da issue no GitHub — fonte de verdade.

import { useMemo, useState } from 'react';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { groupByMilestone, isOpen, isStory } from '../../../lib/workspaceSelectors';
import { createMilestone, setStoryMilestone, updateMilestone } from '../../../data/workspace';

function NewMilestoneForm({ repoId, onDone }: { repoId: string; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    setSaving(true);
    createMilestone(repoId, { title: title.trim(), dueOn: dueOn || undefined })
      .then(onDone)
      .catch((err: Error) => alert(err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="idea-form idea-form--inline">
      <input
        type="text"
        placeholder="Nome do milestone…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="date"
        value={dueOn}
        onChange={(e) => setDueOn(e.target.value)}
        aria-label="Data-alvo"
      />
      <button
        type="button"
        className="btn btn--sm btn--accent"
        onClick={submit}
        disabled={saving || !title.trim()}
      >
        {saving ? 'Criando…' : 'Create milestone'}
      </button>
    </div>
  );
}

export function PlanningPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const stories = useMemo(
    () => snapshot.items.filter((i) => isStory(i) && isOpen(i)),
    [snapshot.items],
  );
  const openMilestones = snapshot.milestones.filter((m) => m.state === 'open');
  const groups = groupByMilestone(
    stories,
    openMilestones.map((m) => ({ number: m.number, title: m.title })),
  );

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      <NewMilestoneForm repoId={repoId} onDone={refresh} />

      {groups.map((group) => {
        const milestone =
          group.milestoneNumber !== null
            ? snapshot.milestones.find((m) => m.number === group.milestoneNumber)
            : undefined;
        return (
          <section key={group.key} className="ws-section">
            <header className="ws-section__head">
              {renaming === group.milestoneNumber && group.milestoneNumber !== null ? (
                <span className="ws-section__rename">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    aria-label="Novo nome do milestone"
                  />
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    disabled={busy || !newTitle.trim()}
                    onClick={() =>
                      run(() =>
                        updateMilestone(repoId, group.milestoneNumber as number, {
                          title: newTitle.trim(),
                        }).then(() => setRenaming(null)),
                      )
                    }
                  >
                    Salvar
                  </button>
                  <button type="button" className="btn btn--sm" onClick={() => setRenaming(null)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <h3 className="ws-section__title">
                  {group.title} <span className="ws-section__count">{group.items.length}</span>
                  {milestone?.dueOn && (
                    <span className="ws-section__due">alvo {milestone.dueOn.slice(0, 10)}</span>
                  )}
                </h3>
              )}

              {group.milestoneNumber !== null && renaming !== group.milestoneNumber && (
                <span className="ws-section__tools">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      setRenaming(group.milestoneNumber);
                      setNewTitle(group.title);
                    }}
                  >
                    Renomear
                  </button>
                  <input
                    type="date"
                    defaultValue={milestone?.dueOn?.slice(0, 10) ?? ''}
                    disabled={busy}
                    onChange={(e) =>
                      run(() =>
                        updateMilestone(repoId, group.milestoneNumber as number, {
                          dueOn: e.target.value || null,
                        }),
                      )
                    }
                    aria-label={`Data-alvo de ${group.title}`}
                  />
                </span>
              )}
            </header>

            <QueueList
              repoId={repoId}
              items={group.items}
              empty={
                group.milestoneNumber === null
                  ? 'Todas as stories estão em milestones.'
                  : 'Nenhuma story neste milestone — atribua a partir de "Sem milestone".'
              }
              meta={(item) =>
                group.milestoneNumber === null ? (
                  <select
                    className="queue__priosel"
                    value=""
                    disabled={busy || openMilestones.length === 0}
                    onChange={(e) => {
                      if (e.target.value) {
                        run(() => setStoryMilestone(repoId, item.number, Number(e.target.value)));
                      }
                    }}
                    aria-label={`Milestone de #${item.number}`}
                  >
                    <option value="">Assign to…</option>
                    {openMilestones.map((m) => (
                      <option key={m.number} value={m.number}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                ) : null
              }
              actions={(item) =>
                group.milestoneNumber !== null
                  ? [
                      {
                        label: 'Remove',
                        disabled: busy,
                        onClick: () => run(() => setStoryMilestone(repoId, item.number, null)),
                      },
                    ]
                  : []
              }
            />
          </section>
        );
      })}
    </div>
  );
}
