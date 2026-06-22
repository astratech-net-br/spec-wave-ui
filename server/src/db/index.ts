// Conexão Knex com SQLite (driver better-sqlite3). Todas as queries da app
// passam por aqui — o query builder do Knex parametriza os valores, prevenindo
// SQL injection (spec: "Queries SQL parametrizadas").

import fs from 'node:fs';
import path from 'node:path';
import knexFactory, { type Knex } from 'knex';
import { config } from '../config.ts';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// O better-sqlite3 não cria o diretório do arquivo — garantimos que exista.
fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

export const knexConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: { filename: config.databaseFile },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    loadExtensions: ['.ts'],
  },
};

export const db = knexFactory(knexConfig);

// Aplica migrações pendentes. Chamado no boot do servidor para garantir o
// schema antes de aceitar requisições.
export async function runMigrations(): Promise<void> {
  await db.migrate.latest();
}
