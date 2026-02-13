import type { CellValidationError, ExcelValidator } from '@/shared/schemas/excel-import';
import { columnIndexToLetter } from '@/shared/schemas/excel-import';
import { HBL_IMPORT_TEMPLATE } from '@/features/hbl-management/import/templates/hbl-import.template';
import { isValidISO6346, normalizeContainerNumber } from '@/shared/utils/container';
import { parseExcelDmyDate } from '@/shared/utils/excel-date';
import type { ImportHblMappingDto } from '@/services/apiForwarder';

type HblRow = {
  containerNumber: unknown;
  hblCode: unknown;
  sequence: unknown;
  shipmarks: unknown;
  consignee: unknown;
  packageType: unknown;
  cargoDescription: unknown;
  packageCount: unknown;
  packageUnit: unknown;
  cargoWeight: unknown;
  volume: unknown;
  imdg: unknown;
  note: unknown;
};

const normalizeHeaderLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/:$/, '');

const getCellDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value.trim() : String(value).trim();
};

const getRequiredText = (value: unknown): string | null => {
  const display = getCellDisplay(value);
  return display.length > 0 ? display : null;
};

const normalizePackageType = (value: unknown): string => getCellDisplay(value).toUpperCase();

const findHeaderValue = (
  headerRows: unknown[][],
  label: string,
): { value: unknown; rowNumber: number; colIndex: number } | null => {
  const target = normalizeHeaderLabel(label);

  for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex += 1) {
    const row = headerRows[rowIndex] ?? [];
    const cells = Array.isArray(row) ? row : [];
    for (let colIndex = 0; colIndex < cells.length; colIndex += 1) {
      const cell = cells[colIndex];
      if (typeof cell !== 'string') continue;
      if (normalizeHeaderLabel(cell) === target) {
        return {
          value: cells[colIndex + 1],
          rowNumber: rowIndex + 1,
          colIndex: colIndex + 1,
        };
      }
    }
  }

  return null;
};
const shouldSkipTailRows = (index: number, total: number) => {
  const skipCount = Math.max(HBL_IMPORT_TEMPLATE.skipEndRows ?? 0, 0);
  return skipCount > 0 && index >= total - skipCount;
};

const DEFAULT_HEADER_LABELS = {
  forwarderCode: 'Mã Đại lý:',
  mbl: 'Số Master Bill:',
  sealNumber: 'Số Seal:',
  vesselName: 'Tên Tàu:',
  voyageNumber: 'Số chuyến:',
  arrivalDate: 'Ngày cập:',
  containerNumber: 'Số cont:',
  containerSize: 'Kích cỡ:',
};

