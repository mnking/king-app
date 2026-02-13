export enum CargoStatus {
  Normal = 'NORMAL',
  PackageDamaged = 'PACKAGE_DAMAGED',
  CargoDamaged = 'CARGO_DAMAGED',
}

export enum CustomsStatus {
  Uninspected = 'UNINSPECTED',
  Passed = 'PASSED',
  OnHold = 'ON_HOLD',
}

export interface CargoPackageStuffingItem {
  id: string;
  packageNo?: string | null;
  packingListId: string;
  hblNumber?: string | null;
  lineId: string;
  lineNo: number | null;
  cargoDescription: string;
  cargoType?: string | null;
  cargoUnit?: string | null;
  packageType: string;
  cargoStatus: CargoStatus | null;
  customsStatus: CustomsStatus | null;
  isChecked: boolean;
  checkedDate?: string | null;
}

export interface CargoPackageSummary {
  id?: string | null;
  lineId?: string | null;
  lineNo?: number | string | null;
  packageNo?: string | null;
  cargoDescription?: string | null;
  packageType?: string | null;
  conditionStatus?: CargoStatus | null;
  regulatoryStatus?: CustomsStatus | null;
}

export interface StatusSelection {
  cargoStatus: CargoStatus | null;
  customsStatus: CustomsStatus | null;
}
