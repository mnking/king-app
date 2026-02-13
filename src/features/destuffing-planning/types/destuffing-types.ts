import type {
  ReceivePlan,
  PlanContainer,
  PlanContainerSummary,
  EnrichedUnplannedContainer,
} from '@/shared/features/plan/types';
import type {
  ContainerWorkingStatus,
  HblDestuffStatus,
  ResealMetadata,
} from '@/features/destuffing-execution/types';

// ===========================
// Destuffing Plan Types
// ===========================

export interface DestuffingPlanForwarderSummary {
  id?: string | null;
  name?: string | null;
  code?: string | null;
}

export interface DestuffingSelectedHbl {
  hblId: string;
  hblCode: string;
  packingListNo?: string | null;
}

export interface DestuffingPlanHbl {
  id: string;
  destuffingPlanContainerId: string;
  hblId: string;
  hblNo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  assignedWarehouseZone: string | null;
  actualQuantity: number | null;
  notes: string | null;
}

/**
 * DestuffingPlan extends the base ReceivePlan with forwarder metadata.
 * Additional workflow fields (e.g., approvedAppointment) are optional because
 * backend support is still rolling out.
 */
export interface DestuffingPlan extends ReceivePlan {
  planType?: 'DESTUFFING';
  forwarder?: DestuffingPlanForwarderSummary | null;
  forwarderId?: string | null;
  forwarderName?: string | null;
  forwarderCode?: string | null;
  approvedAppointment?: boolean;
  appointmentConfirmed?: boolean;
  containers: DestuffingPlanContainer[];
}

export interface DestuffingPlanContainerSummary extends PlanContainerSummary {
  plannedHbls?: HblDestuffStatus[];
  reseal?: ResealMetadata | null;
  selectedHbls?: DestuffingSelectedHbl[];
}

export interface DestuffingPlanContainer extends PlanContainer {
  workingStatus?: ContainerWorkingStatus;
  unsealedAt?: string | null;
  unsealedBy?: string | null;
  resealedAt?: string | null;
  resealedBy?: string | null;
  newSealNumber?: string | null;
  cargoLoadedStatus?: 'empty' | 'partial' | 'full' | string | null;
  summary?: DestuffingPlanContainerSummary | null;
  /**
   * Backend may return selected HBLs either via plan container summary or
   * directly on the container response. Surface both for UI hydration.
   */
  hbls?: DestuffingPlanHbl[];
  selectedHbls?: DestuffingSelectedHbl[];
  bypassStorageFlag?: boolean;
}

export type DestuffingHblSelections = Record<string, DestuffingSelectedHbl[]>;

export type DestuffingContainerChangeStatus = 'unchanged' | 'add' | 'update' | 'remove';

export interface DestuffingPlanContainerChange {
  orderContainerId: string;
  planContainerId?: string | null;
  label: string;
  hblIds: string[];
}

export interface DestuffingPlanContainerRemoval {
  planContainerId: string;
  orderContainerId: string;
  label: string;
}

export interface DestuffingPlanModalChangesPayload {
  additions: DestuffingPlanContainerChange[];
  updates: DestuffingPlanContainerChange[];
  removals: DestuffingPlanContainerRemoval[];
}

// ===========================
// Unplanned Container Types
// ===========================

/**
 * Destuffing unplanned containers use the same enriched data structure as
 * receiving containers with a few optional placeholders for future backend fields.
 */
export type UnplannedDestuffingContainer = EnrichedUnplannedContainer & {
  forwarderId?: string | null;
  forwarderName?: string | null;
  priorityScore?: number | null;
  lastDestuffedAt?: string | null;
  planContainerId?: string | null;
  planId?: string | null;
  bypassStorageFlag?: boolean;
};

// ===========================
// Partial Destuffing Containers
// ===========================

export interface PartialDestuffingContainer {
  id: string;
  planId: string | null;
  receivePlanId: string | null;
  receivePlanCode: string | null;
  orderContainerId: string | null;
  assignedAt: string | null;
  unassignedAt: string | null;
  status: string | null;
  truckNo: string | null;
  receivedAt: string | null;
  rejectedAt: string | null;
  receivedType: string | null;
  completed: boolean;
  notes: string | null;
  summary?: {
    sealNumber?: string | null;
    completedAt?: string | null;
  } | null;
  orderContainer?: {
    id?: string | null;
    orderId?: string | null;
    bookingOrderId?: string | null;
    bookingNumber?: string | null;
    containerId?: string | null;
    containerNo?: string | null;
    containerNumber?: string | null; // fallback for older payloads
    containerType?: string | null;   // fallback for older payloads
    sealNumber?: string | null;
    mblNumber?: string | null;
    forwarderName?: string | null;
    yardFreeFrom?: string | null;
    yardFreeTo?: string | null;
    extractFrom?: string | null;
    extractTo?: string | null;
    customsClearedAt?: string | null;
    cargoReleasedAt?: string | null;
    isPriority?: boolean | null;
    customsStatus?: string | null;
    cargoReleaseStatus?: string | null;
    summary?: {
      typeCode?: string | null;
      is_atyard?: boolean | null;
      cargo_nature?: string | null;
      tareWeightKg?: number | null;
      cargo_properties?: Record<string, unknown> | null;
    } | null;
    hbls?: Array<{
      id?: string | null;
      orderContainerId?: string | null;
      hblId?: string | null;
      hblNo?: string | null;
      summary?: Record<string, unknown> | null;
    }> | null;
  } | null;
  latestSealNumber?: string | null;
  hbls?: Array<{
    id?: string | null;
    orderContainerId?: string | null;
    hblId?: string | null;
    hblNo?: string | null;
    summary?: Record<string, unknown> | null;
  }> | null;
}
