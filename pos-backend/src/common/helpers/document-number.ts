const BANGKOK_TZ = 'Asia/Bangkok';
const FALLBACK_PREFIX = 'ORD';

// YYYYMMDD in Thai local time, so a sale at 00:30 Bangkok time belongs to the new day (UTC would not)
export function bangkokDay(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

export function documentPrefix(logoAbbr: string | null | undefined): string {
  const cleaned = (logoAbbr ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned || FALLBACK_PREFIX;
}

export function formatOrderNumber(logoAbbr: string | null | undefined, day: string, seq: number): string {
  return `${documentPrefix(logoAbbr)}${day}-${String(seq).padStart(5, '0')}`;
}

// Receipt/tax-invoice series: one continuous sequence per shop per calendar year (Bangkok time).
export function bangkokYear(date: Date): string {
  return bangkokDay(date).slice(0, 4);
}

export function formatReceiptNumber(logoAbbr: string | null | undefined, year: string, seq: number): string {
  return `${documentPrefix(logoAbbr)}-${year}-${String(seq).padStart(6, '0')}`;
}
