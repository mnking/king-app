// Import shared API response types from zones-locations
import type { ApiResponse as ZonesApiResponse, PaginatedResponse as ZonesPaginatedResponse } from '@/features/zones-locations/types';
import type {
  CustomsStatus,
  CargoReleaseStatus,
  CustomsRequestStatus,
} from '@/shared/constants/container-status';

// Re-export for convenience
export type ApiResponse<T> = ZonesApiResponse<T>;
export type PaginatedResponse<T> = ZonesPaginatedResponse<T>;

// ===========================
// Booking Order Entity Types
// ===========================

export interface BookingOrder {
  id: string;
  code: string | null;                  // null for DRAFT status, populated on APPROVED
  bookingNumber?: string | null;        // [v1.4] User-editable business identifier
  status: BookingOrderStatus;
  enteredAt: string | null;
  agentId: string;
  agentCode: string | null;
  eta: string;                          // ISO date string
  ata?: string | null;                  // Actual time of arrival
  vesselId?: string | null;
  vesselCode: string | null;
  voyage: string;
  subVoyage: string | null;
  transportTripCount?: string | null;
  subTripCount?: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  containers: BookingOrderContainer[];
  createdAt: string;                    // ISO timestamp
  updatedAt: string;                    // ISO timestamp
  createdBy: string;                    // User ID who created
  updatedBy: string;                    // User ID who last updated
}

export type BookingOrderStatus = 'DRAFT' | 'APPROVED';

export interface BookingOrderContainer {
  id: string;
  orderId: string;
  orderCode?: string | null;
  containerId: string;
  containerNo: string;
  sealNumber: string | null;
  yardFreeFrom: string | null;          // ISO date string
  yardFreeTo: string | null;            // ISO date string
  extractFrom: string | null;           // ISO date string
  extractTo: string | null;             // ISO date string
  eta?: string | null;                  // Container-specific ETA (optional)
  containerFile?: ContainerFile | null;
  isPriority: boolean;
  allowStuffingOrDestuffing?: boolean | null;
  mblNumber: string | null;             // Master Bill of Lading number
  customsStatus: CustomsStatus;         // Customs clearance status
  cargoReleaseStatus: CargoReleaseStatus; // Cargo release status
  customsRequestStatus?: CustomsRequestStatus; // Customs request status
  containerStatus?: string | null;      // Position status
  summary?: ContainerSummary | null;    // JSONB field from database
  hbls: BookingOrderHBL[];
  bookingOrder?: {
    id?: string | null;
    code?: string | null;
    bookingNumber?: string | null;
    agentId?: string | null;
    agentCode?: string | null;
  } | null;
}

// Container Summary (stored in order_containers.summary JSONB field)
export interface ContainerSummary {
  typeCode?: string;                    // Container type code
  tareWeightKg?: number;                // Tare weight in kg
  cargo_nature?: CargoNature;           // Cargo nature enum
  cargo_properties?: CargoProperties;   // Dangerous goods or OOG details
  is_atyard?: boolean;                  // Whether cargo already at yard
}

export interface ContainerFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface BookingOrderHBL {
  id: string;
  orderContainerId: string;
  hblId: string;
  hblNo: string;
  summary?: HBLSummary | null;          // JSONB field from database
}

// HBL Summary (stored in order_container_hbls.summary JSONB field)
export interface HBLSummary {
  receivedAt?: string;                  // ISO date string
  issuerName?: string;                  // Forwarder name
  shipper?: string;
  consignee?: string;                   // Consignee name
  pol?: string;                         // Port of Loading
  pod?: string;                         // Port of Discharge
  vesselName?: string;
  voyageNumber?: string;
  packages?: number;                    // Package count
  customsStatus?: string;               // Customs status enum (from HBL/PL)
  packingListNo?: string | null;        // Packing list number (for destuffing selection display)
  // Cargo classification (from HBL Management feature 003)
  cargoNature?: CargoNature;            // GC, RC, HC, LC, DG, OOG
  cargoProperties?: CargoProperties;    // DG or OOG details
}

