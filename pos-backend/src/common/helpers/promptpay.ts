// PromptPay (Thai QR Payment, EMVCo merchant-presented) payload builder.

export type PromptPayKind = 'phone' | 'nationalId' | 'eWallet';

export function detectPromptPayKind(id: string): PromptPayKind | null {
  const digits = id.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return 'phone';
  if (/^\d{13}$/.test(digits)) return 'nationalId';
  if (/^\d{15}$/.test(digits)) return 'eWallet';
  return null;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) as required by the EMV QR spec
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const field = (tag: string, value: string) => `${tag}${value.length.toString().padStart(2, '0')}${value}`;

// amount in baht; omit it to produce a static QR where the payer types the amount
export function buildPromptPayPayload(id: string, amount?: number): string {
  const kind = detectPromptPayKind(id);
  if (!kind) {
    throw new Error('เลขพร้อมเพย์ไม่ถูกต้อง');
  }
  const digits = id.replace(/\D/g, '');
  // phone numbers are sent as 0066 + number without the leading 0
  const target = kind === 'phone' ? `0066${digits.slice(1)}` : digits;
  const subTag = kind === 'phone' ? '01' : kind === 'nationalId' ? '02' : '03';
  const hasAmount = amount !== undefined && amount > 0;

  const body =
    field('00', '01') +
    field('01', hasAmount ? '12' : '11') +
    field('29', field('00', 'A000000677010111') + field(subTag, target)) +
    field('58', 'TH') +
    field('53', '764') +
    (hasAmount ? field('54', amount.toFixed(2)) : '') +
    '6304';
  return body + crc16(body);
}
