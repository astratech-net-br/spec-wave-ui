// Entrypoint da Lambda "webhook" (POST /webhooks/github — rota pública, SEM
// authorizer). Valida a assinatura HMAC sobre os bytes exatos do corpo antes de
// qualquer parse; assinatura inválida → 401. Trata eventos installation.* para
// manter o vínculo instalação → tenant sincronizado.
//
// Handler de API Gateway puro (sem Express): o corpo cru chega em event.body
// (base64 quando isBase64Encoded), exatamente o que a verificação HMAC exige.

import { verifyWebhookSignature } from './github/appAuth.ts';
import { handleInstallationEvent } from './services/installationService.ts';
import { logger } from './lib/logger.ts';

interface HttpApiEvent {
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface HttpApiResult {
  statusCode: number;
  body: string;
}

export async function handler(event: HttpApiEvent): Promise<HttpApiResult> {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64')
    : Buffer.from(event.body ?? '', 'utf8');

  const signature = event.headers?.['x-hub-signature-256'];
  if (!(await verifyWebhookSignature(rawBody, signature))) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Assinatura inválida.' }) };
  }

  const eventName = event.headers?.['x-github-event'] ?? '';
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corpo inválido.' }) };
  }

  try {
    if (eventName === 'installation' || eventName === 'installation_repositories') {
      await handleInstallationEvent(payload as Parameters<typeof handleInstallationEvent>[0]);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    logger.error(err instanceof Error ? err : String(err));
    // 500 → o GitHub reentrega; handlers são idempotentes.
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao processar o evento.' }) };
  }
}
