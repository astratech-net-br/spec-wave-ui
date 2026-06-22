// Migração inicial — tabela `repositories` (spec, seção Banco de Dados).

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('repositories', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('url').notNullable().unique();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Índice por nome para acelerar buscas/ordenação futuras.
  await knex.schema.alterTable('repositories', (table) => {
    table.index('name', 'idx_repositories_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('repositories');
}
