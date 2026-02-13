import type {
  DestuffCfsReceiptRenderContext,
  ImportWarehouseDeliveryPayload,
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

export interface ImportWarehouseDeliveryMapperResult {
  payload: ImportWarehouseDeliveryPayload;
  issues: RenderIssue[];
}

export const mapImportWarehouseDelivery = (
  context: DestuffCfsReceiptRenderContext,
): ImportWarehouseDeliveryMapperResult => {
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
      numberOfPackages: line.numberOfPackages ?? '',
      deliveredQuantity: line.quantity ?? '',
      deliveredNumberOfPackages: line.numberOfPackages ?? '',
      grossWeightKg: line.grossWeightKg ?? null,
      volumeM3: line.volumeM3 ?? null,
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

  const totalDeliveredPackages = sumNumbers(
    mappedLines.map((line) => line.deliveredNumberOfPackages),
  );
  const totalDeliveredWeightKg = sumNumbers(
    mappedLines.map((line) => normalizeNumber(line.grossWeightKg)),
  );
  const totalDeliveredVolumeM3 = sumNumbers(
    mappedLines.map((line) => normalizeNumber(line.volumeM3)),
  );

  if (totalDeliveredPackages === null) {
    issues.push({
      field: 'totals.totalDeliveredPackages',
      message: 'Total delivered packages missing; please provide manually.',
      severity: 'warning',
    });
  }

  if (totalDeliveredWeightKg === null) {
    issues.push({
      field: 'totals.totalDeliveredWeightKg',
      message: 'Total delivered weight missing; please provide manually.',
      severity: 'warning',
    });
  }

  if (totalDeliveredVolumeM3 === null) {
    issues.push({
      field: 'totals.totalDeliveredVolumeM3',
      message: 'Total delivered volume missing; please provide manually.',
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
    {
      field: 'delivery.batchNo',
      message: 'Batch number is required from user input.',
      severity: 'error',
    },
  );

  const payload: ImportWarehouseDeliveryPayload = {
    receipt: {
      receiptNo: '',
      receiptDate: '',
    },
    delivery: {
      batchNo: '',
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
      totalDeliveredPackages: totalDeliveredPackages ?? '',
      totalDeliveredWeightKg: totalDeliveredWeightKg ?? '',
      totalDeliveredVolumeM3: totalDeliveredVolumeM3 ?? '',
    },
  };

  return { payload, issues };
};
