import type {
  ApiResponse as ZonesApiResponse,
  PaginatedResponse as ZonesPaginatedResponse,
} from '@/features/zones-locations/types';

export type ApiResponse<T> = ZonesApiResponse<T>;
export type PaginatedResponse<T> = ZonesPaginatedResponse<T>;

// ===========================
// Shipping Line Entity Types
// ===========================

export interface ShippingLine {
  id: string;
  code: string;
  name: string;
  type: 'NORMAL';
  status: ShippingLineStatus;
  note?: string | null;
  contactInfo?: string | null;
  contractStatus?: ShippingLineContractStatus | null;
  contractExpireDate?: string | null;
  contractFile?: {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    sizeBytes: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type ShippingLineStatus = 'ACTIVE' | 'INACTIVE';
export type ShippingLineContractStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'N/A';

export interface ShippingLineStats {
  totalShippingLines: number;
  totalActiveShippingLines: number;
  totalActiveContracts: number;
}

export type ShippingLineCreateForm = Pick<ShippingLine, 'code' | 'name' | 'type' | 'status'> &
  Partial<
    Pick<
      ShippingLine,
      'note' | 'contactInfo' | 'contractStatus' | 'contractExpireDate' | 'contractFile'
    >
  >;
export type ShippingLineUpdateForm = Partial<ShippingLineCreateForm>;

// ===========================
// Query Parameter Types
// ===========================

export interface ShippingLinesQueryParams {
  page?: number;
  itemsPerPage?: number;
  name?: string;
  type?: string;
  status?: string;
  contractStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  order?: string;
}
