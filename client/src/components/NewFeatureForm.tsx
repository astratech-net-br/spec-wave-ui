// Formulário inline de nova Feature, aberto a partir do painel de Features da
// Epic View. Coleta título (obrigatório), descrição e — opcionais — prioridade e
// área (que viram label da issue + campo do board). Ao salvar, delega ao
// `onSubmit`; em sucesso o pai recarrega o épico e desmonta este form, em erro a
// mensagem é exibida inline e o form permanece aberto para nova tentativa.

import { useState } from 'react';
import type { CreateFeatureRequest } from '@spec-flow/shared';

// Espelham os valores aceitos pelo backend (RFC-001).
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const AREAS = ['Frontend', 'Backend', 'Mobile', 'Infra', 'DevOps', 'Data'];

interface NewFeatureFormProps {
  onSubmit: (input: CreateFeatureRequest) => Promise<void>;
  onCancel: () => void;
}

export function NewFeatureForm({ onSubmit, onCancel }: NewFeatureFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || title.trim().length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        descriptionMdx: description.trim() || undefined,
        priority: priority || undefined,
        area: area || undefined,
      });
      // Sucesso: o pai troca a view (recarrega o épico) e desmonta este form.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false); // mantém o form aberto para nova tentativa
    }
  };

  return (
    <form className="new-feature" onSubmit={submit}>
      <label className="repo-form__field">
        <span className="repo-form__label">Título</span>
        <input
          type="text"
          className="repo-form__input"
          placeholder="Ex.: Exportar relatório em PDF"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </label>

      <label className="repo-form__field">
        <span className="repo-form__label">
          Descrição <span className="repo-form__optional">(opcional)</span>
        </span>
        <textarea
          className="repo-form__input new-feature__textarea"
          placeholder="O que esta feature entrega?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <div className="new-feature__row">
        <label className="repo-form__field">
          <span className="repo-form__label">
            Prioridade <span className="repo-form__optional">(opcional)</span>
          </span>
          <select
            className="repo-form__input"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">—</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="repo-form__field">
          <span className="repo-form__label">
            Área <span className="repo-form__optional">(opcional)</span>
          </span>
          <select className="repo-form__input" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">—</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="edit-error" role="alert">
          {error}
        </p>
      )}

      <div className="repo-form__actions">
        <button
          type="submit"
          className="btn btn--accent"
          disabled={saving || title.trim().length === 0}
        >
          {saving ? 'Criando…' : 'Criar feature'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
