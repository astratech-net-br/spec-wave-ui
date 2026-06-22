// Configuração central — lida exclusivamente de variáveis de ambiente, com
// defaults seguros para desenvolvimento. Nenhum segredo é hard-coded (spec:
// "Dados sensíveis devem vir de variáveis ambiente").
//
// Para carregar um arquivo .env, rode com `node --env-file=.env` (ou
// `tsx --env-file=.env`). Veja .env.example.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Caminho absoluto do arquivo SQLite, resolvido a partir da raiz do pacote.
  databaseFile: path.resolve(packageRoot, process.env.DATABASE_FILE ?? './data/database.db'),
  packageRoot,
  // Limite de itens retornados pela listagem (spec: até 50 por página).
  pageLimit: 50,
};
