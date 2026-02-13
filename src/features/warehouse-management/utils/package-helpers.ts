import type { RenderContext } from '@/shared/features/form-printing';
import type { PackingListDetail } from '@/features/packing-list/types';
import type { CargoPackageRecord } from '@/features/cargo-package-storage/types';
import type {
  WarehousePackageListItem,
  WarehousePackageLocationSummary,
} from '@/features/warehouse-management/types';

type PackageLabelContextInput = {
  packageId: string;
  lineNo: string;
  packingListId: string;
  lineId?: string | null;
  packageNo?: string | null;
  packingListNo?: string | null;
  hblNo?: string | null;
  forwarderName?: string | null;
  shipperName?: string | null;
  consigneeName?: string | null;
  cargoDescription?: string | null;
  packageType?: string | null;
  positionStatus?: string | null;
  conditionStatus?: string | null;
  regulatoryStatus?: string | null;
  direction: 'IMPORT' | 'EXPORT';
};

export const normalizeDirection = (value?: string | null): 'IMPORT' | 'EXPORT' => {
  const normalized = (value ?? '').toUpperCase();
  return normalized === 'EXPORT' ? 'EXPORT' : 'IMPORT';
};

export const normalizeLocations = (
  item: WarehousePackageListItem,
): WarehousePackageLocationSummary[] => {
  if (item.currentLocations?.length) {
    return item.currentLocations.map((location) => ({
      locationId: location.locationId,
      status: 'active',
      zoneName: location.zoneName ?? null,
      locationName: location.locationName ?? location.locationCode ?? null,
    }));
  }
  if (item.locations?.length) {
    return item.locations;
  }
  if (item.currentLocationId?.length) {
    return item.currentLocationId.map((locationId) => ({
      locationId,
      status: 'active',
      zoneName: null,
    }));
  }
  return [];
};

export const resolveFromLocationIds = (
  item: WarehousePackageListItem,
  locations: WarehousePackageLocationSummary[],
): string[] =>
  item.locations?.length
    ? item.locations.map((location) => location.locationId)
    : item.currentLocations?.length
      ? item.currentLocations.map((location) => location.locationId)
      : item.currentLocationId?.length
        ? item.currentLocationId
        : locations.map((location) => location.locationId);

export const buildPackageLabelContext = (
  item: PackageLabelContextInput,
): RenderContext<'CARGO_PACKAGE_LABEL'> => {
  const now = new Date().toISOString();
  const packingList: PackingListDetail = {
    id: item.packingListId,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
    packingListNumber: item.packingListNo ?? null,
    mbl: null,
    eta: null,
    ata: null,
    note: null,
    forwarderId: '',
    weight: null,
    volume: null,
    numberOfPackages: null,
    status: 'DRAFT',
    workingStatus: 'INITIALIZED',
    documentStatus: 'CREATED',
    hblData: {
      id: item.hblNo ?? '',
      hblCode: item.hblNo ?? '',
      containerNumber: '',
      containerType: '',
      sealNumber: '',
      forwarderName: item.forwarderName ?? '',
      vessel: '',
      voyage: '',
      consignee: item.consigneeName ?? '',
      shipper: item.shipperName ?? '',
    },
    directionFlow: item.direction,
    workPackingListFile: null,
    workPackingListFileUrl: null,
    officialPackingListFile: null,
    officialPackingListFileUrl: null,
  };

  const packages: CargoPackageRecord[] = [
    {
      id: item.packageId,
      lineNo: Number(item.lineNo),
      packingListId: item.packingListId,
      lineId: item.lineId ?? null,
      packageNo: item.packageNo ?? null,
      cargoDescription: item.cargoDescription ?? null,
      packageType: item.packageType ?? null,
      positionStatus: item.positionStatus ?? 'UNKNOWN',
      conditionStatus: item.conditionStatus ?? 'NORMAL',
      regulatoryStatus: item.regulatoryStatus ?? 'UNINSPECTED',
    },
  ];

  return { packingList, packages };
};
