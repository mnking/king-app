import { z } from 'zod';

export type ExcelCellType = 'string' | 'number' | 'date' | 'boolean' | 'unknown';

export interface ExcelColumnMapping<T = unknown> {
  /** Key used in row object */
  key: string;
  /** UI label */
  label: string;
  /** 0-based column index in the sheet (mapping by index, per user decision) */
  colIndex: number;
  /** Optional hint for transforms/formatting */
  type?: ExcelCellType;
  /** Optional per-cell transform (per import type); if omitted, raw value is used */
  transform?: (value: unknown, ctx: { rowNumber: number; colIndex: number }) => T;
}

export interface ExcelTemplate {
  name: string;
  version: string;

  /** Number of header rows at top of sheet (1, 2, 3, ...). Defaults to dataStartRow - 1 */
  headerRowCount?: number;

  /** Row number (1-based) where data starts. Typically headerRowCount + 1 */
  dataStartRow: number;

  /** Optional row number (1-based) where data ends for validation */
  dataEndRow?: number;

  /** Optional number of rows to skip from the bottom of data rows */
  skipEndRows?: number;

  /** Columns used for mapping + preview */
  columns: ExcelColumnMapping[];

  maxRows: number;
  maxFileSizeMb: number;
  allowedExtensions: string[];
}

export interface CellValidationError {
  /** 1-based row number in Excel */
  rowNumber: number;
  /** 0-based column index */
  colIndex: number;
  /** Excel column letter: A, B, C... */
  colLetter: string;
  message: string;
  value: unknown;
}

export interface ParsedRow<T> {
  /** 1-based row number in Excel */
  rowNumber: number;
  /** Original sheet row array (AOA row) */
  raw: unknown[];
  /** Mapped object (by colIndex) */
  data: T;
}

export interface ExcelParseContext {
  file: File;
  sheetName: string;
  sheetNames: string[];
  /** header rows AOA, length = headerRowCount */
  headerRows: unknown[][];
  /** data rows AOA (starting at dataStartRow) */
  dataRows: unknown[][];
}

export interface ExcelParseResult<T> {
  rows: Array<ParsedRow<T>>;
  context: ExcelParseContext;
}

export type ExcelValidator<T> = (params: {
  rows: Array<ParsedRow<T>>;
  context: ExcelParseContext;
}) => CellValidationError[];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const MB_IN_BYTES = 1024 * 1024;

export function columnIndexToLetter(index: number): string {
  if (index < 0) throw new Error('Column index must be non-negative');

  let result = '';
  let current = index;

  do {
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return result;
}

// Optional helper for import types that still want Zod
export interface ZodValidationResult {
  success: boolean;
  message?: string;
}

export const createStringSchema = (required: boolean, maxLength?: number) => {
  let schema = z.string();
  if (maxLength) schema = schema.max(maxLength, `Maximum ${maxLength} characters`);
  return required ? schema.min(1, 'Required') : schema.optional();
};
