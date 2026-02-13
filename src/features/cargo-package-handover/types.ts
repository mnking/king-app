export type PositionStatus =
  | 'RECEIVING'
  | 'CHECK_IN'
  | 'PUTAWAY'
  | 'RELOCATION'
  | 'PICKING'
  | 'STAGING'
  | 'STORED'
  | 'HANDOVER'
  | 'CHECKOUT'
  | 'GATED_OUT'
  | 'SEIZED'
  | 'UNKNOWN'
  | 'OUT_STORED'
  | 'HOLD_OUTBOUND'
  | 'CUSTOMS_CHECK'
  | 'CUSTOMS_RETURNED'
  | 'CUSTOMS_RELEASED';

export type ConditionStatus = 'NORMAL' | 'PACKAGE_DAMAGED' | 'CARGO_DAMAGED';

export type RegulatoryStatus = 'UNINSPECTED' | 'PASSED' | 'ON_HOLD';

export interface CargoPackageRecord {
  id: string;
  lineNo?: number;
  packingListId: string;
  lineId?: string | null;
  packageNo?: string | null;
  cargoDescription?: string | null;
  packageType?: string | null;
  positionStatus?: PositionStatus | null;
  conditionStatus?: ConditionStatus | null;
  regulatoryStatus?: RegulatoryStatus | null;
}

export interface GeneratePackageCodeResponse {
  packageId: string;
  code: string;
}

export interface CargoPackageStorePayload {
  packages: Array<{
    packageId: string;
    toLocationId?: string[];
    note?: string | null;
    metadata?: Record<string, unknown>;
  }>;
}
