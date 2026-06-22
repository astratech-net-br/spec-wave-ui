// Backup do arquivo SQLite (spec: "Backup automático diário do arquivo
// database.db"). Copia para backups/database-<YYYY-MM-DD>.db.
//
// Para agendamento diário, adicione um cron job, por exemplo:
//   0 3 * * *  cd /caminho/server && npm run backup
// (roda todo dia às 03:00).

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.ts';
import { logger } from '../src/lib/logger.ts';

function todayStamp(): string {
  // YYYY-MM-DD em UTC.
  return new Date().toISOString().slice(0, 10);
}

function main() {
  if (!fs.existsSync(config.databaseFile)) {
    logger.warn(`Nada a fazer: banco não encontrado em ${config.databaseFile}`);
    return;
  }
  const backupDir = path.join(config.packageRoot, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, `database-${todayStamp()}.db`);
  fs.copyFileSync(config.databaseFile, dest);
  logger.info(`Backup gravado em ${dest}`);
}

main();
