// Formatação de datas em pt-BR (ex.: "12 mai – 30 jun").

const MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function dateRange(startIso?: string | null, endIso?: string | null): string {
  const start = startIso ? fmt(startIso) : '';
  const end = endIso ? fmt(endIso) : '';
  if (start && end) return `${start} – ${end}`;
  return start || end || '—';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// Data + hora no formato pt-BR "dd/MM/yyyy HH:mm" (ex.: "12/05/2024 14:30"),
// no fuso local. Usado nos cards do Dashboard. ISO inválido → "—".
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
