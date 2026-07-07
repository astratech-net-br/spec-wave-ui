// App Express da API — usado pela Lambda (lambda.ts, via serverless-http) e
// pelo dev local (bootstrap abaixo).
//
// No SaaS, responsabilidades que saíram do Express:
//   - Autenticação/assinatura do JWT → JWT authorizer do API Gateway (Cognito)
//   - Rate limiting → throttling do API Gateway + WAF
//   - Estáticos do frontend → S3 + CloudFront (mesma origem: sem CORS)
// Aqui ficam: helmet, parsing JSON, contexto de tenant (claims) e as rotas /api.

import express from 'express';
import helmet from 'helmet';
import { config } from './config.ts';
import { logger } from './lib/logger.ts';
import { tenantContext } from './middleware/auth.ts';
import { repositoryRoutes } from './routes/repositoryRoutes.ts';
import { githubRoutes } from './routes/githubRoutes.ts';
import { accountRoutes } from './routes/accountRoutes.ts';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  // Health check (sem auth — usado por monitoração).
  app.get('/status', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Todas as rotas /api exigem tenant (claims do Cognito via API GW; em dev
  // local, DEV_TENANT_ID). O isolamento por tenant começa aqui.
  app.use('/api', tenantContext);
  app.use('/api', githubRoutes);
  app.use('/api', accountRoutes);
  app.use('/api', repositoryRoutes);

  // 404 JSON para /api.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Handler de erros — o controller já mapeou HttpError; aqui só o inesperado.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err instanceof Error ? err : String(err));
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Dev local: `npm run dev` sobe o Express direto (sem Lambda). Requer
// DEV_TENANT_ID e, para GitHub, as vars do App (ver .env.example).
if (process.env.LAMBDA_TASK_ROOT === undefined && process.argv[1]?.endsWith('index.ts')) {
  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`API ouvindo em http://localhost:${config.port}`);
    if (config.devTenantId) logger.info(`Dev tenant: ${config.devTenantId}`);
  });
}
