// Import shared API response types from zones-locations
import type {
  ApiResponse as ZonesApiResponse,
  PaginatedResponse as ZonesPaginatedResponse,
} from '@/features/zones-locations/types';
import type { BookingOrderContainer } from '@/features/booking-orders/types';
import type { CustomsStatus, CargoReleaseStatus } from '@/shared/constants/container-status';

// Re-export for convenience
export type ApiResponse<T> = ZonesApiResponse<T>;
export type PaginatedResponse<T> = ZonesPaginatedResponse<T>;

// Re-export shared types for convenience
export type { CustomsStatus, CargoReleaseStatus };

// ===========================
// Receive Plan Entity Types
// ===========================

/**
 * Plan Status:
 * - SCHEDULED: Plan created, ready to execute
 * - IN_PROGRESS: Plan execution started (only 1 allowed at a time, hidden from workspace list, shown in minimap)
 * - PENDING: Execution completed except for rejected containers (awaiting reconciliation)
 * - DONE: Plan execution completed
 */
export type PlanStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING' | 'DONE';

/**
 * Container status within a plan (used in Phase 2 execution workflow)
 * Phase 1: Containers are always WAITING
 */
export type PlanContainerStatus =
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'DONE'
  | 'RECEIVED'
  | 'REJECTED'
  | 'DEFERRED';

/**
 * Container receive type (used in Phase 2 execution workflow)
 */
export type ContainerReceiveType = 'NORMAL' | 'PROBLEM' | 'ADJUSTED_DOCUMENT';

/**
 * Lightweight placeholder for uploaded files until storage integration is ready.
 */
export interface AttachmentPlaceholder {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ProblemSummary {
  problemTimestamp: string | null;
  documents: string[];
  photos: string[];
  notes?: string | null;
}

export interface AdjustedDocumentSummary {
  adjustedDocTimestamp: string | null;
  documents: string[];
  photos: string[];
  notes?: string | null;
}

export interface PlanContainerSummary {
  problem?: ProblemSummary | null;
  adjustedDocument?: AdjustedDocumentSummary | null;
}

/**
 * Receive Plan - Main entity for container receiving schedule
 */
export interface ReceivePlan {
  id: string;
  code: string; // Auto-generated plan code (e.g., "RP-001")
  status: PlanStatus;
  plannedStart: string; // ISO datetime
  plannedEnd: string; // ISO datetime
  executionStart: string | null; // Null in Phase 1 (used when IN_PROGRESS)
  executionEnd: string | null; // Set when status=DONE
  pendingDate?: string | null; // Timestamp when plan entered pending reconciliation
  equipmentBooked: boolean; // Equipment reservation flag
  portNotified: boolean; // Port notification flag
  containers: PlanContainer[]; // Assigned containers
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Plan Container - Container assigned to a receiving plan
 * Nested structure includes full booking order container details
 */
export interface PlanContainer {
  id: string; // plan_containers.id
  planId: string;
  orderContainerId: string; // Reference to order_containers
  assignedAt: string; // ISO timestamp
  unassignedAt: string | null;
  status: PlanContainerStatus;
  truckNo: string | null; // Truck number (used in Phase 2)
  receivedAt: string | null; // When marked received (Phase 2)
  rejectedAt: string | null; // When marked rejected (Phase 2)
  deferredAt?: string | null; // When marked deferred (timestamp provided by backend)
  receivedType: ContainerReceiveType; // Receive type (Phase 2)
  completed: boolean;
  notes: string | null;
  lastActionUser?: string | null;
  lastActionAt?: string | null;
  rejectDetails?: {
    notes: string | null;
    rejectedAt: string | null;
  } | null;
  summary?: PlanContainerSummary | null;
  bypassStorageFlag?: boolean;
  receivePlanId?: string | null;
  receivePlanCode?: string | null;

