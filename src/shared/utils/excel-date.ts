export type ParsedDmyDate = {
  day: number;
  month: number;
  year: number;
  /** YYYY-MM-DD */
  isoDate: string;
  /** DD/MM/YYYY */
  display: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const makeParsed = (year: number, month: number, day: number): ParsedDmyDate => ({
  day,
  month,
  year,
  isoDate: `${year}-${pad2(month)}-${pad2(day)}`,
  display: `${pad2(day)}/${pad2(month)}/${year}`,
});

const isValidYmd = (year: number, month: number, day: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Parses a date coming from SheetJS cell values.
 *
 * Supported inputs:
 * - Excel date serial number (when reading with `cellDates: false`, default)
 * - JS Date object (when reading with `cellDates: true`)
 * - String in DD/MM/YYYY (user-entered text)
 */
export const parseExcelDmyDate = (value: unknown): ParsedDmyDate | null => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    if (!isValidYmd(year, month, day)) return null;
    return makeParsed(year, month, day);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const serial = Math.trunc(value);
    if (serial <= 0) return null;

    // Excel serial date to UTC date:
    // 25569 = days between 1899-12-30 and 1970-01-01
    const utcMs = Math.round((serial - 25569) * 86400 * 1000);
    const date = new Date(utcMs);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    if (!isValidYmd(year, month, day)) return null;
    return makeParsed(year, month, day);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidYmd(year, month, day)) return null;
    return makeParsed(year, month, day);
  }

  return null;
};