export const createHblImportValidator = (
  mapping?: ImportHblMappingDto | null,
): ExcelValidator<HblRow> => {
  const labels = {
    forwarderCode: mapping?.header?.forwarderCode ?? DEFAULT_HEADER_LABELS.forwarderCode,
    mbl: mapping?.header?.mbl ?? DEFAULT_HEADER_LABELS.mbl,
    sealNumber: mapping?.header?.sealNumber ?? DEFAULT_HEADER_LABELS.sealNumber,
    vesselName: mapping?.header?.vesselName ?? DEFAULT_HEADER_LABELS.vesselName,
    voyageNumber: mapping?.header?.voyageNumber ?? DEFAULT_HEADER_LABELS.voyageNumber,
    arrivalDate: mapping?.header?.arrivalDate ?? DEFAULT_HEADER_LABELS.arrivalDate,
    containerNumber: mapping?.header?.containerNumber ?? DEFAULT_HEADER_LABELS.containerNumber,
    containerSize: mapping?.header?.containerSize ?? DEFAULT_HEADER_LABELS.containerSize,
  };

  return ({ rows, context }) => {
    const errors: CellValidationError[] = [];
    const imdgColIndex =
      HBL_IMPORT_TEMPLATE.columns.find((column) => column.key === 'imdg')?.colIndex ?? 11;

    const pushHeaderError = (label: string, message: string, value?: unknown) => {
      const found = findHeaderValue(context.headerRows, label);
      const rowNumber = found?.rowNumber ?? 1;
      const colIndex = found?.colIndex ?? 0;
      errors.push({
        rowNumber,
        colIndex,
        colLetter: columnIndexToLetter(colIndex),
        message,
        value,
      });
    };

    const headerContainer = findHeaderValue(context.headerRows, labels.containerNumber);
    const headerContainerValue = getCellDisplay(headerContainer?.value);
    const headerContainerNormalized = headerContainerValue
      ? normalizeContainerNumber(headerContainerValue)
      : '';

    if (!headerContainerValue) {
      pushHeaderError(labels.containerNumber, 'Container number is required', headerContainer?.value);
    } else if (!isValidISO6346(headerContainerValue)) {
      pushHeaderError(
        labels.containerNumber,
        'Container number is invalid (ISO 6346)',
        headerContainer?.value,
      );
    }

    const requiredHeaderFields = [
      { label: labels.forwarderCode, message: 'Forwarder code is required' },
      { label: labels.mbl, message: 'MBL number is required' },
      { label: labels.sealNumber, message: 'Seal number is required' },
      { label: labels.vesselName, message: 'Vessel name is required' },
      { label: labels.voyageNumber, message: 'Voyage number is required' },
      { label: labels.arrivalDate, message: 'ETA date is required', type: 'date' as const },
      { label: labels.containerSize, message: 'Container size is required' },
    ];

    for (const field of requiredHeaderFields) {
      const found = findHeaderValue(context.headerRows, field.label);
      const rawValue = found?.value;
      const display = getCellDisplay(rawValue);

      if (!display) {
        pushHeaderError(field.label, field.message, rawValue);
        continue;
      }

      if (field.type === 'date') {
        const parsed = parseExcelDmyDate(rawValue);
        if (!parsed) {
          pushHeaderError(
            field.label,
            'ETA date is invalid. Use DD/MM/YYYY (or select a valid Excel date)',
            rawValue,
          );
        }
      }
    }

    const hasDataRows = rows.some((row, index) => {
      if (row.rowNumber < HBL_IMPORT_TEMPLATE.dataStartRow) return false;
      if (shouldSkipTailRows(index, rows.length)) return false;
      return true;
    });

    if (errors.length === 0 && !hasDataRows) {
      errors.push({
        rowNumber: HBL_IMPORT_TEMPLATE.dataStartRow,
        colIndex: 0,
        colLetter: columnIndexToLetter(0),
        message: 'At least one HBL row is required',
        value: null,
      });
    }

    for (const [index, r] of rows.entries()) {
      if (r.rowNumber < HBL_IMPORT_TEMPLATE.dataStartRow) continue;
      if (shouldSkipTailRows(index, rows.length)) continue;

      const containerNumber = r.data.containerNumber;
      const containerNumberText = getRequiredText(containerNumber);
      if (!containerNumberText) {
        errors.push({
          rowNumber: r.rowNumber,
          colIndex: 0,
          colLetter: columnIndexToLetter(0),
          message: 'Container number is required',
          value: containerNumber,
        });
      } else if (!isValidISO6346(containerNumberText)) {
        errors.push({
          rowNumber: r.rowNumber,
          colIndex: 0,
          colLetter: columnIndexToLetter(0),
          message: 'Container number is invalid (ISO 6346)',
          value: containerNumber,
        });
      } else if (headerContainerNormalized) {
        const rowContainerNormalized = normalizeContainerNumber(containerNumberText);
        if (rowContainerNormalized !== headerContainerNormalized) {
          errors.push({
            rowNumber: r.rowNumber,
            colIndex: 0,
            colLetter: columnIndexToLetter(0),
            message: 'Container number must match header',
            value: containerNumber,
          });
        }
      }

      const hblCode = r.data.hblCode;
      const hblCodeText = getRequiredText(hblCode);
      if (!hblCodeText) {
        errors.push({
          rowNumber: r.rowNumber,
          colIndex: 1,
          colLetter: columnIndexToLetter(1),
          message: 'House bill is required',
          value: hblCode,
        });
      }

      const consignee = r.data.consignee;
      const consigneeText = getRequiredText(consignee);
      if (!consigneeText) {
        errors.push({
          rowNumber: r.rowNumber,
          colIndex: 4,
          colLetter: columnIndexToLetter(4),
          message: 'Consignee is required',
          value: consignee,
        });
      }

      const packageType = normalizePackageType(r.data.packageType);
      if (packageType === 'DG') {
        const imdgValue = getCellDisplay(r.data.imdg);
        if (!imdgValue) {
          errors.push({
            rowNumber: r.rowNumber,
            colIndex: imdgColIndex,
            colLetter: columnIndexToLetter(imdgColIndex),
            message: 'IMDG is required when package type is DG',
            value: r.data.imdg,
          });
        }
      }
    }

    return errors;
  };
};

export const validateHblImport = createHblImportValidator(null);
