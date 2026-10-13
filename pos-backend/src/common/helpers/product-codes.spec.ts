import { describe, expect, it } from 'vitest';
import { buildInternalBarcode, ean13CheckDigit, formatSku, isValidEan13 } from './product-codes.js';

describe('ean13CheckDigit', () => {
  it('matches real-world EAN-13 examples', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(ean13CheckDigit('590123412345')).toBe(7); // 5901234123457
    expect(ean13CheckDigit('978020137962')).toBe(4); // 9780201379624 (ISBN)
  });

  it('rejects input that is not 12 digits', () => {
    expect(() => ean13CheckDigit('123')).toThrow();
    expect(() => ean13CheckDigit('12345678901a')).toThrow();
  });
});

describe('isValidEan13', () => {
  it('accepts valid codes and rejects a wrong check digit or bad format', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
    expect(isValidEan13('400638133393')).toBe(false);
    expect(isValidEan13('abcdefghijklm')).toBe(false);
  });
});

describe('buildInternalBarcode', () => {
  it('builds a valid 13-digit EAN starting with the in-store prefix 20', () => {
    for (const seq of [1, 2, 99, 12345, 9_999_999_999]) {
      const code = buildInternalBarcode(seq);
      expect(code).toHaveLength(13);
      expect(code.startsWith('20')).toBe(true);
      expect(isValidEan13(code)).toBe(true);
    }
  });

  it('is unique per sequence number', () => {
    const codes = new Set(Array.from({ length: 2000 }, (_, i) => buildInternalBarcode(i + 1)));
    expect(codes.size).toBe(2000);
  });

  it('rejects out-of-range sequences', () => {
    expect(() => buildInternalBarcode(0)).toThrow();
    expect(() => buildInternalBarcode(1.5)).toThrow();
    expect(() => buildInternalBarcode(10_000_000_000)).toThrow();
  });
});

describe('formatSku', () => {
  it('uses the shop prefix and 6 digits', () => {
    expect(formatSku('nm', 1)).toBe('NM-000001');
    expect(formatSku(null, 25)).toBe('ORD-000025');
  });
});
