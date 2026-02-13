import type { ContainerSnapshot } from './container';

export interface ContainerTransaction {
  id: string;
  containerId: string | null;
  containerNumber: string;
  containerSnapshot: ContainerSnapshot;
  cycleId: string;
  eventType: string;
  cargoLoading: string;
  customsStatus: string;
  condition: string;
  sealNumber: string | null;
  status: string;
  displayStatus?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  details?: string;
}

export interface ContainerTransactionCreateForm {
  containerNumber: string;
  cycleId?: string;
  eventType: string;
  cargoLoading?: string;
  customsStatus?: string;
  condition?: string;
  sealNumber?: string | null;
  status?: string;
  timestamp: string;
}
