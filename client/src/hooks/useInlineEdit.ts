// Estado de edição inline reutilizado pelo título (Hero) e pela descrição
// (Description). Cuida do rascunho, do estado de salvando e do erro; o save
// chama o onSave do pai (que persiste no backend) e só sai do modo de edição
// em caso de sucesso — em erro, mantém o rascunho e expõe a mensagem.

import { useCallback, useState } from 'react';
import type { WorkItemPatch } from '@spec-flow/shared';

export interface InlineEdit {
  editing: boolean;
  draft: string;
  saving: boolean;
  error: string | null;
  begin: () => void;
  cancel: () => void;
  setDraft: (value: string) => void;
  save: () => void;
}

export function useInlineEdit(
  current: string,
  toPatch: (draft: string) => WorkItemPatch,
  onSave?: (patch: WorkItemPatch) => Promise<void>,
): InlineEdit {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = useCallback(() => {
    setDraft(current);
    setError(null);
    setEditing(true);
  }, [current]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const save = useCallback(() => {
    if (!onSave || saving) return;
    setSaving(true);
    setError(null);
    onSave(toPatch(draft))
      .then(() => setEditing(false))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSaving(false));
  }, [onSave, saving, toPatch, draft]);

  return { editing, draft, saving, error, begin, cancel, setDraft, save };
}
