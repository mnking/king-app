import type { CargoPackageRecord } from '@/features/cargo-package-storage/types';
import type { PackingListDetail, PackingListLineResponseDto } from '@/features/packing-list/types';

export type FormTemplateCode =
  | 'CARGO_PACKAGE_LABEL'
  | 'IMPORT_WAREHOUSE_RECEIVING_NOTE'
  | 'IMPORT_WAREHOUSE_RETURN_NOTE'
  | 'IMPORT_WAREHOUSE_DELIVERY_NOTE';

export type Severity = 'error' | 'warning';

export interface RenderIssue {
  field: string;
  message: string;
  severity?: Severity;
}

export interface CargoPackageLabelPayload {
  shipment: {
    packingListNumber: string;
    forwarderName: string;
    hblCode: string;
    containerNumber: string;
    containerType: string;
    sealNumber: string;
  };
  packages: Array<{
    id: string;
    lineNo: string;
    packingListId: string;
    lineId: string;
    packageNo: string;
    cargoDescription: string;
    packageType: string;
    conditionStatus: string | null;
    regulatoryStatus: string | null;
    positionStatus: string;
    quantity: number | string;
  }>;
}

export interface ImportWarehouseReceivingPayload {
  receipt: {
    receiptNo: string;
    receiptDate: string;
  };
  shipment: {
    hblCode: string;
    forwarderName: string;
    containerNumber: string;
    packingListNumber: string;
    containerType: string | null;
    sealNumber: string | null;
    mbl: string | null;
    note: string | null;
  };
  lines: Array<{
    lineNo: number | string;
    commodityDescription: string;
    cargoType: string;
    unitOfMeasure: string;
    quantity: number | string;
    packageTypeCode: string;
    numberOfPackages: number;
    grossWeightKg: number | string;
    volumeM3: number | string;
    shipmarks?: string | null;
    imdg?: string | null;
  }>;
  totals: {
    totalPackages: number;
    totalWeightKg: number | string;
    totalVolumeM3: number | string;
  };
}

export interface ImportWarehouseDeliveryPayload {
  receipt: {
    receiptNo: string;
    receiptDate: string;
  };
  delivery: {
    batchNo: string | number;
  };
  shipment: {
    hblCode: string;
    forwarderName: string;
    containerNumber: string;
    packingListNumber: string;
    containerType: string | null;
    sealNumber: string | null;
    mbl: string | null;
    note: string | null;
  };
  lines: Array<{
    lineNo: number | string;
    commodityDescription: string;
    cargoType: string;
    unitOfMeasure: string;
    quantity: number | string;
    packageTypeCode: string;
    numberOfPackages: number | string;
    deliveredQuantity: number | string;
    deliveredNumberOfPackages: number | string;
    grossWeightKg?: number | string | null;
    volumeM3?: number | string | null;
    shipmarks?: string | null;
    imdg?: string | null;
  }>;
  totals: {
    totalDeliveredPackages: number | string;
    totalDeliveredWeightKg: number | string;
    totalDeliveredVolumeM3: number | string;
  };
}

export interface DestuffCfsReceiptRenderContext {
  packingList: PackingListDetail;
  lines: PackingListLineResponseDto[];
}

export interface CargoPackageLabelRenderContext {
  packingList: PackingListDetail;
  packages: CargoPackageRecord[];
}

export type RenderPayloadMap = {
  CARGO_PACKAGE_LABEL: CargoPackageLabelPayload;
  IMPORT_WAREHOUSE_RECEIVING_NOTE: ImportWarehouseReceivingPayload;
  IMPORT_WAREHOUSE_RETURN_NOTE: ImportWarehouseReceivingPayload;
  IMPORT_WAREHOUSE_DELIVERY_NOTE: ImportWarehouseDeliveryPayload;
};

export type RenderPayload<TCode extends FormTemplateCode> = RenderPayloadMap[TCode];

export type RenderContext<TCode extends FormTemplateCode> = TCode extends 'CARGO_PACKAGE_LABEL'
  ? CargoPackageLabelRenderContext
  : TCode extends 'IMPORT_WAREHOUSE_RECEIVING_NOTE'
    ? DestuffCfsReceiptRenderContext
    : TCode extends 'IMPORT_WAREHOUSE_RETURN_NOTE'
      ? DestuffCfsReceiptRenderContext
      : TCode extends 'IMPORT_WAREHOUSE_DELIVERY_NOTE'
        ? DestuffCfsReceiptRenderContext
        : never;

export interface ImportWarehouseReceivingManualFields {
  receipt: {
    receiptNo: string;
    receiptDate: string;
  };
  shipment: {
    note: string;
  };
}

export interface ImportWarehouseDeliveryManualFields {
  receipt: {
    receiptNo: string;
    receiptDate: string;
  };
  delivery: {
    batchNo: string;
  };
  shipment: {
    note: string;
  };
}
