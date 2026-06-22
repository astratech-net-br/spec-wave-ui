// Servidor Express do Dashboard (Story #3).
//
// Middlewares de segurança (spec, seção Segurança):
//   - helmet           → headers seguros
//   - cors restrito    → só a origem do frontend
//   - rate limiting    → mitiga abuso
// O schema é garantido no boot (migrate) e populado em dev (seed).

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.ts';
import { logger } from './lib/logger.ts';
import { db, runMigrations } from './db/index.ts';
import { repositoryRoutes } from './routes/repositoryRoutes.ts';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(rateLimit({ windowMs: 60_000, limit: 120 })); // 120 req/min por IP

  // Health check (spec: endpoint /status).
  app.get('/status', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api', repositoryRoutes);

  // 404 para rotas não mapeadas.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Handler de erros — responde 500 e loga o stack.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err instanceof Error ? err : String(err));
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function bootstrap() {
  await runMigrations();
  // Seed básico em dev (idempotente — não sobrescreve dados existentes).
  await db.seed.run();

  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`API ouvindo em http://localhost:${config.port} (CORS: ${config.corsOrigin})`);
  });
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});
