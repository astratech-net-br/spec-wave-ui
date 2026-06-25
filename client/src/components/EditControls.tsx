// Primitivos de edição inline compartilhados por Hero (título) e Description
// (descrição): o botão-lápis que abre a edição, o par Salvar/Cancelar e a
// mensagem de erro. Mantém o visual e o comportamento consistentes nos dois.

import type { InlineEdit } from '../hooks/useInlineEdit';

export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="edit-btn" onClick={onClick} aria-label={label} title={label}>
      ✎
    </button>
  );
}

export function EditActions({ edit, canSave = true }: { edit: InlineEdit; canSave?: boolean }) {
  return (
    <div className="edit-actions">
      <button
        type="button"
        className="edit-save"
        onClick={edit.save}
        disabled={edit.saving || !canSave}
      >
        {edit.saving ? 'Salvando…' : 'Salvar'}
      </button>
      <button type="button" className="edit-cancel" onClick={edit.cancel} disabled={edit.saving}>
        Cancelar
      </button>
    </div>
  );
}

export function EditError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="edit-error" role="alert">
      {message}
    </p>
  );
}
