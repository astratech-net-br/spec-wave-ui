// Onboarding da instalação do GitHub App e sincronização via webhook.
//
// Fluxo: a UI pede uma install URL (nonce em STATE#, TTL 15 min) → o usuário
// instala o App no GitHub → o GitHub redireciona ao client (Setup URL) com
// installation_id + state → o client chama completeSetup (autenticado) → o
// vínculo INSTALLATION#<id> → tenant é gravado. O webhook installation.* é a
// fonte de verdade para mudanças posteriores (remoção do App etc.) e pode
// chegar ANTES do setup — nesse caso grava a instalação órfã (tenantId null)
// e o setup reconcilia.

import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { fetchInstallation } from '../github/appAuth.ts';
import {
  consumeState,
  getInstallation,
  markInstallationDeleted,
  putInstallation,
  putState,
} from '../db/dynamo.ts';
import { HttpError, NotConfiguredError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

const STATE_TTL_SECONDS = 15 * 60;

// Gera a URL de instalação do App com um nonce de state vinculado ao tenant.
export async function createInstallUrl(tenantId: string, userSub: string): Promise<string> {
  if (!config.github.appSlug) {
    throw new NotConfiguredError('GITHUB_APP_SLUG não configurado no servidor.');
  }
  const nonce = randomUUID();
  await putState({
    nonce,
    tenantId,
    userSub,
    ttl: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  });
  return `https://github.com/apps/${config.github.appSlug}/installations/new?state=${nonce}`;
}

// Conclui o setup: valida o nonce (uso único, TTL) e vincula a instalação ao
// tenant do usuário autenticado. Idempotente para re-execuções do mesmo tenant.
export async function completeSetup(
  tenantId: string,
  installationId: number,
  state: string,
): Promise<void> {
  const stored = await consumeState(state);
  if (!stored || stored.tenantId !== tenantId) {
    throw new HttpError(403, 'State de instalação inválido ou expirado. Refaça a instalação.');
  }

  const existing = await getInstallation(installationId);
  if (existing?.tenantId && existing.tenantId !== tenantId) {
    // Instalação já pertence a outro tenant — nunca re-vincular silenciosamente.
    throw new HttpError(409, 'Essa instalação do GitHub App já está vinculada a outra conta.');
  }

  const info = await fetchInstallation(installationId);
  if (!info) {
    throw new HttpError(404, `Instalação ${installationId} não encontrada no GitHub.`);
  }

  await putInstallation({
    installationId,
    tenantId,
    accountLogin: info.accountLogin,
    status: 'active',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

// Eventos installation.* do webhook. Payload mínimo tipado localmente.
interface InstallationEvent {
  action?: string;
  installation?: { id?: number; account?: { login?: string } };
}

export async function handleInstallationEvent(payload: InstallationEvent): Promise<void> {
  const id = payload.installation?.id;
  if (!id) return;

  if (payload.action === 'deleted') {
    await markInstallationDeleted(id);
    logger.info(`Instalação ${id} removida no GitHub — marcada como deleted.`);
    return;
  }

  if (payload.action === 'created') {
    const existing = await getInstallation(id);
    if (existing) return; // setup já vinculou (ou re-entrega do webhook)
    // Webhook chegou antes do setup: grava órfã; completeSetup reconcilia.
    await putInstallation({
      installationId: id,
      tenantId: null,
      accountLogin: payload.installation?.account?.login ?? '',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    logger.info(`Instalação ${id} criada sem tenant (aguardando setup).`);
  }
}
