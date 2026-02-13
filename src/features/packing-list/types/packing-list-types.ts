import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@/features/zones-locations/types';

export type ApiResponse<T> = SharedApiResponse<T>;
export type PaginatedResponse<T> = SharedPaginatedResponse<T>;

export type PackingListStatus = 'DRAFT' | 'PARTIAL' | 'APPROVED' | 'DONE';
export type PackingListWorkingStatus = 'INITIALIZED' | 'IN_PROGRESS' | 'DONE';
export type PackingListDocumentStatus = 'CREATED' | 'AMENDED' | 'APPROVED';
export type ShippingDirectionFlow = 'IMPORT' | 'EXPORT';

export type CargoType =
  | 'GENERAL'
  | 'DANGEROUS'
  | 'REFRIGERATED'
  | 'OVERSIZED'
  | 'LIQUID'
  | 'BULK';

export type PackageType =
  | 'PALLET'
  | 'CARTON'
  | 'CRATE'
  | 'DRUM'
  | 'BAG'
  | 'BUNDLE'
  | 'CONTAINER'
  | 'ROLL'
  | 'OTHER';

export interface PackingListFileMetadata {
  id: string;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface ShippingDetailPayload {
  shipper?: string | null;
  consignee?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  etd?: string | null;
  pol?: string | null;
  pod?: string | null;
  directionFlow?: ShippingDirectionFlow | null;
}

export interface HblData {
  id: string;
  hblCode: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  forwarderName: string;
  vessel: string;
  voyage: string;
  consignee: string;
  shipper?: string;
}

export interface PackingListListItem {
  id: string;
  customsDeclarationId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  packingListNumber: string | null;
  mbl: string | null;
  eta: string | null;
  ata: string | null;
  note: string | null;
  forwarderId: string;
  weight: number | null;
  volume: number | null;
  numberOfPackages: number | null;
  status: PackingListStatus;
  workingStatus?: PackingListWorkingStatus;
  documentStatus?: PackingListDocumentStatus | null;
  hblData: HblData;
  directionFlow?: ShippingDirectionFlow | null;
  shippingDetail?: ShippingDetailPayload | null;
}

export interface PackingListDetail extends PackingListListItem {
  workPackingListFile: PackingListFileMetadata | null;
  workPackingListFileUrl: string | null;
  officialPackingListFile: PackingListFileMetadata | null;
  officialPackingListFileUrl: string | null;
  shippingDetail?: ShippingDetailPayload | null;
}

export interface PackingListLineResponseDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  packingListId: string;
  commodityDescription: string;
  cargoType?: CargoType | null;
  unitOfMeasure: string;
  packageTypeCode: string;
  quantity: number;
  numberOfPackages: number;
  grossWeightKg: number;
  volumeM3: number;
  imdg: string | null;
  shipmarks: string;
}

export interface PackingListLineCreatePayload {
  commodityDescription: string;
  unitOfMeasure: string;
  packageTypeCode: string;
  quantity: number;
  numberOfPackages: number;
  grossWeightKg: number;
  volumeM3: number;
  cargoType?: CargoType;
  shipmarks: string;
  imdg?: string | null;
}

export type PackingListLineUpdatePayload = Partial<PackingListLineCreatePayload>;

export interface PackingListLineFormValues {
  commodityDescription: string;
  unitOfMeasure: string;
  packageTypeCode: string;
  quantity: number | null;
  numberOfPackages: number | null;
  grossWeightKg: number | null;
  volumeM3: number | null;
  shipmarks: string | null;
  imdg: string | null;
}

export interface PackingListCreatePayload {
  hblId?: string;
  hblCode?: string | null;
  packingListNumber?: string | null;
  mbl?: string | null;
  eta?: string | null;
  ata?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  etd?: string | null;
  shippingDetail?: ShippingDetailPayload;
  pol?: string | null;
  pod?: string | null;
  note?: string | null;
  workPackingListFile?: PackingListFileMetadata | null;
  officialPackingListFile?: PackingListFileMetadata | null;
  forwarderId?: string | null;
  weight?: number | null;
  volume?: number | null;
  lines?: PackingListLineCreatePayload[];
}

export type PackingListUpdatePayload = PackingListCreatePayload;
export type SaveAsDraftPayload = PackingListCreatePayload;
export type SaveAsPartialPayload = PackingListCreatePayload;
export interface UpdateDocumentStatusPayload {
  documentStatus: PackingListDocumentStatus;
}

export interface PackingListQueryParams {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  status?: PackingListStatus;
  documentStatus?: PackingListDocumentStatus | PackingListDocumentStatus[];
  workingStatus?: PackingListWorkingStatus | PackingListWorkingStatus[];
  forwarderId?: string;
  cargoType?: CargoType;
  directionFlow?: ShippingDirectionFlow;
  orderBy?: 'createdAt' | 'updatedAt' | 'packingListNumber' | 'eta' | 'status';
  orderDir?: 'asc' | 'desc';
  containerNumber?: string;
  hblId?: string;
  eta?: string;
  hasStoredPackages?: boolean;
  storedLocationId?: string;
}

export interface PackingListFormValues {
  hblId: string | null;
  packingListNumber: string | null;
  mbl: string | null;
  eta: string | null;
  ata: string | null;
  directionFlow: ShippingDirectionFlow | null;
  note: string | null;
  workPackingListFile: PackingListFileMetadata | null;
  officialPackingListFile: PackingListFileMetadata | null;
  forwarderId: string | null;
  weight: number | null;
  volume: number | null;
  numberOfPackages: number | null;
  cargoLines: PackingListLineFormValues[];
}

export interface PackingListSearchFilters {
  search?: string;
  forwarderId?: string;
  status?: PackingListStatus;
  cargoType?: CargoType;
  directionFlow?: ShippingDirectionFlow;
  containerNumber?: string;
  hblId?: string;
  eta?: string;
  documentStatus?: PackingListDocumentStatus | PackingListDocumentStatus[];
  hasStoredPackages?: boolean;
  storedLocationId?: string;
  orderBy?: PackingListQueryParams['orderBy'];
  orderDir?: PackingListQueryParams['orderDir'];
}

export type PackingListModalMode = 'create' | 'edit' | 'view';