// ===========================
// Cargo Property Types (Frontend-Only)
// ===========================

export enum CargoNature {
  GC = 'GC',    // General Cargo
  RC = 'RC',    // Reefer Cargo
  HC = 'HC',    // Heavy Cargo
  LC = 'LC',    // Liquid Cargo
  DG = 'DG',    // Dangerous Goods
  OOG = 'OOG',  // Out of Gauge Cargo
}

export type IMOClass = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface DangerousGoodsProperties {
  imoClass: IMOClass;
  unNumber: string;                     // e.g., "UN 1203"
  dgPage?: string | null;               // e.g., "Vol.2 p.324"
  flashPoint?: string | null;           // Only for IMO class 3
}

export interface OutOfGaugeProperties {
  oogDescription: string;               // Long text description
}

export type CargoProperties = DangerousGoodsProperties | OutOfGaugeProperties | null;

// ===========================
// Form Types
// ===========================

export interface BookingOrderCreateForm {
  agentId: string;
  agentCode?: string;                   // Forwarder code (sent explicitly to backend)
  bookingNumber?: string | null;        // [v1.4] User-editable business identifier
  eta: string;
  vesselCode: string;
  voyage: string;
  subVoyage?: string | null;
  notes?: string | null;
  containers: ContainerFormData[];
}

export interface BookingOrderUpdateForm extends Partial<BookingOrderCreateForm> {
  id: string;
}

export interface ContainerFormData {
  id?: string;                          // For existing containers in update
  containerId: string;                  // UUID reference to container master
  containerNo: string;
  isPriority: boolean;
  isAtYard?: boolean;
  mblNumber?: string | null;            // Master Bill of Lading number
  customsStatus: CustomsStatus;         // Customs clearance status
  cargoReleaseStatus: CargoReleaseStatus; // Cargo release status
  sealNumber?: string | null;
  yardFreeFrom?: string | null;
  yardFreeTo?: string | null;
  extractFrom?: string | null;
  extractTo?: string | null;
  eta?: string | null;
  containerFile?: ContainerFile | null;
  // Frontend form fields that map to summary JSONB
  typeCode?: string;
  tareWeightKg?: number;
  cargoNature?: CargoNature;
  cargoProperties?: CargoProperties;
  hbls: HBLFormData[];
}

export interface HBLFormData {
  id?: string;                          // For existing HBLs in update
  hblId: string;
  hblNo: string;
  // Fields from HBL summary (order_container_hbls.summary JSONB)
  receivedAt?: string;                  // ISO date string
  issuerId?: string;                    // Forwarder ID (for lookup)
  issuerName?: string;                  // Forwarder name
  shipper?: string;
  consignee?: string;
  pol?: string;                         // Port of Loading
  pod?: string;                         // Port of Discharge
  vesselName?: string;
  voyageNumber?: string;
  packages?: number;
  customsStatus?: string;               // HBL-level customs status enum
  // Cargo classification (from HBL Management feature 003)
  cargoNature?: CargoNature;            // GC, RC, HC, LC, DG, OOG
  cargoProperties?: CargoProperties;    // DG or OOG details
}

// ===========================
// Query Parameter Types
// ===========================

export interface BookingOrdersQueryParams {
  page?: number;
  itemsPerPage?: number;
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'all';
  search?: string;
  agentId?: string;
  orderBy?: 'enteredAt' | 'createdAt' | 'eta';
  orderDir?: 'asc' | 'desc';
}

// ===========================
// Type Guards
// ===========================

export function isDangerousGoodsProperties(
  props: CargoProperties,
): props is DangerousGoodsProperties {
  return props != null && 'imoClass' in props;
}

export function isOutOfGaugeProperties(
  props: CargoProperties,
): props is OutOfGaugeProperties {
  return props != null && 'oogDescription' in props;
}
