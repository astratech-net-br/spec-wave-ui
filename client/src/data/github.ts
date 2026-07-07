// Onboarding do GitHub App: pede ao backend a URL de instalação (com nonce de
// state vinculado ao tenant) e redireciona o browser. O retorno do GitHub cai
// na raiz do app com ?installation_id&state — concluído em auth/bootstrap.ts.

import { apiFetch } from './apiFetch';

export async function startGitHubAppInstall(): Promise<void> {
  const res = await apiFetch('/api/github/install-url', { method: 'POST' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Falha ao iniciar a instalação (HTTP ${res.status}).`);
  }
  const { url } = (await res.json()) as { url: string };
  window.location.assign(url);
}
