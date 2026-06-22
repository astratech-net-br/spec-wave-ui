// Seed básico para desenvolvimento (spec: "Seed básico para desenvolvimento").
// Idempotente: só insere se a tabela estiver vazia.

import type { Knex } from 'knex';

const SAMPLE = [
  { name: 'spec-flow-ui', url: 'https://github.com/moacsjr/spec-flow-ui' },
  { name: 'epic-view', url: 'https://github.com/moacsjr/epic-view' },
  { name: 'spec-wave-cli', url: 'https://github.com/moacsjr/spec-wave' },
];

export async function seed(knex: Knex): Promise<void> {
  const [{ count }] = await knex('repositories').count<{ count: number }[]>('id as count');
  if (Number(count) > 0) return;
  await knex('repositories').insert(SAMPLE);
}
