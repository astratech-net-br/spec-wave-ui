// Adiciona a config do Projects v2 por repositório — necessária para mover a
// Feature de etapa (📋 Spec / 📋 Plan) a partir da UI. Coletada no cadastro do
// repositório (introspecção do projeto) e persistida aqui.
//
//   project_url      → URL do Projects v2 (exibida/reutilizável)
//   project_id       → node id do ProjectV2
//   project_number   → número do projeto
//   etapa_field_id   → id do campo single-select de etapa
//   stage_options    → JSON { "<nome da opção>": "<optionId>" }

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('repositories', (table) => {
    table.text('project_url').nullable();
    table.text('project_id').nullable();
    table.integer('project_number').nullable();
    table.text('etapa_field_id').nullable();
    table.text('stage_options').nullable(); // JSON serializado
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('repositories', (table) => {
    table.dropColumn('project_url');
    table.dropColumn('project_id');
    table.dropColumn('project_number');
    table.dropColumn('etapa_field_id');
    table.dropColumn('stage_options');
  });
}
