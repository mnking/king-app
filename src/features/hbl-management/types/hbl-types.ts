import type {
  ApiResponse as ZonesApiResponse,
  PaginatedResponse as ZonesPaginatedResponse,
} from '@/features/zones-locations/types';
import type { Forwarder } from '@/features/forwarder';

export type ApiResponse<T> = ZonesApiResponse<T>;
export type PaginatedResponse<T> = ZonesPaginatedResponse<T>;

export type ShippingDirectionFlow = 'IMPORT' | 'EXPORT';

export type CargoTypeCode =
  | 'BN'
  | 'GP'
  | 'DG'
  | 'OD'
  | 'WD'
  | 'DR'
  | 'UD'
  | 'MT'
  | 'ED'
  | 'EF'
  | 'ER'
  | 'ET'
  | 'RF'
  | 'RO'
  | 'OG'
  | 'OO'
  | 'OW'
  | 'UC';

export interface ShippingDetail {
  forwarderId?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  notifyParty?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  containerNumber?: string | null;
  containerTypeCode?: string | null;
  sealNumber?: string | null;
  mbl?: string | null;
  eta?: string | null;
  ata?: string | null;
  atd?: string | null;
  pol?: string | null;
  pod?: string | null;
  directionFlow?: ShippingDirectionFlow | null;
}

export interface HblPackingListLineFormValues {
  commodityDescription: string;
  unitOfMeasure: string;
  packageTypeCode: CargoTypeCode | null;
  quantity: number | null;
  numberOfPackages: number | null;
  grossWeightKg: number | null;
  volumeM3: number | null;
  shipmarks: string | null;
  imdg: string | null;
}

export interface HblPackingListLinePayload {
  commodityDescription: string;
  unitOfMeasure: string;
  packageTypeCode: CargoTypeCode;
  quantity: number;
  numberOfPackages: number;
  grossWeightKg: number;
  volumeM3: number;
  shipmarks?: string | null;
  imdg?: string | null;
  cargoType?: CargoTypeCode | null;
}

export interface HblPackingListLineResponseDto {
  id: string;
  packingListId: string;
  commodityDescription: string;
  unitOfMeasure: string;
  packageTypeCode: CargoTypeCode;
  quantity: number;
  numberOfPackages: number;
  grossWeightKg: number;
  volumeM3: number;
  shipmarks?: string | null;
  imdg?: string | null;
  cargoType?: CargoTypeCode | null;
}

export interface HBLContainer {
  containerNumber: string;
  containerTypeCode: string;
  sealNumber: string;
}

export interface HblPackingListLink {
  id: string;
  packingListNumber: string | null;
  status: string;
}

export interface HblDestuffMetadata {
  document: {
    id: string;
    name: string;
    url: string;
    sizeBytes: number;
    mimeType: string;
  } | null;
  image: {
    id: string;
    name: string;
    url: string;
    sizeBytes: number;
    mimeType: string;
  } | null;
  note: string | null;
  classification: string | null;
  onHoldRequested: boolean;
}

export interface HouseBill {
  id: string;
  code: string;
  receivedAt: string;
  document: {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
    sizeBytes?: number;
  } | null;
  issuerId: string;
  issuer?: Forwarder;
  shipper: string;
  consignee: string;
  notifyParty?: string | null;
  cargoDescription?: string | null;
  packageCount?: number | null;
  packageType?: string | null;
  cargoWeight?: number | null;
  volume?: number | null;
  vesselName: string;
  voyageNumber: string;
  pol: string;
  pod: string;
  mbl?: string | null;
  eta?: string | null;
  etd?: string | null;
  shippingDetail?: ShippingDetail | null;
  directionFlow?: ShippingDirectionFlow | null;
  containers: HBLContainer[];
  isPaid?: boolean;
  deliveryAllowed?: boolean;
  deliveryDate?: string | null;
  workingStatus?: string;
  packingList?: HblPackingListLink | null;
  packingListId?: string | null;
  packingListNumber?: string | null;
  packingListStatus?: string | null;
  packingListLines?: HblPackingListLinePayload[];
  destuffStatus?: string;
  destuffClassification?: string;
  destuffMetadata?: HblDestuffMetadata | null;
  destuffedAt?: string | null;
  status?: 'pending' | 'approved' | 'done';
  bypassStorageFlag?: boolean | null;
  isApproved?: boolean;
  isDone?: boolean;
  documentStatus?: string;
  customsStatus?: string;
  marked?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type HBLStatus = 'pending' | 'approved' | 'done';

export interface HBLCreateForm {
  code?: string;
  receivedAt?: string;
  document?: HouseBill['document'];
  issuerId?: string;
  shipper?: string;
  consignee?: string;
  notifyParty?: string | null;
  vesselName?: string;
  voyageNumber?: string;
  pol?: string;
  pod?: string;
  mbl?: string | null;
  containers?: HBLContainer[];
  shippingDetail?: ShippingDetail | null;
  packingListLines?: HblPackingListLinePayload[];
  directionFlow?: ShippingDirectionFlow | null;
}
export type HBLUpdateForm = Partial<HBLCreateForm> & {
  customsStatus?: string | null;
};

export interface HBLsQueryParams {
  page?: number;
  itemsPerPage?: number;
  status?: string;
  receivedAt?: string;
  issuerId?: string;
  hblIds?: string[];
  keywords?: string;
  containerNumber?: string;
  sealNumber?: string;
  hasPackingList?: boolean;
  customsStatus?: string | string[];
  workingStatus?: string | string[];
  directionFlow?: ShippingDirectionFlow;
  packingListWorkingStatus?: string | string[];
  sortField?:
    | 'code'
    | 'receivedAt'
    | 'shipper'
    | 'consignee'
    | 'notifyParty'
    | 'vesselName'
    | 'voyageNumber'
    | 'pol'
    | 'pod';
  sortOrder?: 'ASC' | 'DESC';
}
