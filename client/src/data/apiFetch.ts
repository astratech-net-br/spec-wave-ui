// fetch autenticado da API: injeta o Authorization: Bearer <idToken> do Cognito
// em toda chamada /api. 401 (token ausente/expirado sem refresh) → volta ao
// login. Em dev local sem Cognito (authEnabled=false), passa direto — o backend
// usa DEV_TENANT_ID.

import { authEnabled, getIdToken, login } from '../auth/cognito';

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (authEnabled) {
    const token = await getIdToken();
    if (!token) {
      await login(); // redireciona; a Promise abaixo nunca resolve nesta página
      return new Promise<Response>(() => {});
    }
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && authEnabled) {
    await login();
    return new Promise<Response>(() => {});
  }
  return res;
}
