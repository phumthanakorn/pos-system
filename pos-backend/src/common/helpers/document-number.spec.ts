import { describe, expect, it } from 'vitest';
import { bangkokDay, bangkokYear, documentPrefix, formatOrderNumber, formatReceiptNumber } from './document-number.js';

describe('formatOrderNumber', () => {
  it('builds PREFIX + date + dash + 5-digit sequence', () => {
    expect(formatOrderNumber('nm', '20261013', 1)).toBe('NM20261013-00001');
    expect(formatOrderNumber('NM', '20261013', 128)).toBe('NM20261013-00128');
  });

  it('keeps counting past 5 digits without truncating', () => {
    expect(formatOrderNumber('NM', '20261013', 123456)).toBe('NM20261013-123456');
  });

  it('falls back to ORD when the shop has no usable abbreviation', () => {
    expect(formatOrderNumber(null, '20261013', 1)).toBe('ORD20261013-00001');
    expect(formatOrderNumber('', '20261013', 1)).toBe('ORD20261013-00001');
    expect(formatOrderNumber('  ', '20261013', 1)).toBe('ORD20261013-00001');
  });
});

describe('documentPrefix', () => {
  it('uppercases and strips anything that is not A-Z or 0-9', () => {
    expect(documentPrefix('n-m')).toBe('NM');
    expect(documentPrefix('นม')).toBe('ORD');
    expect(documentPrefix('a1')).toBe('A1');
  });
});

describe('bangkokDay', () => {
  it('uses Thai local time, not UTC', () => {
    // 2026-10-13 18:00 UTC = 2026-10-14 01:00 in Bangkok (UTC+7)
    expect(bangkokDay(new Date('2026-10-13T18:00:00Z'))).toBe('20261014');
    // 2026-10-13 16:59 UTC = 23:59 Bangkok, still the 13th
    expect(bangkokDay(new Date('2026-10-13T16:59:00Z'))).toBe('20261013');
  });

  it('rolls over exactly at Bangkok midnight', () => {
    expect(bangkokDay(new Date('2026-10-13T16:59:59Z'))).toBe('20261013');
    expect(bangkokDay(new Date('2026-10-13T17:00:00Z'))).toBe('20261014');
  });
});

describe('formatReceiptNumber', () => {
  it('builds PREFIX-YEAR-6 digit sequence', () => {
    expect(formatReceiptNumber('nm', '2026', 1)).toBe('NM-2026-000001');
    expect(formatReceiptNumber(null, '2026', 42)).toBe('ORD-2026-000042');
  });
});

describe('bangkokYear', () => {
  it('rolls the year at Bangkok midnight on 1 January', () => {
    expect(bangkokYear(new Date('2026-12-31T16:59:59Z'))).toBe('2026');
    expect(bangkokYear(new Date('2026-12-31T17:00:00Z'))).toBe('2027');
  });
});
