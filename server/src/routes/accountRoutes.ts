// Rotas de conta (fase 3): billing, time/convites e configurações do tenant.
// Todas autenticadas; as de mutação sensível exigem owner (requireOwner).

import { Router, type NextFunction, type Request, type Response } from 'express';
import { HttpError } from '../lib/errors.ts';
import { requireOwner, tenantOf } from '../middleware/auth.ts';
import { getTenant } from '../db/dynamo.ts';
import { usageSummary } from '../services/quotaService.ts';
import { createCheckoutSession, createPortalSession } from '../services/billingService.ts';
import { acceptInvite, createInvite, teamOverview } from '../services/teamService.ts';
import {
  hasTenantOpenrouterKey,
  setTenantOpenrouterKey,
} from '../services/settingsService.ts';

export const accountRoutes = Router();

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}

// ---------- Billing ----------

// GET /api/billing → plano + uso do mês (tela de Configurações).
accountRoutes.get('/billing', (req: Request, res: Response, next: NextFunction) => {
  const tenant = tenantOf(req);
  Promise.all([usageSummary(tenant.tenantId), hasTenantOpenrouterKey(tenant.tenantId)])
    .then(([usage, ownOpenrouterKey]) => res.json({ ...usage, ownOpenrouterKey, role: tenant.role }))
    .catch((err) => handleError(err, res, next));
});

// POST /api/billing/checkout → URL do Stripe Checkout (upgrade → pro).
accountRoutes.post(
  '/billing/checkout',
  requireOwner,
  (req: Request, res: Response, next: NextFunction) => {
    const tenant = tenantOf(req);
    createCheckoutSession(tenant.tenantId, tenant.email)
      .then((url) => res.json({ url }))
      .catch((err) => handleError(err, res, next));
  },
);

// POST /api/billing/portal → URL do Customer Portal (gerenciar/cancelar).
accountRoutes.post(
  '/billing/portal',
  requireOwner,
  (req: Request, res: Response, next: NextFunction) => {
    createPortalSession(tenantOf(req).tenantId)
      .then((url) => res.json({ url }))
      .catch((err) => handleError(err, res, next));
  },
);

// ---------- Tenant ativo ----------

// GET /api/tenant/active → dados do tenant ativo na sessão (menu de perfil,
// Story #70). O tenant vem do claim custom:tenant_id via middleware; o nome é
// lido do DynamoDB. Tenant sem registro META → nome vazio (o client mostra o
// placeholder de CE002).
accountRoutes.get('/tenant/active', (req: Request, res: Response, next: NextFunction) => {
  const { tenantId } = tenantOf(req);
  getTenant(tenantId)
    .then((tenant) => res.json({ id: tenantId, name: tenant?.name ?? '' }))
    .catch((err) => handleError(err, res, next));
});

// ---------- Time / convites ----------

// GET /api/team → membros + convites pendentes.
accountRoutes.get('/team', (req: Request, res: Response, next: NextFunction) => {
  teamOverview(tenantOf(req).tenantId)
    .then((team) => res.json(team))
    .catch((err) => handleError(err, res, next));
});

// POST /api/team/invites { email, role? } → cria convite (owner).
accountRoutes.post(
  '/team/invites',
  requireOwner,
  (req: Request, res: Response, next: NextFunction) => {
    const tenant = tenantOf(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) {
      res.status(400).json({ error: 'Informe um email válido.' });
      return;
    }
    const role = body.role === 'owner' ? 'owner' : 'member';
    createInvite(tenant.tenantId, tenant.sub, body.email, role)
      .then((invite) => res.status(201).json({ code: invite.code, email: invite.email, role }))
      .catch((err) => handleError(err, res, next));
  },
);

// POST /api/team/invites/accept { code } → entra no tenant convidante.
// Aberto a qualquer autenticado (o convidado ainda pertence ao tenant do signup).
accountRoutes.post(
  '/team/invites/accept',
  (req: Request, res: Response, next: NextFunction) => {
    const tenant = tenantOf(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.code !== 'string' || body.code.length === 0) {
      res.status(400).json({ error: 'Informe o código do convite.' });
      return;
    }
    acceptInvite(body.code, { sub: tenant.sub, email: tenant.email })
      .then((r) => res.json(r))
      .catch((err) => handleError(err, res, next));
  },
);

// ---------- Configurações ----------

// PUT /api/settings/openrouter-key { key } → chave própria do tenant ('' remove).
accountRoutes.put(
  '/settings/openrouter-key',
  requireOwner,
  (req: Request, res: Response, next: NextFunction) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.key !== 'string') {
      res.status(400).json({ error: 'key deve ser um texto (vazio para remover).' });
      return;
    }
    setTenantOpenrouterKey(tenantOf(req).tenantId, body.key.trim())
      .then(() => res.json({ ok: true }))
      .catch((err) => handleError(err, res, next));
  },
);
