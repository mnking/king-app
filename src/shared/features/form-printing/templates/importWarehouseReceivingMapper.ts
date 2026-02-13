import type {
  DestuffCfsReceiptRenderContext,
  ImportWarehouseReceivingPayload,
  RenderIssue,
} from '../types';

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sumNumbers = (values: Array<number | null | undefined>): number | null => {
  let total = 0;
  let hasValue = false;

  for (const value of values) {
    const numeric = normalizeNumber(value);
    if (numeric !== null) {
      total += numeric;
      hasValue = true;
    }
  }

  return hasValue ? total : null;
};

export interface ImportWarehouseReceivingMapperResult {
  payload: ImportWarehouseReceivingPayload;
  issues: RenderIssue[];
}

export const mapImportWarehouseReceiving = (
  context: DestuffCfsReceiptRenderContext,
): ImportWarehouseReceivingMapperResult => {
  const issues: RenderIssue[] = [];
  const { packingList, lines } = context;
  const hbl = packingList.hblData;

  const packingListNumber = packingList.packingListNumber || packingList.id;
  const hblCode = hbl?.hblCode ?? '';
  const forwarderName = hbl?.forwarderName ?? '';
  const containerNumber = hbl?.containerNumber ?? '';

  if (!hblCode) {
    issues.push({
      field: 'shipment.hblCode',
      message: 'HBL code is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!forwarderName) {
    issues.push({
      field: 'shipment.forwarderName',
      message: 'Forwarder name is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!containerNumber) {
    issues.push({
      field: 'shipment.containerNumber',
      message: 'Container number is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!packingListNumber) {
    issues.push({
      field: 'shipment.packingListNumber',
      message: 'Packing list number is missing.',
      severity: 'warning',
    });
  }

  const mappedLines =
    lines?.map((line, index) => ({
      lineNo: index + 1,
      commodityDescription: line.commodityDescription ?? '',
      cargoType: line.cargoType ?? '',
      unitOfMeasure: line.unitOfMeasure ?? '',
      quantity: line.quantity ?? '',
      packageTypeCode: line.packageTypeCode ?? '',
      numberOfPackages: line.numberOfPackages ?? 0,
      grossWeightKg: line.grossWeightKg ?? '',
      volumeM3: line.volumeM3 ?? '',
      shipmarks: line.shipmarks ?? null,
      imdg: line.imdg ?? null,
    })) ?? [];

  if (!mappedLines.length) {
    issues.push({
      field: 'lines',
      message: 'No packing list lines found. At least one line is required.',
      severity: 'error',
    });
  }

  const totalPackages =
    packingList.numberOfPackages ?? sumNumbers(lines?.map((line) => line.numberOfPackages) ?? []);
  const totalWeightKg =
    packingList.weight ?? sumNumbers(lines?.map((line) => line.grossWeightKg) ?? []);
  const totalVolumeM3 =
    packingList.volume ?? sumNumbers(lines?.map((line) => line.volumeM3) ?? []);

  if (totalPackages === null) {
    issues.push({
      field: 'totals.totalPackages',
      message: 'Total packages missing; please provide manually.',
      severity: 'warning',
    });
  }

  if (totalWeightKg === null) {
    issues.push({
      field: 'totals.totalWeightKg',
      message: 'Total weight missing; please provide manually.',
      severity: 'warning',
    });
  }

  if (totalVolumeM3 === null) {
    issues.push({
      field: 'totals.totalVolumeM3',
      message: 'Total volume missing; please provide manually.',
      severity: 'warning',
    });
  }

  issues.push(
    {
      field: 'receipt.receiptNo',
      message: 'Receipt number is required from user input.',
      severity: 'error',
    },
    {
      field: 'receipt.receiptDate',
      message: 'Receipt date is required from user input.',
      severity: 'error',
    },
  );

  const payload: ImportWarehouseReceivingPayload = {
    receipt: {
      receiptNo: '',
      receiptDate: '',
    },
    shipment: {
      hblCode,
      forwarderName,
      containerNumber,
      packingListNumber,
      containerType: hbl?.containerType ?? null,
      sealNumber: hbl?.sealNumber ?? null,
      mbl: packingList.mbl ?? null,
      note: packingList.note ?? null,
    },
    lines: mappedLines,
    totals: {
      totalPackages: totalPackages ?? 0,
      totalWeightKg: totalWeightKg ?? '',
      totalVolumeM3: totalVolumeM3 ?? '',
    },
  };

  return { payload, issues };
};
