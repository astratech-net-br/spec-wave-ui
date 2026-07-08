// Autenticação como GitHub App:
//   appJwt()               → JWT RS256 (10 min) assinado com a private key do App
//   installationToken(id)  → token de instalação (1 h), cacheado com margem de 5 min
//   findRepoInstallation() → instalação que cobre um owner/repo (valida onboarding)
//   fetchInstallation(id)  → metadados da instalação (accountLogin)
//   verifyWebhookSignature → HMAC SHA-256 do webhook (bytes exatos do corpo)
//
// A private key vive só no Secrets Manager (ou env em dev) — ver lib/secrets.ts.
// Nunca existe token global de repositório: cada tenant acessa o GitHub apenas
// através da SUA instalação do App.

import { createHmac, createPrivateKey, sign as cryptoSign, timingSafeEqual } from 'node:crypto';
import { config } from '../config.ts';
import { resolveSecret } from '../lib/secrets.ts';
import { NotConfiguredError, UpstreamError } from '../lib/errors.ts';

const API = 'https://api.github.com';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

// JWT RS256 do App (iss = appId, validade 10 min, iat com clock drift de 60 s).
export async function appJwt(): Promise<string> {
  const pem = await resolveSecret(config.github.privateKeyPem, config.github.privateKeySecretArn);
  if (!pem || !config.github.appId) {
    throw new NotConfiguredError(
      'GitHub App não configurado no servidor (GITHUB_APP_ID / private key).',
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: config.github.appId }),
  );
  const key = createPrivateKey(pem);
  const signature = cryptoSign('RSA-SHA256', Buffer.from(`${header}.${payload}`), key);
  return `${header}.${payload}.${signature.toString('base64url')}`;
}

async function ghApp(path: string, init?: RequestInit): Promise<Response> {
  const jwt = await appJwt();
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  });
}

// Cache de installation tokens por container (tokens duram 1 h; renovamos com
// margem de 5 min). Cold start apenas paga 1 round-trip extra ao GitHub.
const tokenCache = new Map<number, { token: string; expiresAt: number }>();

export async function installationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt - Date.now() > 5 * 60_000) return cached.token;

  const res = await ghApp(`/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new UpstreamError(
      `Falha ao obter token da instalação ${installationId}: GitHub ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { token: string; expires_at: string };
  tokenCache.set(installationId, {
    token: json.token,
    expiresAt: new Date(json.expires_at).getTime(),
  });
  return json.token;
}

export interface InstallationInfo {
  id: number;
  accountLogin: string;
}

// Instalação do App que cobre owner/repo — null se o App não está instalado lá.
// Usado no cadastro de repositório para validar que o tenant tem acesso.
export async function findRepoInstallation(
  owner: string,
  repo: string,
): Promise<InstallationInfo | null> {
  const res = await ghApp(`/repos/${owner}/${repo}/installation`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new UpstreamError(`Falha ao consultar instalação de ${owner}/${repo}: GitHub ${res.status}`);
  }
  const json = (await res.json()) as { id: number; account?: { login?: string } };
  return { id: json.id, accountLogin: json.account?.login ?? '' };
}

// Metadados de uma instalação pelo id (usado no setup do onboarding).
export async function fetchInstallation(installationId: number): Promise<InstallationInfo | null> {
  const res = await ghApp(`/app/installations/${installationId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new UpstreamError(`Falha ao consultar instalação ${installationId}: GitHub ${res.status}`);
  }
  const json = (await res.json()) as { id: number; account?: { login?: string } };
  return { id: json.id, accountLogin: json.account?.login ?? '' };
}

// Valida a assinatura HMAC SHA-256 do webhook (header x-hub-signature-256) sobre
// os bytes exatos do corpo. Comparação em tempo constante.
export async function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
): Promise<boolean> {
  const secret = await resolveSecret(config.github.webhookSecret, config.github.webhookSecretArn);
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
