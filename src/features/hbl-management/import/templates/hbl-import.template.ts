import type { ExcelTemplate } from '@/shared/schemas/excel-import';

export const HBL_IMPORT_TEMPLATE: ExcelTemplate = {
  name: 'HBL Import',
  version: '1.1',
  dataStartRow: 9,
  skipEndRows: 1,
  columns: [
    { key: 'containerNumber', label: 'Số cont', colIndex: 0 },
    { key: 'hblCode', label: 'House_Bill', colIndex: 1 },
    { key: 'sequence', label: 'STT', colIndex: 2 },
    { key: 'shipmarks', label: 'Shipmarks', colIndex: 3 },
    { key: 'consignee', label: 'Chủ hàng', colIndex: 4 },
    { key: 'packageType', label: 'Loại Hàng', colIndex: 5 },
    { key: 'cargoDescription', label: 'Hàng Hóa', colIndex: 6 },
    { key: 'packageCount', label: 'Số lượng', colIndex: 7 },
    { key: 'packageUnit', label: 'ĐVT', colIndex: 8 },
    { key: 'cargoWeight', label: 'Trọng Lượng', colIndex: 9 },
    { key: 'volume', label: 'Số Khối', colIndex: 10 },
    { key: 'imdg', label: 'Nhóm Nguy hiểm\nIMDG', colIndex: 11 },
    { key: 'note', label: 'Ghi Chú', colIndex: 12 },
  ],
  maxRows: 100,
  maxFileSizeMb: 10,
  allowedExtensions: ['.xlsx', '.xls'],
};
