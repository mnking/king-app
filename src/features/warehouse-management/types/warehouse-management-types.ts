import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@/features/zones-locations/types';

export type ApiResponse<T> = SharedApiResponse<T>;
export type PaginatedResponse<T> = SharedPaginatedResponse<T>;

export type LocationStatus = 'active' | 'inactive' | 'locked';

export interface WarehousePackageLocationSummary {
  locationId: string;
  status: LocationStatus;
  zoneName: string | null;
  locationName?: string | null;
  packageCount?: number;
}

export interface WarehousePackageListItem {
  packageId: string;
  packageNo: string;
  packingListNumber: string | null;
  hblCode: string | null;
  forwarder: string | null;
  forwarderName: string | null;
  direction: string | null;
  shipper: string | null;
  consignee: string | null;
  packingListId: string;
  cargoDescription: string;
  packageType: string;
  positionStatus: string | null;
  conditionStatus: string | null;
  regulatoryStatus: string | null;
  currentLocationId: string[] | null;
  currentLocations?: {
    zoneCode: string | null;
    zoneName: string | null;
    locationId: string;
    locationCode: string | null;
    locationName: string | null;
  }[];
  hasMultipleLocations: boolean;
  locations: WarehousePackageLocationSummary[];
}

export interface WarehousePackingListHblData {
  id: string;
  hblCode: string | null;
  forwarderName?: string | null;
  shipper?: string | null;
  consignee?: string | null;
}

export interface WarehousePackingListStoredItem {
  id: string;
  packingListNumber: string | null;
  hblId: string | null;
  hblCode: string | null;
  directionFlow: string | null;
  forwarderId: string | null;
  hblData?: WarehousePackingListHblData | null;
  storedLocationIds: string[] | null;
  storedLocationPackageCounts?: {
    locationId: string;
    packageCount: number;
  }[] | null;
}

export interface WarehousePackageListQueryParams {
  page?: number;
  itemsPerPage?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
  locationIds?: string[];
  packageNo?: string;
  packingListId?: string;
  packingListNumber?: string;
  hblCode?: string;
  hblId?: string;
  forwarderName?: string;
  forwarderId?: string;
  locationStatus?: string;
  inCfsOnly?: boolean;
}

export interface WarehousePackingListQueryParams {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  status?: string | string[];
  documentStatus?: string | string[];
  workingStatus?: string | string[];
  directionFlow?: string;
  forwarderId?: string;
  hblId?: string;
  cargoType?: string;
  containerNumber?: string;
  eta?: string;
  hasStoredPackages?: boolean;
  storedLocationId?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export interface RelocateCargoPackagePayload {
  packageId: string;
  fromLocationId: string[];
  toLocationId: string[];
}

export type WarehousePackageListResponse = ApiResponse<
  PaginatedResponse<WarehousePackageListItem>
>;

export type WarehousePackingListStoredResponse = ApiResponse<
  PaginatedResponse<WarehousePackingListStoredItem>
>;
