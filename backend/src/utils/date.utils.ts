/**
 * PRATYAKSH — Date Utilities
 *
 * Centralises date parsing, formatting, and comparison logic.
 * All schedule dates are stored as plain JS Date objects in UTC midnight.
 */

/**
 * Attempt to parse a date string from various common formats used in
 * infrastructure schedule spreadsheets.
 *
 * Supported patterns (examples):
 *   "01-Jun-2026", "01-Jun", "01 Jun 2026", "01 Jun",
 *   "2026-06-01", "2026/06/01", "01/06/2026", "June 1", "1 June 2026"
 *
 * When year is omitted, defaults to the current year.
 */
export function parseScheduleDate(raw: string, defaultYear = new Date().getFullYear()): Date | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Excel serial number (numeric string)
  if (/^\d{5}$/.test(trimmed)) {
    return excelSerialToDate(parseInt(trimmed, 10));
  }

  const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  // "DD-Mon-YYYY" or "DD-Mon" or "DD Mon YYYY" or "DD Mon"
  const dmy = trimmed.match(
    /^(\d{1,2})[\s\-\/]([a-zA-Z]+)[\s\-\/]?(\d{4})?$/
  );
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const monthKey = dmy[2].toLowerCase().substring(0, 3);
    const month = MONTHS[monthKey] ?? MONTHS[dmy[2].toLowerCase()];
    const year = dmy[3] ? parseInt(dmy[3], 10) : defaultYear;
    if (month !== undefined && day >= 1 && day <= 31) {
      return utcDate(year, month, day);
    }
  }

  // "Mon DD YYYY" or "Month DD, YYYY"
  const mdy = trimmed.match(
    /^([a-zA-Z]+)[\s,]+(\d{1,2})(?:[\s,]+(\d{4}))?$/
  );
  if (mdy) {
    const monthKey = mdy[1].toLowerCase().substring(0, 3);
    const month = MONTHS[monthKey] ?? MONTHS[mdy[1].toLowerCase()];
    const day = parseInt(mdy[2], 10);
    const year = mdy[3] ? parseInt(mdy[3], 10) : defaultYear;
    if (month !== undefined && day >= 1 && day <= 31) {
      return utcDate(year, month, day);
    }
  }

  // ISO: "YYYY-MM-DD" or "YYYY/MM/DD"
  const iso = trimmed.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (iso) {
    const year = parseInt(iso[1], 10);
    const month = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    return utcDate(year, month, day);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy2 = trimmed.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (dmy2) {
    const day = parseInt(dmy2[1], 10);
    const month = parseInt(dmy2[2], 10) - 1;
    const year = parseInt(dmy2[3], 10);
    return utcDate(year, month, day);
  }

  // Last resort: native Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return utcDate(d.getFullYear(), d.getMonth(), d.getDate());
  }

  return null;
}

/** Construct a UTC midnight Date for the given year/month/day. */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** Convert an Excel date serial number to a JS Date. */
export function excelSerialToDate(serial: number): Date {
  // Excel epoch: Jan 1, 1900 (with the erroneous leap year 1900 bug accounted for)
  const utcDays = serial - 25569; // 25569 = days between 1900-01-01 and 1970-01-01
  return new Date(utcDays * 86400 * 1000);
}

/** Format a Date as "DD-Mon-YYYY" for display purposes. */
export function formatDisplayDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getUTCDate().toString().padStart(2, '0');
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${mon}-${year}`;
}

/**
 * Returns true if date a is strictly before date b (comparing UTC midnight).
 */
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/**
 * Returns true if date a is on or after date b.
 */
export function isOnOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

export function parseCellDate(value: unknown, defaultYear?: number): Date | null {
  if (value instanceof Date) return utcDate(value.getFullYear(), value.getMonth(), value.getDate());
  if (typeof value === 'number') return excelSerialToDate(value);
  if (typeof value === 'string') return parseScheduleDate(value, defaultYear);
  return null;
}

/**
 * Extracts a stable YYYY-MM-DD logical date string from a Date object.
 * Assumes the Date object was created using utcDate (i.e. UTC midnight)
 * to represent a logical calendar date without timezone offset shifts.
 */
export function getLogicalDateString(d: Date): string {
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

