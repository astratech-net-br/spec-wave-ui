// Validação de URLs de repositório. Regex padrão HTTP/HTTPS (spec: "Validação
// de URL no backend (regex padrão HTTP/HTTPS)"). Usado tanto na escrita
// (POST futuro / seed) quanto para sanitizar a leitura.

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isValidHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && URL_RE.test(value.trim());
}

// Id de repositório (ULID) vindo da rota — valida o formato antes de consultar
// o DynamoDB (evita chaves arbitrárias na PK/SK).
const REPO_ID_RE = /^[0-9A-Za-z_-]{1,64}$/;

export function isValidRepoId(value: unknown): value is string {
  return typeof value === 'string' && REPO_ID_RE.test(value);
}
