// Rotas de conta (fase 3): billing, time/convites e configurações do tenant.
// Todas autenticadas; as de mutação sensível exigem owner (requireOwner).

import { Router, type NextFunction, type Request, type Response } from 'express';
import { HttpError } from '../lib/errors.ts';
import { requireOwner, tenantOf } from '../middleware/auth.ts';
import { usageSummary } from '../services/quotaService.ts';
import { createCheckoutSession, createPortalSession } from '../services/billingService.ts';
import { acceptInvite, createInvite, teamOverview } from '../services/teamService.ts';
import {
  hasTenantOpenrouterKey,
  setTenantOpenrouterKey,
} from '../services/settingsService.ts';
import { getUserPref, putUserPref } from '../db/dynamo.ts';

export const accountRoutes = Router();

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}

// ---------- Identidade (workspace do Developer) ----------
// A sessão autentica um usuário Cognito; o "eu" das views do dev é um login do
// GitHub, vinculado uma vez por usuário (persistido no tenant). O acesso ao
// GitHub é via installation token do App (não há OAuth de usuário), então o
// login não é descoberto automaticamente — o dev escolhe o seu na primeira vez.

// GET /api/me → { login, email }
accountRoutes.get('/me', (req: Request, res: Response, next: NextFunction) => {
  const tenant = tenantOf(req);
  getUserPref(tenant.tenantId, tenant.sub)
    .then((pref) => res.json({ login: pref?.githubLogin ?? null, email: tenant.email ?? null }))
    .catch((err) => handleError(err, res, next));
});

// PUT /api/me { login } → grava o login do GitHub do usuário ('' ou null limpa).
accountRoutes.put('/me', (req: Request, res: Response, next: NextFunction) => {
  const tenant = tenantOf(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw = body.login;
  if (raw !== null && typeof raw !== 'string') {
    res.status(400).json({ error: 'login deve ser um texto (vazio para limpar).' });
    return;
  }
  const login = typeof raw === 'string' ? raw.trim() : '';
  if (login && !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(login)) {
    res.status(400).json({ error: `Login do GitHub inválido: "${login}".` });
    return;
  }
  putUserPref({
    tenantId: tenant.tenantId,
    sub: tenant.sub,
    githubLogin: login || null,
    updatedAt: new Date().toISOString(),
  })
    .then(() => res.json({ login: login || null }))
    .catch((err) => handleError(err, res, next));
});

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
