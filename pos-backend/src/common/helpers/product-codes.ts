import { documentPrefix } from './document-number.js';

// EAN-13 check digit: weights 1,3,1,3... over the first 12 digits (left to right).
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) {
    throw new Error('EAN-13 needs exactly 12 digits');
  }
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(first12.charAt(index)) * (index % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

// Prefix 20 is in the GS1 range reserved for in-store/restricted circulation, so these never
// collide with real manufacturer barcodes.
export function buildInternalBarcode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1 || seq > 9_999_999_999) {
    throw new Error('barcode sequence out of range');
  }
  const first12 = `20${String(seq).padStart(10, '0')}`;
  return `${first12}${ean13CheckDigit(first12)}`;
}

export function formatSku(logoAbbr: string | null | undefined, seq: number): string {
  return `${documentPrefix(logoAbbr)}-${String(seq).padStart(6, '0')}`;
}
