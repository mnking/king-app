import type {
  CargoPackageRecord,
  ConditionStatus,
  PositionStatus,
  RegulatoryStatus,
} from '@/features/cargo-package-storage/types';

export type CargoPackageSelectionItem = CargoPackageRecord;

export interface CargoPackageSelectionSummary {
  selectedCount: number;
  totalPackages: number;
}

export interface CargoPackageSelectionProps {
  packingListId: string;
  plNumber: string;
  transactionId?: string;
  availablePackagesStatus?: PositionStatus;
  pickedPackagesStatus?: PositionStatus;
  readOnly?: boolean;
  hblNumber?: string | null;
  note?: string;
  workingStatus?: string | null;
  containerNumber?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  onSelectionChange?: (summary: CargoPackageSelectionSummary) => void;
  onSubmitSuccess?: (payload: {
    selectedPackageIds: string[];
    totalPackages: number;
  }) => void;
}

export interface LocationGroup {
  key: string;
  locationId: string | null;
  locationName: string;
  items: CargoPackageSelectionItem[];
}

export type {
  PositionStatus,
  ConditionStatus,
  RegulatoryStatus,
};
