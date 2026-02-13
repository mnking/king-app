import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@/features/zones-locations/types';

export type ApiResponse<T> = SharedApiResponse<T>;
export type PaginatedResponse<T> = SharedPaginatedResponse<T>;

export type CustomsDeclarationStatus = 'PENDING' | 'APPROVED';

export type CustomsClearanceSource = 'API' | 'MANUAL';

export type CustomsDeclarationsOrderField = 'registeredAt' | 'createdAt';

export interface CustomsDeclarationsListQueryParams {
  page?: number;
  itemsPerPage?: number;
  order?: Partial<Record<CustomsDeclarationsOrderField, 'ASC' | 'DESC'>>;
  code?: string;
  hblId?: string;
  registeredFrom?: string;
  registeredTo?: string;
}

export interface CustomsDeclarationDocumentFile {
  id: string;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface CustomsDeclarationMetadata {
  consignee?: string | null;
  etd?: string | null;
}

export interface CustomsDeclarationResponse {
  id: string;
  packingListId: string;
  status: CustomsDeclarationStatus;
  code?: string | null;
  customsOffice?: string | null;
  registeredAt?: string | null;
  mainDocument?: CustomsDeclarationDocumentFile | null;
  clearanceSource: CustomsClearanceSource;
  metadata: CustomsDeclarationMetadata;
  createdAt: string;
  updatedAt: string;
}

export type CustomsDeclarationsListResponse = PaginatedResponse<CustomsDeclarationResponse>;

export interface CustomsDeclarationCreatePayload {
  packingListId: string;
  code?: string | null;
  customsOffice?: string | null;
  registeredAt?: string | null;
  mainDocument?: CustomsDeclarationDocumentFile | null;
  clearanceSource?: CustomsClearanceSource;
  metadata?: CustomsDeclarationMetadata | null;
}

export type CustomsDeclarationUpdatePayload =
  Partial<CustomsDeclarationCreatePayload>;

export interface CustomsDeclarationFormValues {
  code: string;
  customsOffice: string;
  registeredAt: string;
  consignee: string;
  mainDocument: CustomsDeclarationDocumentFile | null;
  etd: string;
  clearanceSource: CustomsClearanceSource;
}
