import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@/features/zones-locations/types';

export type ApiResponse<T> = SharedApiResponse<T>;
export type PaginatedResponse<T> = SharedPaginatedResponse<T>;

export type ExportServiceOrderStatus = 'DRAFT' | 'APPROVED' | 'DONE';

export interface ExportServiceOrderDocumentFile {
  id: string;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface ExportServiceOrderBookingConfirmation {
  bookingNumber?: string | null;
  bookingDate?: string | null;
  shippingLine?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  etd?: string | null;
  pol?: string | null;
  pod?: string | null;
  note?: string | null;
  bookingFile?: ExportServiceOrderDocumentFile | null;
}

export interface ExportServiceOrderBookingContainer {
  containerTypeCode?: string | null;
  amount?: number | null;
}

export interface ExportServiceOrderPackingList {
  id: string;
  orderId?: string | null;
  packingListId?: string | null;
  packingListNumber?: string | null;
  customsDeclarationNumber?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  packingListFile?: ExportServiceOrderDocumentFile | null;
  workingStatus?: string | null;
  planned?: boolean | null;
}

export interface ExportServiceOrder {
  id: string;
  code?: string | null;
  planId?: string | null;
  status: ExportServiceOrderStatus;
  forwarderId?: string | null;
  forwarderCode?: string | null;
  requestTime?: string | null;
  bookingConfirmation?: ExportServiceOrderBookingConfirmation | null;
  bookingContainers: ExportServiceOrderBookingContainer[];
  approvedBy?: string | null;
  approvedAt?: string | null;
  packingLists: ExportServiceOrderPackingList[];
  createdAt: string;
  updatedAt: string;
}

export type ExportServiceOrderDetail = ExportServiceOrder;

export interface ExportServiceOrderPackingListPayload {
  id?: string;
  packingListId?: string;
  packingListNumber?: string;
  customsDeclarationNumber?: string;
  shipper?: string;
  consignee?: string;
  packingListFile?: ExportServiceOrderDocumentFile | null;
}

export interface ExportServiceOrderPayload {
  forwarderId?: string;
  forwarderCode?: string;
  requestTime?: string;
  bookingConfirmation?: ExportServiceOrderBookingConfirmation | null;
  bookingContainers?: ExportServiceOrderBookingContainer[];
}

export interface ExportServiceOrderPackingListAssignPayload {
  packingListId: string;
  packingListNumber?: string;
  customsDeclarationNumber?: string;
  shipper?: string;
  consignee?: string;
}

export interface ExportServiceOrderPackingListTransferPayload {
  packingListId: string;
  targetOrderId: string;
}

export interface ExportServiceOrderQueryParams {
  page?: number;
  itemsPerPage?: number;
  status?: 'DRAFT' | 'APPROVED' | 'DONE' | 'all' | 'not_done';
  orderNumber?: string;
  forwarderId?: string;
  requestDate?: string;
  orderBy?: 'requestTime' | 'createdAt';
  orderDir?: 'asc' | 'desc';
}

export interface ExportServiceOrderFormPackingList {
  clientId: string;
  id?: string | null;
  packingListId?: string | null;
  packingListNumber?: string | null;
  customsDeclarationNumber?: string | null;
  shipper?: string | null;
  consignee?: string | null;
  workingStatus?: string | null;
  planned?: boolean | null;
}

export interface ExportServiceOrderFormBookingConfirmation {
  bookingNumber: string | null;
  bookingDate: string | null;
  shippingLine: string | null;
  vessel: string | null;
  voyage: string | null;
  etd: string | null;
  pol: string | null;
  pod: string | null;
  note: string | null;
  bookingFile: ExportServiceOrderDocumentFile | null;
}

export interface ExportServiceOrderFormBookingContainer {
  clientId: string;
  containerTypeCode: string | null;
  amount: number | null;
}

export interface ExportServiceOrderFormValues {
  forwarderId: string | null;
  forwarderCode: string | null;
  requestTime: string | null;
  bookingConfirmation: ExportServiceOrderFormBookingConfirmation;
  bookingContainers: ExportServiceOrderFormBookingContainer[];
  packingLists: ExportServiceOrderFormPackingList[];
}

export type ExportServiceOrderModalMode = 'create' | 'edit' | 'view';
