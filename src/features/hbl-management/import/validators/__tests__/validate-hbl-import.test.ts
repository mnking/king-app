import { describe, it, expect } from 'vitest';

import { createHblImportValidator } from '../validate-hbl-import';
import type { ExcelParseContext, ParsedRow } from '@/shared/schemas/excel-import';

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

const makeContext = (): ExcelParseContext => ({
  file: new File([''], 'hbl.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  sheetName: 'Sheet1',
  sheetNames: ['Sheet1'],
  headerRows: [
    ['Mã Đại lý:', 'DL01'],
    ['Số Master Bill:', 'MBL001'],
    ['Số Seal:', 'SEAL001'],
    ['Tên Tàu:', 'Vessel'],
    ['Số chuyến:', 'V001'],
    ['Ngày cập:', '04/02/2026'],
    ['Số cont:', 'HLBU2941860'],
    ['Kích cỡ:', '40HQ'],
  ],
  dataRows: [],
});

const makeRowData = (overrides: Partial<HblRow>): HblRow => ({
  containerNumber: '',
  hblCode: '',
  sequence: '',
  shipmarks: '',
  consignee: '',
  packageType: '',
  cargoDescription: '',
  packageCount: '',
  packageUnit: '',
  cargoWeight: '',
  volume: '',
  imdg: '',
  note: '',
  ...overrides,
});

describe('createHblImportValidator', () => {
  it('treats numeric House_Bill cells as present (SheetJS raw mode)', () => {
    const validate = createHblImportValidator(null);
    const context = makeContext();

    const rows: Array<ParsedRow<HblRow>> = [
      {
        rowNumber: 9,
        raw: [],
        data: makeRowData({
          containerNumber: 'HLBU2941860',
          hblCode: 3265,
          consignee: 'Consignee A',
        }),
      },
      {
        rowNumber: 10,
        raw: [],
        data: makeRowData({
          containerNumber: 'HLBU2941860',
          hblCode: 'TAIL',
          consignee: 'Consignee B',
        }),
      },
    ];

    const errors = validate({ rows, context });
    expect(errors.find((e) => e.rowNumber === 9 && e.colIndex === 1)).toBeUndefined();
  });

  it('validates ETA date when provided as an Excel serial number', () => {
    const validate = createHblImportValidator(null);
    const context = makeContext();

    const utcDaysSinceEpoch = Math.floor(Date.UTC(2026, 1, 4) / 86400_000);
    const excelSerial = utcDaysSinceEpoch + 25569;
    context.headerRows = context.headerRows.map((row) =>
      row[0] === 'Ngày cập:' ? [row[0], excelSerial] : row,
    );

    const rows: Array<ParsedRow<HblRow>> = [
      {
        rowNumber: 9,
        raw: [],
        data: makeRowData({
          containerNumber: 'HLBU2941860',
          hblCode: 'HB001',
          consignee: 'Consignee A',
        }),
      },
    ];

    const errors = validate({ rows, context });
    expect(errors.find((e) => e.message.toLowerCase().includes('eta date is invalid'))).toBeUndefined();
  });

  it('shows a validation error when ETA string is not in DD/MM/YYYY', () => {
    const validate = createHblImportValidator(null);
    const context = makeContext();
    context.headerRows = context.headerRows.map((row) =>
      row[0] === 'Ngày cập:' ? [row[0], '10/18/2025'] : row,
    );

    const rows: Array<ParsedRow<HblRow>> = [
      {
        rowNumber: 9,
        raw: [],
        data: makeRowData({
          containerNumber: 'HLBU2941860',
          hblCode: 'HB001',
          consignee: 'Consignee A',
        }),
      },
    ];

    const errors = validate({ rows, context });
    expect(errors.some((e) => e.message.toLowerCase().includes('eta date is invalid'))).toBe(true);
  });
});
