export type ExportCargoReceivingStatus = 'DRAFT' | 'PARTIAL' | 'APPROVED' | 'DONE';

export type ExportCargoReceivingWorkingStatus =
  | 'INITIALIZED'
  | 'IN_PROGRESS'
  | 'DONE';

export type ExportCargoReceivingDirectionFlow = 'IMPORT' | 'EXPORT';

export type ExportCargoReceivingOrderBy =
  | 'updatedAt'
  | 'createdAt'
  | 'packingListNumber'
  | 'eta'
  | 'status';

export type ExportCargoReceivingOrderDir = 'asc' | 'desc';

export interface ExportCargoReceivingQueryParams {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  forwarderId?: string;
  status?: ExportCargoReceivingStatus;
  containerNumber?: string;
  directionFlow?: ExportCargoReceivingDirectionFlow;
  workingStatus?:
    | ExportCargoReceivingWorkingStatus
    | ExportCargoReceivingWorkingStatus[];
  orderBy?: ExportCargoReceivingOrderBy;
  orderDir?: ExportCargoReceivingOrderDir;
}

export interface ExportCargoReceivingForwarderQueryParams {
  page?: number;
  itemsPerPage?: number;
  name?: string;
  status?: string;
}

export interface ExportCargoReceivingApiResponse<T> {
  data: T;
  statusCode?: number;
}

export interface ExportCargoReceivingPaginatedResponse<T> {
  results: T[];
  total: number;
  page?: number;
  itemsPerPage?: number;
}

export interface ExportCargoReceivingForwarder {
  id: string;
  name: string;
}

export type ExportCargoReceivingPackageTransactionStatus =
  | 'IN_PROGRESS'
  | 'DONE';

export interface ExportCargoReceivingPackageTransactionPackage {
  id: string;
  packageNo?: string | null;
  positionStatus?: string | null;
}

export interface ExportCargoReceivingPackageTransaction {
  id: string;
  status?: ExportCargoReceivingPackageTransactionStatus | string | null;
  packages?: ExportCargoReceivingPackageTransactionPackage[];
}

export interface ExportCargoReceivingPackingListListItem {
  id: string;
  packingListNumber?: string | null;
  numberOfPackages?: number | null;
  forwarderId?: string | null;
  status?: ExportCargoReceivingStatus | null;
  workingStatus?: ExportCargoReceivingWorkingStatus | null;
  directionFlow?: ExportCargoReceivingDirectionFlow | null;
  receivedPackageCount?: number | null;
  checkedPackageCount?: number | null;
  storedPackageCount?: number | null;
  hblData?: {
    containerNumber?: string | null;
    containerType?: string | null;
    forwarderName?: string | null;
    shipper?: string | null;
    consignee?: string | null;
  } | null;
  shippingDetail?: {
    shipper?: string | null;
    consignee?: string | null;
    pol?: string | null;
    pod?: string | null;
    vesselName?: string | null;
    voyageNumber?: string | null;
    etd?: string | null;
    directionFlow?: ExportCargoReceivingDirectionFlow | null;
  } | null;
}

export type ExportCargoReceivingListItem = ExportCargoReceivingPackingListListItem & {
  forwarderName?: string | null;
  serviceOrderNumber?: string | null;
};

export interface ExportCargoReceivingServiceOrder {
  id: string;
  code?: string | null;
  packingLists?: Array<{
    packingListId?: string | null;
  }> | null;
}
