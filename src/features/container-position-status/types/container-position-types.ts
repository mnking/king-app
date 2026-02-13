import type {
  ContainerSummary,
  ContainerFile,
} from '@/features/booking-orders/types';
import type {
  CustomsStatus,
  CargoReleaseStatus,
} from '@/shared/constants/container-status';

export type PositionStatus = 'AT_PORT' | 'IN_YARD' | null;

export interface ContainerPositionFilters {
  containerNo?: string;
  forwarderId?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface ContainerPositionOrderInfo {
  id: string;
  code: string | null;
  status: string;
  agentId: string;
  agentCode: string | null;
  bookingNumber?: string | null;
  eta: string;
  vesselId?: string | null;
  vesselCode?: string | null;
  voyage?: string | null;
  subVoyage?: string | null;
}

export interface ContainerPosition {
  id: string;
  orderId: string;
  containerId: string;
  containerNo: string;
  mblNumber: string | null;
  sealNumber: string | null;
  yardFreeFrom: string | null;
  yardFreeTo: string | null;
  extractFrom: string | null;
  extractTo: string | null;
  customsClearedAt: string | null;
  cargoReleasedAt: string | null;
  isPriority: boolean;
  customsStatus: CustomsStatus;
  cargoReleaseStatus: CargoReleaseStatus;
  containerFile: ContainerFile | null;
  summary?: ContainerSummary | null;
  containerStatus?: PositionStatus | string | null;
  order?: ContainerPositionOrderInfo | null;
}

export type ContainerPositionRow = {
  id: string;
  orderId: string;
  containerNumber: string;
  sealNumber: string;
  forwarder: string;
  eta: string;
  positionStatus: PositionStatus;
};
