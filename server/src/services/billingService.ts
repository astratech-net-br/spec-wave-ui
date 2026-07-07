// Billing via Stripe (fase 3), sem SDK — REST com fetch (form-encoded), no
// padrão do restante do backend. Chave secreta via Secrets Manager.
//
// Fluxo: Checkout Session (upgrade → pro) e Customer Portal (gerenciar/cancelar).
// O webhook (webhookStripe.ts) é quem efetiva o plano no tenant — o redirect de
// sucesso do checkout NÃO muda plano (nunca confiar no browser).

import { config } from '../config.ts';
import { resolveSecret } from '../lib/secrets.ts';
import { HttpError, NotConfiguredError, UpstreamError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import {
  getStripeCustomerTenant,
  getTenant,
  putStripeCustomer,
  updateTenantFields,
} from '../db/dynamo.ts';

const API = 'https://api.stripe.com/v1';

async function stripeRequest(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const key = await resolveSecret(config.stripe.secretKey, config.stripe.secretArn);
  if (!key) throw new NotConfiguredError('Billing (Stripe) não configurado no servidor.');

  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new UpstreamError(`Stripe ${res.status}: ${json.error?.message ?? 'erro desconhecido'}`);
  }
  return json;
}

// Checkout de upgrade para o plano pro. client_reference_id + metadata carregam
// o tenantId até o webhook.
export async function createCheckoutSession(tenantId: string, email?: string): Promise<string> {
  if (!config.stripe.priceIdPro) {
    throw new NotConfiguredError('STRIPE_PRICE_PRO não configurado no servidor.');
  }
  const session = await stripeRequest('/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': config.stripe.priceIdPro,
    'line_items[0][quantity]': '1',
    client_reference_id: tenantId,
    'subscription_data[metadata][tenant_id]': tenantId,
    ...(email ? { customer_email: email } : {}),
    success_url: `${config.appUrl}#/settings`,
    cancel_url: `${config.appUrl}#/settings`,
  });
  const url = session.url;
  if (typeof url !== 'string') throw new UpstreamError('Stripe não devolveu a URL do checkout.');
  return url;
}

// Customer Portal (gerenciar assinatura/cancelar). Exige customer já criado
// (primeiro checkout concluído).
export async function createPortalSession(tenantId: string): Promise<string> {
  const tenant = await getTenant(tenantId);
  if (!tenant?.stripeCustomerId) {
    throw new HttpError(409, 'Nenhuma assinatura ativa — faça o upgrade primeiro.');
  }
  const session = await stripeRequest('/billing_portal/sessions', {
    customer: tenant.stripeCustomerId,
    return_url: `${config.appUrl}#/settings`,
  });
  const url = session.url;
  if (typeof url !== 'string') throw new UpstreamError('Stripe não devolveu a URL do portal.');
  return url;
}

// ---------- Webhook ----------

// Verifica a assinatura do webhook (header Stripe-Signature: t=...,v1=...):
// HMAC SHA-256 do `${t}.${corpo cru}` com o webhook secret; tolerância 5 min.
export async function verifyStripeSignature(
  rawBody: string | Buffer,
  header: string | undefined,
): Promise<boolean> {
  const secret = await resolveSecret(config.stripe.webhookSecret, config.stripe.webhookSecretArn);
  if (!secret || !header) return false;

  const parts = new Map(
    header.split(',').map((p) => {
      const [k, ...v] = p.split('=');
      return [k.trim(), v.join('=')] as const;
    }),
  );
  const t = parts.get('t');
  const v1 = parts.get('v1');
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // replay

  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const expected = createHmac('sha256', secret)
    .update(`${t}.${rawBody.toString('utf8')}`)
    .digest('hex');
  if (expected.length !== v1.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
}

interface StripeEvent {
  type?: string;
  data?: {
    object?: {
      customer?: string;
      client_reference_id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
}

// Statuses do Stripe que mantêm o plano pago ativo.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  const obj = event.data?.object;
  if (!obj) return;

  switch (event.type) {
    case 'checkout.session.completed': {
      const tenantId = obj.client_reference_id;
      const customerId = obj.customer;
      if (!tenantId || !customerId) return;
      await putStripeCustomer(customerId, tenantId);
      await updateTenantFields(tenantId, {
        plan: 'pro',
        stripeCustomerId: customerId,
        subscriptionStatus: 'active',
      });
      logger.info(`Tenant ${tenantId} → plano pro (checkout concluído).`);
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const customerId = obj.customer;
      // metadata.tenant_id vem do subscription_data do checkout; fallback no mapa.
      const tenantId =
        obj.metadata?.tenant_id ?? (customerId ? await getStripeCustomerTenant(customerId) : null);
      if (!tenantId) {
        logger.warn(`Evento Stripe ${event.type} sem tenant resolvível (customer ${customerId}).`);
        return;
      }
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (obj.status ?? '');
      await updateTenantFields(tenantId, {
        plan: ACTIVE_STATUSES.has(status) ? 'pro' : 'free',
        subscriptionStatus: status,
      });
      logger.info(`Tenant ${tenantId}: subscription ${status}.`);
      return;
    }
    default:
      // Evento não tratado — ok (só assinamos os relevantes no Stripe).
      return;
  }
}
