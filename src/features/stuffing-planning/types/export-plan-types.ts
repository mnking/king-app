export type ExportPlanStatus = 'CREATED' | 'IN_PROGRESS' | 'DONE';

export type ExportPlanContainerStatus =
  | 'CREATED'
  | 'SPECIFIED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'STUFFED';

export interface DocumentFileInfo {
  id: string;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface ExportPlanContainerCheckingFile {
  id: string;
  url?: string | null;
  name?: string | null;
}

export interface ExportPlanContainerCheckingResult {
  note?: string | null;
  image?: ExportPlanContainerCheckingFile | null;
  document?: ExportPlanContainerCheckingFile | null;
  driverName?: string | null;
  truckNumber?: string | null;
}

export interface ExportPlanContainerMoveInfo {
  truckNumber?: string | null;
  driverName?: string | null;
}

export type ExportPlanContainerCustomsDeclarationType =
  | 'GET_IN_EMPTY'
  | 'GET_OUT_STUFFED';

export interface ExportPlanContainerCustomsDeclarationPayload {
  declarationType: ExportPlanContainerCustomsDeclarationType;
}

export interface ExportPlanContainer {
  id: string;
  planId: string;
  containerTypeCode?: string | null;
  containerNumber?: string | null;
  sealNumber?: string | null;
  stuffingDocument?: DocumentFileInfo | null;
  stuffingPhoto?: DocumentFileInfo | null;
  stuffingNote?: string | null;
  status: ExportPlanContainerStatus;
  checkingResult?: ExportPlanContainerCheckingResult | null;
  moveInfo?: ExportPlanContainerMoveInfo | null;
  equipmentBooked: boolean;
  appointmentBooked: boolean;
  estimatedStuffingAt?: string | null;
  estimatedMoveAt?: string | null;
  confirmedAt?: string | null;
  stuffedAt?: string | null;
  notes?: string | null;
  assignedPackingListCount: number;
}

export interface ExportPlanPackingList {
  id: string;
  packingListId?: string | null;
  packingListNumber?: string | null;
  customsDeclarationNumber?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  planContainerId?: string | null;
}

export interface ExportPlan {
  id: string;
  exportOrderId: string;
  code?: string | null;
  status: ExportPlanStatus;
  loadingBatch?: string | null;
  containers: ExportPlanContainer[];
  packingLists: ExportPlanPackingList[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportPlanListResponse {
  results: ExportPlan[];
  total: number;
}

export interface ExportPlanQueryParams {
  page?: number;
  itemsPerPage?: number;
  status?: ExportPlanStatus | 'all';
  exportOrderId?: string;
  orderBy?: 'createdAt';
  orderDir?: 'asc' | 'desc';
}

export interface ExportPlanCreatePayload {
  exportOrderId: string;
  loadingBatch?: string | null;
}

export interface ExportPlanUpdatePayload {
  loadingBatch?: string | null;
}

export interface ExportPlanContainerPayload {
  containerTypeCode?: string | null;
  containerNumber?: string | null;
  equipmentBooked?: boolean;
  appointmentBooked?: boolean;
  estimatedStuffingAt?: string | null;
  estimatedMoveAt?: string | null;
  notes?: string | null;
  checkingResult?: ExportPlanContainerCheckingResult | null;
  moveInfo?: ExportPlanContainerMoveInfo | null;
}

export interface ExportPlanContainerStatusPayload {
  status: ExportPlanContainerStatus;
}

export interface ExportPlanContainerSealPayload {
  sealNumber: string;
  stuffingDocument: DocumentFileInfo;
  stuffingPhoto?: DocumentFileInfo | null;
  stuffingNote?: string | null;
}

export interface ExportPlanStatusPayload {
  status: ExportPlanStatus;
}

export interface ExportPlanPackingListAssignment {
  packingListId: string;
  planContainerId: string | null;
}

export interface ExportPlanPackingListAssignmentPayload {
  assignments: ExportPlanPackingListAssignment[];
}
