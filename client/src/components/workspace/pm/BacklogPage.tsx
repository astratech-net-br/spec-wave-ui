// Backlog do PM (RFC-003 §2): ideias ainda SEM prioridade. Filtros por tipo/
// área/label (client-side); ações: Create Idea (Feature sob um Épico — decisão
// de produto: ideia sempre tem Initiative pai), AI Brainstorm, Edit, Delete,
// Set Priority. Definir prioridade move o item para a Prioritization.

import { useMemo, useState } from 'react';
import type { Priority, SnapshotItem } from '@spec-flow/shared';
import { PRIORITIES } from '@spec-flow/shared';
import type { WorkspacePageProps } from '../types';
import { QueueList } from '../QueueList';
import { AiSummary } from '../AiSummary';
import { hrefForItem } from '../../../lib/router';
import { isBacklogLevel, isEpic, isOpen } from '../../../lib/workspaceSelectors';
import { deleteWorkItem, setPriority } from '../../../data/workspace';
import { createFeature } from '../../../data/workItem';

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'epic', label: 'Initiatives' },
  { value: 'feature', label: 'Features' },
  { value: 'story', label: 'Stories' },
];

function CreateIdeaForm({
  epics,
  onCreated,
  onCancel,
  repoId,
}: {
  repoId: string;
  epics: SnapshotItem[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [epicNumber, setEpicNumber] = useState(epics[0]?.number ?? 0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (!title.trim() || !epicNumber) return;
    setSaving(true);
    createFeature(repoId, epicNumber, {
      title: title.trim(),
      ...(description.trim() ? { descriptionMdx: description.trim() } : {}),
    })
      .then(onCreated)
      .catch((err: Error) => alert(err.message))
      .finally(() => setSaving(false));
  };

  if (epics.length === 0) {
    return (
      <p className="queue__empty">
        Crie primeiro uma Initiative (épico) no repositório — toda ideia nasce sob uma Initiative.
      </p>
    );
  }

  return (
    <div className="idea-form">
      <input
        type="text"
        className="idea-form__title"
        placeholder="Título da ideia…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select
        className="idea-form__epic"
        value={epicNumber}
        onChange={(e) => setEpicNumber(Number(e.target.value))}
        aria-label="Initiative pai"
      >
        {epics.map((epic) => (
          <option key={epic.number} value={epic.number}>
            #{epic.number} {epic.title}
          </option>
        ))}
      </select>
      <textarea
        className="idea-form__desc"
        placeholder="Descrição (opcional)…"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="idea-form__actions">
        <button type="button" className="btn btn--sm" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--sm btn--accent"
          onClick={submit}
          disabled={saving || !title.trim()}
        >
          {saving ? 'Criando…' : 'Criar ideia'}
        </button>
      </div>
    </div>
  );
}

export function BacklogPage({ repoId, snapshot, refresh }: WorkspacePageProps) {
  const [typeFilter, setTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [brainstorm, setBrainstorm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Só itens sem prioridade aparecem aqui (RFC-003 §2) — e apenas os que ainda
  // não entraram no pipeline (etapa Backlog ou fora do board): o Backlog é a
  // fila de IDEIAS pré-priorização, não de trabalho em execução.
  const backlog = useMemo(
    () =>
      snapshot.items.filter(
        (item) =>
          isBacklogLevel(item) &&
          isOpen(item) &&
          item.priority === null &&
          (item.stage === null || item.stage === 'Backlog'),
      ),
    [snapshot.items],
  );

  const areas = useMemo(
    () => [...new Set(backlog.map((i) => i.area).filter((a): a is string => a !== null))],
    [backlog],
  );

  const filtered = backlog.filter(
    (item) =>
      (!typeFilter || item.level === typeFilter) &&
      (!areaFilter || item.area === areaFilter) &&
      (!labelFilter ||
        item.labels.some((l) => l.toLowerCase().includes(labelFilter.trim().toLowerCase()))),
  );

  const epics = snapshot.items.filter((i) => isEpic(i) && isOpen(i));

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    fn()
      .then(() => refresh())
      .catch((err: Error) => alert(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ws-page">
      <div className="ws-toolbar">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tipo">
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} aria-label="Área">
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Filtrar por label…"
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}
          aria-label="Label"
        />
        <span className="ws-toolbar__spacer" />
        <button type="button" className="btn btn--sm" onClick={() => setBrainstorm((v) => !v)}>
          ✨ AI Brainstorm
        </button>
        <button
          type="button"
          className="btn btn--sm btn--accent"
          onClick={() => setCreating((v) => !v)}
        >
          + Create Idea
        </button>
      </div>

      {creating && (
        <CreateIdeaForm
          repoId={repoId}
          epics={epics}
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}

      {brainstorm && (
        <AiSummary
          repoId={repoId}
          scope="brainstorm"
          title="AI Brainstorm"
          topicPlaceholder="Tema (opcional)…"
        />
      )}

      <QueueList
        repoId={repoId}
        items={filtered}
        empty="Backlog limpo — nenhuma ideia sem prioridade."
        meta={(item) => (
          <select
            className="queue__priosel"
            value=""
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                run(() => setPriority(repoId, item.level, item.number, e.target.value as Priority));
              }
            }}
            aria-label={`Prioridade de #${item.number}`}
          >
            <option value="">Set Priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        actions={(item) => [
          {
            label: 'Edit',
            href:
              item.level === 'epic' || item.level === 'feature' || item.level === 'story'
                ? hrefForItem(repoId, item.level, item.number)
                : item.url,
          },
          {
            label: 'Delete',
            disabled: busy,
            onClick: () => {
              if (confirm(`Fechar a issue #${item.number} "${item.title}"?`)) {
                run(() => deleteWorkItem(repoId, item.level, item.number));
              }
            },
          },
        ]}
      />
    </div>
  );
}
