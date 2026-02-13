export type StuffingPackageTransactionStatus = 'IN_PROGRESS' | 'DONE';

export interface StuffingPackageTransactionPackage {
  id: string;
  packageNo: string | null;
  positionStatus: string | null;
  regulatoryStatus?: string | null;
  conditionStatus?: string | null;
}

export interface StuffingPackageTransaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  packages: StuffingPackageTransactionPackage[];
  status: StuffingPackageTransactionStatus;
  endedAt: string | null;
  businessProcessFlow: string | null;
  partyName: string | null;
  partyType: string | null;
  packingListId: string | null;
}
