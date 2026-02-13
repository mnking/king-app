import type { ApiResponse, PaginatedResponse } from '@/features/zones-locations/types';

export type FlowType = 'INBOUND' | 'OUTBOUND';

export type StatusCheck = 'normal' | 'package_damaged' | 'cargo_broken';

export type CustomsCheck = 'uninspected' | 'passed' | 'on_hold';

export interface CargoInspectionSession {
  id: string;
  packingListId: string;
  flowType: FlowType;
  status: 'checking' | 'done' | string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LineInspection {
  id: string;
  sessionId: string;
  packingListLineId?: string | null;
  lineNumber: number;
  totalPackages: number;
  checkedPackages: number;
  checkedFlag: boolean | 'yes' | 'no';
  actualPackageCount: number;
  actualCargoQuantity: number;
  regulatoryCargoType?: string | null;
  regulatoryCargoDescription?: string | null;
  packageInspections?: PackageInspection[];
}

export interface PackageInspection {
  id: string;
  lineInspectionId: string;
  packageCount: number;
  statusCheck: StatusCheck;
  customsCheck: CustomsCheck;
}

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

export interface CargoPackage {
  id: string;
  packingListId: string;
  positionStatus?: PositionStatus | null;
  conditionStatus?: ConditionStatus | null;
  regulatoryStatus?: RegulatoryStatus | null;
  lineNo?: number;
  packageNo?: string | null;
  cargoDescription?: string | null;
  packageType?: string | null;
}

export interface PackageCheckData {
  packageCount: number;
  statusCheck: StatusCheck;
  customsCheck: CustomsCheck;
}

export interface PackageStatusUpdate {
  conditionStatus?: ConditionStatus;
  regulatoryStatus?: RegulatoryStatus;
}

export type CargoInspectionSessionsResponse = ApiResponse<
  PaginatedResponse<CargoInspectionSession> | CargoInspectionSession[]
>;
