import type {
  ReceivePlan,
  PlanContainer,
  PlanContainerSummary,
} from '@/shared/features/plan/types';
import type { BookingOrderHBL } from '@/features/booking-orders/types';
import type {
  ContainerWorkingStatus,
  HblDestuffStatus,
  ResealMetadata,
} from './execution-types';

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

export interface DestuffingPlan extends ReceivePlan {
  planType?: 'DESTUFFING';
  forwarder?: DestuffingPlanForwarderSummary | null;
  forwarderId?: string | null;
  forwarderName?: string | null;
  forwarderCode?: string | null;
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
  hbls?: BookingOrderHBL[];
  selectedHbls?: DestuffingSelectedHbl[];
  bypassStorageFlag?: boolean;
}
