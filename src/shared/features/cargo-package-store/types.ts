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

export interface CargoPackageCheckItem {
  id: string;
  packageNo?: string | null;
  packingListId: string;
  hblNumber?: string | null;
  lineId: string;
  lineNo: number | null;
  cargoDescription: string;
  cargoType?: string;
  cargoUnit?: string;
  packageType: string;
  cargoStatus: CargoStatus | null;
  customsStatus: CustomsStatus | null;
  isChecked: boolean;
  checkedDate?: string | null;
}

export interface CargoPackageCheckFlow {
  title: string;
  hblNumber: string;
  workingStatus: 'in-progress' | 'done' | string;
}

export interface CargoPackageCheckData {
  flow: CargoPackageCheckFlow;
  packages: CargoPackageCheckItem[];
}

export interface StatusSelection {
  cargoStatus: CargoStatus | null;
  customsStatus: CustomsStatus | null;
}
