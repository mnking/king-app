import type { ConditionStatus, RegulatoryStatus } from '@/features/cargo-package-storage/types';

export type PackageTransactionStatus = 'IN_PROGRESS' | 'DONE';

export type PackageTransactionPartyType = 'FORWARDER' | 'CONSIGNEE' | 'SHIPPER';

export type BusinessProcessFlow =
  | 'destuffDelivery'
  | 'destuffWarehouse'
  | 'warehouseDelivery'
  | 'stuffingWarehouse';

export interface PackageTransactionPackage {
  id: string;
  packageNo: string | null;
  positionStatus: string | null;
  regulatoryStatus?: RegulatoryStatus | null;
  conditionStatus?: ConditionStatus | null;
}

export interface PackageTransaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  packages: PackageTransactionPackage[];
  status: PackageTransactionStatus;
  endedAt: string | null;
  businessProcessFlow: BusinessProcessFlow | string | null;
  partyName: string | null;
  partyType: PackageTransactionPartyType | null;
  packingListId: string | null;
}

export interface PackageTransactionQueryParams {
  code?: string;
  packageIds?: string[];
  status?: PackageTransactionStatus;
  businessProcessFlow?: BusinessProcessFlow | string;
  packingListId?: string | null;
  partyType?: PackageTransactionPartyType | null;
  itemsPerPage?: number;
  page?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
}

export interface CreatePackageTransactionPayload {
  packageIds?: string[];
  status?: PackageTransactionStatus;
  partyName?: string;
  partyType?: PackageTransactionPartyType;
  businessProcessFlow?: BusinessProcessFlow;
  packingListId?: string;
}