  // Nested: Full container details from booking order
  orderContainer: BookingOrderContainer;
}

/**
 * Unplanned Container - Container not assigned to any plan
 * This is the same as BookingOrderContainer from the /v1/unplanned endpoint
 */
export type UnplannedContainer = BookingOrderContainer;

/**
 * Enriched HBL Data - Extracted from forwarder HBL API
 */
export interface EnrichedHBLData {
  id: string;
  hblNo: string;
  containerNumber?: string; // Container number from HBL
  containerTypeCode?: string; // Container type code (e.g., "40HC", "20GP")
}

/**
 * Enriched Unplanned Container - Includes booking order and HBL details
 * Used in the UI to display Order Code, Agent, ETA, Vessel/Voyage, Container Type, HBL Numbers
 */
export interface EnrichedUnplannedContainer extends UnplannedContainer {
  bookingOrder?: {
    id: string;
    agentId?: string;
    code: string | null; // Order Code (e.g., "ORD-001")
    bookingNumber?: string | null; // External booking reference
    agentCode: string | null; // Forwarder Code
    eta: string; // Port Arrival date
    ata?: string | null; // Actual time of arrival
    vesselCode: string | null; // Vessel code
    voyage: string; // Voyage number
  };
  enrichedHbls?: EnrichedHBLData[]; // HBL data with container type
  atYard: boolean; // Whether container is already at yard (from backend summary)
}

// ===========================
// Form Types
// ===========================

/**
 * Plan Form Data - Used for create/edit plan modal
 * Re-exported from Zod schema to ensure single source of truth
 */
export type { PlanFormData } from '../schemas/receive-plan-schemas';

/**
 * Create Plan Request - Payload for POST /v1/plans
 */
export interface CreatePlanRequest {
  planType?: 'RECEIVING' | 'DESTUFFING';
  plannedStart: string;
  plannedEnd: string;
  equipmentBooked: boolean;
  portNotified?: boolean;
  approvedAppointment?: boolean;
  containers: {
    orderContainerId: string;
    hblIds?: string[]; // Optional: HBL IDs for destuffing plans (one-step creation)
    bypassStorageFlag?: boolean; // Optional: DESTUFFING only
  }[];
}

/**
 * Update Plan Request - Payload for PATCH /v1/plans/{id}
 */
export interface UpdatePlanRequest {
  plannedStart?: string;
  plannedEnd?: string;
  equipmentBooked?: boolean;
  portNotified?: boolean;
  approvedAppointment?: boolean;
}

/**
 * Change Plan Status Request - Payload for POST /v1/plans/{id}/status
 */
export interface ChangePlanStatusRequest {
  status: PlanStatus;
}

/**
 * Receive Container Request - Payload for PATCH /v1/plans/{planId}/containers/{containerId}/receive
 */
export interface ReceivePlanContainerRequest {
  truckNo: string;
  receivedAt?: string | null;
  notes?: string | null;
  documents?: string[];
  photos?: string[];
}

/**
 * Reject Container Request - Payload for PATCH /v1/plans/{planId}/containers/{containerId}/reject
 */
export interface RejectPlanContainerRequest {
  notes: string | null;
}

/**
 * Defer Container Request - Payload for PATCH /v1/plans/{planId}/containers/{containerId}/defer
 */
export interface DeferPlanContainerRequest {
  notes: string;
}

export interface ProblemUpdateRequest {
  receivedType: Extract<ContainerReceiveType, 'PROBLEM'>;
  summary: {
    problemTimestamp: string | null;
    documents: string[];
    photos: string[];
    notes?: string | null;
    adjustedDocument?: AdjustedDocumentSummary | null;
  };
}

export interface AdjustedDocumentUpdateRequest {
  receivedType: Extract<ContainerReceiveType, 'ADJUSTED_DOCUMENT'>;
  summary: {
    adjustedDocTimestamp: string | null;
    documents: string[];
    photos: string[];
    notes?: string | null;
    problem?: ProblemSummary | null;
  };
}

// ===========================
// API Query Types
// ===========================

/**
 * Plans Query Parameters - Used for filtering/pagination
 */
export interface PlansQueryParams {
  planType?: 'RECEIVING' | 'DESTUFFING';
  status?: PlanStatus;
  page?: number;
  itemsPerPage?: number;
  plannedStart?: {
    from?: string;
    to?: string;
  };
  executionStart?: {
    from?: string;
    to?: string;
  };
  executionEnd?: {
    from?: string;
    to?: string;
  };
  containerNumber?: string;
  sealNumber?: string;
  mblNumber?: string;
  hblNumber?: string;
  search?: string;
  orderBy?: 'plannedStart' | 'executionEnd';
  orderDir?: 'asc' | 'desc';
}

// ===========================
// Validation Types
// ===========================

/**
 * Plan Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[]; // Blocking errors (prevent save)
  warnings: string[]; // Non-blocking warnings (show toast after save)
}
