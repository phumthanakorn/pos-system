import { bangkokDay } from './document-number.js';

export const MAX_REPORT_DAYS = 366;

export interface ReportRange {
  from: string; // YYYY-MM-DD, Bangkok calendar day, inclusive
  to: string; // YYYY-MM-DD, inclusive
  start: Date; // first instant of `from` in Bangkok time
  endExclusive: Date; // first instant AFTER `to` in Bangkok time
  days: string[]; // every calendar day in the range, in order
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isRealDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function addDays(day: string, n: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function todayInBangkok(now: Date): string {
  const d = bangkokDay(now);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// Parses a user supplied day range. Thailand has no DST, so "+07:00" is always correct.
export function parseReportRange(from: string | undefined, to: string | undefined, now: Date = new Date()): ReportRange {
  const today = todayInBangkok(now);
  const fromDay = from ?? to ?? today;
  const toDay = to ?? from ?? today;

  if (!isRealDate(fromDay) || !isRealDate(toDay)) {
    throw new Error('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
  }
  if (fromDay > toDay) {
    throw new Error('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด');
  }
  const days: string[] = [];
  for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
    days.push(day);
    if (days.length > MAX_REPORT_DAYS) {
      throw new Error(`เลือกช่วงได้ไม่เกิน ${MAX_REPORT_DAYS} วัน`);
    }
  }
  return {
    from: fromDay,
    to: toDay,
    start: new Date(`${fromDay}T00:00:00+07:00`),
    endExclusive: new Date(`${addDays(toDay, 1)}T00:00:00+07:00`),
    days,
  };
}

// The database only returns days that had sales; the chart needs every day, with 0 for the quiet ones.
export function fillDailySeries(
  days: string[],
  rows: { day: string; total: number; count: number }[],
): { day: string; total: number; count: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return days.map((day) => byDay.get(day) ?? { day, total: 0, count: 0 });
}
