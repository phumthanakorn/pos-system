import { describe, expect, it } from 'vitest';
import { buildPromptPayPayload, crc16, detectPromptPayKind } from './promptpay.js';

describe('promptpay', () => {
  it('computes the standard CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('detects the kind of id', () => {
    expect(detectPromptPayKind('081-234-5678')).toBe('phone');
    expect(detectPromptPayKind('1234567890123')).toBe('nationalId');
    expect(detectPromptPayKind('123456789012345')).toBe('eWallet');
    expect(detectPromptPayKind('12345')).toBeNull();
    expect(detectPromptPayKind('1812345678')).toBeNull();
  });

  it('builds a dynamic phone payload with amount', () => {
    const p = buildPromptPayPayload('0812345678', 100.5);
    expect(p.startsWith('00020101021229370016A000000677010111011300668123456785802TH5303764' + '5406100.50' + '6304')).toBe(true);
    // the last 4 characters are the CRC of everything before them
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });

  it('builds a static payload (no amount) with the 11 initiation method', () => {
    const p = buildPromptPayPayload('1234567890123');
    expect(p.startsWith('0002010102112937' + '0016A00000067701011102131234567890123')).toBe(true);
    expect(p).not.toContain('54');
  });

  it('rejects an invalid id', () => {
    expect(() => buildPromptPayPayload('abc', 10)).toThrow();
  });
});
