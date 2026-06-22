// Validação de URLs de repositório. Regex padrão HTTP/HTTPS (spec: "Validação
// de URL no backend (regex padrão HTTP/HTTPS)"). Usado tanto na escrita
// (POST futuro / seed) quanto para sanitizar a leitura.

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isValidHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && URL_RE.test(value.trim());
}
