import { useCallback, useState } from 'react';
import type { ExcelParseResult, ExcelTemplate, FileValidationResult } from '@/shared/schemas/excel-import';
import { MB_IN_BYTES } from '@/shared/schemas/excel-import';

export type WorkbookParseStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseExcelWorkbookParserOptions {
  template: ExcelTemplate;
}

interface UseExcelWorkbookParserReturn<T> {
  status: WorkbookParseStatus;
  error: string | null;

  file: File | null;
  sheetNames: string[];
  selectedSheet: string | null;

  loadFile: (file: File) => Promise<void>;
  selectSheet: (sheetName: string) => void;

  /** Parse currently selected sheet into AOA + mapped rows */
  parseSelectedSheet: () => Promise<ExcelParseResult<T> | null>;

  reset: () => void;
}

export function useExcelWorkbookParser<T extends Record<string, unknown>>(
  options: UseExcelWorkbookParserOptions,
): UseExcelWorkbookParserReturn<T> {
  const { template } = options;

  const [status, setStatus] = useState<WorkbookParseStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const validateFile = useCallback(
    (f: File): FileValidationResult => {
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
      if (!template.allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `Invalid file format. Allowed: ${template.allowedExtensions.join(', ')}`,
        };
      }

      if (f.size > template.maxFileSizeMb * MB_IN_BYTES) {
        return {
          valid: false,
          error: `File size exceeds ${template.maxFileSizeMb}MB`,
        };
      }

      return { valid: true };
    },
    [template.allowedExtensions, template.maxFileSizeMb],
  );

  const loadFile = useCallback(
    async (f: File) => {
      setStatus('loading');
      setError(null);

      const fileValidation = validateFile(f);
      if (!fileValidation.valid) {
        setStatus('error');
        setError(fileValidation.error || 'Invalid file');
        return;
      }

      try {
        const XLSX = await import('xlsx');

        const bytes = await f.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: 'array' });

        const names = workbook.SheetNames || [];
        if (names.length === 0) throw new Error('Excel file has no sheets');

        setFile(f);
        setSheetNames(names);
        setSelectedSheet(names[0] || null);
        setStatus('ready');
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Failed to load Excel file');
      }
    },
    [validateFile],
  );

  const selectSheet = useCallback((name: string) => {
    setSelectedSheet(name);
  }, []);

  const parseSelectedSheet = useCallback(async () => {
    if (!file || !selectedSheet) return null;

    const XLSX = await import('xlsx');
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });

    const ws = workbook.Sheets[selectedSheet];
    if (!ws) throw new Error(`Sheet not found: ${selectedSheet}`);

    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
    });

    const headerRowCount =
      template.headerRowCount ?? Math.max(template.dataStartRow - 1, 0);
    const headerRows = aoa.slice(0, headerRowCount);
    const dataRows = aoa.slice(template.dataStartRow - 1);

    const rows = dataRows
      .slice(0, template.maxRows)
      .map((raw, i) => {
        const rowNumber = template.dataStartRow + i;

        const obj: Record<string, unknown> = {};
        template.columns.forEach((col) => {
          const rawValue = raw[col.colIndex];
          obj[col.key] = col.transform
            ? col.transform(rawValue, { rowNumber, colIndex: col.colIndex })
            : rawValue;
        });

        return {
          rowNumber,
          raw,
          data: obj as T,
        };
      })
      .filter((r) => !r.raw.every((c) => c === '' || c === null || c === undefined));

    return {
      rows,
      context: {
        file,
        sheetName: selectedSheet,
        sheetNames: workbook.SheetNames || [],
        headerRows,
        dataRows,
      },
    };
  }, [
    file,
    selectedSheet,
    template.columns,
    template.dataStartRow,
    template.headerRowCount,
    template.maxRows,
  ]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFile(null);
    setSheetNames([]);
    setSelectedSheet(null);
  }, []);

  return {
    status,
    error,
    file,
    sheetNames,
    selectedSheet,
    loadFile,
    selectSheet,
    parseSelectedSheet,
    reset,
  };
}

// NOTE: This hook intentionally does NOT validate headers or rows.
