// Import shared API response types from zones-locations
import type { ApiResponse as ZonesApiResponse, PaginatedResponse as ZonesPaginatedResponse } from '@/features/zones-locations/types';

// Re-export for convenience
export type ApiResponse<T> = ZonesApiResponse<T>;
export type PaginatedResponse<T> = ZonesPaginatedResponse<T>;

// ===========================
// Forwarder Entity Types
// ===========================

export interface Forwarder {
  id: string;
  code: string; // Unique identifier (e.g., "PACFWD")
  name: string; // Company name
  type: 'Forwarder' | 'NVOCC' | 'NORMAL';
  status: 'Active' | 'Inactive';
  note?: string | null;
  contactInfo?: string | null;
  contractStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | null;
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

export type ForwarderStatus = 'Active' | 'Inactive';
export interface ForwarderStats {
  totalForwarders: number;
  totalActiveForwarders: number;
  totalActiveContracts: number;
}

// Forwarder Form Types
export type ForwarderCreateForm = Pick<Forwarder, 'code' | 'name' | 'type' | 'status'> &
  Partial<
    Pick<
      Forwarder,
      'note' | 'contactInfo' | 'contractStatus' | 'contractExpireDate' | 'contractFile'
    >
  >;
export type ForwarderUpdateForm = Partial<ForwarderCreateForm>;

// ===========================
// Query Parameter Types
// ===========================

export interface ForwardersQueryParams {
  page?: number;
  itemsPerPage?: number;
  name?: string;
  type?: 'Forwarder' | 'NVOCC' | 'NORMAL';
  status?: string;
  contractStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  order?: string;
}
