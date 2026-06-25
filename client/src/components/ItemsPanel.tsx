import { useState } from 'react';
import type { ChildItem, CreateFeatureRequest } from '@spec-flow/shared';
import { ItemCard } from './ItemCard';
import { NewFeatureForm } from './NewFeatureForm';

interface ItemsPanelProps {
  items: ChildItem[];
  label: string; // "Features" | "Stories" | "Tasks"
  repoId: number; // escopa os links de drill-down dos cards
  // Quando presente, habilita o "+ Adicionar" + form inline (hoje só Epic→Feature).
  // Ausente = painel somente leitura (Stories/Tasks ainda não têm criação pela UI).
  onCreate?: (input: CreateFeatureRequest) => Promise<void>;
}

export function ItemsPanel({ items, label, repoId, onCreate }: ItemsPanelProps) {
  const [adding, setAdding] = useState(false);

  // Só fecha o form em sucesso; o erro é tratado (e exibido) dentro do form.
  const handleSubmit = async (input: CreateFeatureRequest) => {
    await onCreate!(input);
    setAdding(false);
  };

  const addButton = (
    <button type="button" className="btn btn--accent" onClick={() => setAdding(true)}>
      + Adicionar
    </button>
  );

  return (
    <section aria-label={label}>
      <div className="features__head">
        <div className="features__head-left">
          <h2 className="h2">{label}</h2>
          <span className="count">{items.length}</span>
        </div>
        {onCreate && !adding && addButton}
      </div>

      {onCreate && adding && (
        <NewFeatureForm onSubmit={handleSubmit} onCancel={() => setAdding(false)} />
      )}

      {items.length === 0 ? (
        <div className="feature-empty">
          {`Nenhuma ${label.toLowerCase()} ainda`}
          {onCreate && !adding && addButton}
        </div>
      ) : (
        <div className="feature-list">
          {items.map((item, i) => (
            <ItemCard key={`${item.name}-${i}`} item={item} repoId={repoId} />
          ))}
        </div>
      )}
    </section>
  );
}
