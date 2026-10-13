import { describe, expect, it } from 'vitest';
import { fillDailySeries, parseReportRange, todayInBangkok } from './report-range.js';

describe('todayInBangkok', () => {
  it('uses Thai time, not UTC', () => {
    expect(todayInBangkok(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-14');
    expect(todayInBangkok(new Date('2026-10-13T16:59:00Z'))).toBe('2026-10-13');
  });
});

describe('parseReportRange', () => {
  it('defaults to today when nothing is given', () => {
    const r = parseReportRange(undefined, undefined, new Date('2026-10-13T05:00:00Z'));
    expect(r.from).toBe('2026-10-13');
    expect(r.to).toBe('2026-10-13');
    expect(r.days).toEqual(['2026-10-13']);
  });

  it('covers whole Bangkok days: start 00:00 +07, end is the next midnight +07', () => {
    const r = parseReportRange('2026-10-01', '2026-10-03');
    expect(r.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(r.endExclusive.toISOString()).toBe('2026-10-03T17:00:00.000Z');
    expect(r.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('puts a 00:30 Bangkok sale on the new day and excludes it from the previous one', () => {
    const sale = new Date('2026-10-13T17:30:00Z'); // 2026-10-14 00:30 Bangkok
    const day13 = parseReportRange('2026-10-13', '2026-10-13');
    const day14 = parseReportRange('2026-10-14', '2026-10-14');
    expect(sale >= day13.start && sale < day13.endExclusive).toBe(false);
    expect(sale >= day14.start && sale < day14.endExclusive).toBe(true);
  });

  it('handles month and year boundaries and leap days', () => {
    expect(parseReportRange('2026-12-30', '2027-01-02').days).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(parseReportRange('2028-02-28', '2028-03-01').days).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
  });

  it('uses a single given bound for both ends', () => {
    expect(parseReportRange('2026-10-05', undefined).days).toEqual(['2026-10-05']);
    expect(parseReportRange(undefined, '2026-10-05').days).toEqual(['2026-10-05']);
  });

  it('rejects malformed, impossible and reversed input', () => {
    expect(() => parseReportRange('13/10/2026', '2026-10-14')).toThrow();
    expect(() => parseReportRange('2026-02-30', '2026-03-01')).toThrow();
    expect(() => parseReportRange('2026-10-14', '2026-10-13')).toThrow();
    expect(() => parseReportRange('2026-10-01; DROP TABLE', '2026-10-02')).toThrow();
  });

  it('accepts 366 days but not 367', () => {
    expect(parseReportRange('2027-01-01', '2027-12-31').days).toHaveLength(365);
    expect(parseReportRange('2028-01-01', '2028-12-31').days).toHaveLength(366);
    expect(() => parseReportRange('2026-01-01', '2027-01-02')).toThrow();
  });
});

describe('fillDailySeries', () => {
  it('returns every day, with zeros for days without sales, keeping the real ones', () => {
    const out = fillDailySeries(['2026-10-01', '2026-10-02', '2026-10-03'], [{ day: '2026-10-02', total: 250, count: 3 }]);
    expect(out).toEqual([
      { day: '2026-10-01', total: 0, count: 0 },
      { day: '2026-10-02', total: 250, count: 3 },
      { day: '2026-10-03', total: 0, count: 0 },
    ]);
  });
});
