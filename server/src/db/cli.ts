// CLI mínima para migrações e seeds fora do boot do servidor:
//   npm run migrate   → aplica migrações pendentes
//   npm run seed      → roda os seeds

import { db } from './index.ts';
import { logger } from '../lib/logger.ts';

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'migrate') {
    const [batch, log] = await db.migrate.latest();
    logger.info(log.length ? `Migrações aplicadas (batch ${batch}): ${log.join(', ')}` : 'Nada a migrar.');
  } else if (cmd === 'seed') {
    await db.seed.run();
    logger.info('Seeds aplicados.');
  } else {
    logger.error(`Comando desconhecido: ${cmd ?? '(vazio)'}. Use "migrate" ou "seed".`);
    process.exitCode = 1;
  }
  await db.destroy();
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
