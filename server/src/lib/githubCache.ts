// Cache ETag para GETs REST do GitHub (fase 3). Conditional requests com
// If-None-Match: resposta 304 NÃO consome rate limit da instalação — corta o
// custo do polling da UI. Cache em memória por container (LRU simples).
//
// Segurança: a chave inclui a URL completa (owner/repo). Uma instalação cobre
// um repo para exatamente um tenant (completeSetup rejeita re-vínculo), então
// não há como um tenant ler cache de repo de outro.

const MAX_ENTRIES = 500;

interface CacheEntry {
  etag: string;
  status: number;
  body: string;
}

const cache = new Map<string, CacheEntry>();

function remember(key: string, entry: CacheEntry): void {
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

// GET condicional: devolve { status, text } como um fetch normal, servindo do
// cache quando o GitHub responde 304.
export async function cachedGet(
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; ok: boolean; text: () => Promise<string> }> {
  const key = `${headers.Accept ?? ''} ${url}`;
  const cached = cache.get(key);

  const res = await fetch(url, {
    headers: { ...headers, ...(cached ? { 'If-None-Match': cached.etag } : {}) },
  });

  if (res.status === 304 && cached) {
    return {
      status: cached.status,
      ok: cached.status >= 200 && cached.status < 300,
      text: async () => cached.body,
    };
  }

  const body = await res.text();
  const etag = res.headers.get('etag');
  if (res.ok && etag) remember(key, { etag, status: res.status, body });

  return { status: res.status, ok: res.ok, text: async () => body };
}
