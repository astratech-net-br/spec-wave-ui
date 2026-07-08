// Entrypoint da Lambda "stripe-webhook" (POST /webhooks/stripe — rota pública,
// SEM authorizer). Valida a assinatura sobre os bytes exatos do corpo antes de
// qualquer parse; inválida → 401. É o ÚNICO caminho que muda o plano do tenant
// (o redirect de sucesso do checkout não é confiável).

import { handleStripeEvent, verifyStripeSignature } from './services/billingService.ts';
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

  const signature = event.headers?.['stripe-signature'];
  if (!(await verifyStripeSignature(rawBody, signature))) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Assinatura inválida.' }) };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corpo inválido.' }) };
  }

  try {
    await handleStripeEvent(payload as Parameters<typeof handleStripeEvent>[0]);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    logger.error(err instanceof Error ? err : String(err));
    // 500 → o Stripe reentrega; handlers são idempotentes.
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao processar o evento.' }) };
  }
}
