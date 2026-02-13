export type ExportOrderStatus = 'DRAFT' | 'APPROVED' | 'DONE';

export interface ExportOrderBookingConfirmation {
  vessel?: string | null;
  voyage?: string | null;
  etd?: string | null;
  pol?: string | null;
  pod?: string | null;
  shippingLine?: string | null;
}

export interface ExportOrder {
  id: string;
  code?: string | null;
  planId?: string | null;
  status: ExportOrderStatus;
  forwarderId?: string | null;
  forwarderCode?: string | null;
  requestTime?: string | null;
  bookingConfirmation?: ExportOrderBookingConfirmation | null;
}

export interface ExportOrderListResponse {
  results: ExportOrder[];
  total: number;
}

export interface ExportOrderQueryParams {
  page?: number;
  itemsPerPage?: number;
  status?: ExportOrderStatus | 'all' | 'not_done';
  orderNumber?: string;
  forwarderId?: string;
  requestDate?: string;
  orderBy?: 'requestTime' | 'createdAt';
  orderDir?: 'asc' | 'desc';
}

