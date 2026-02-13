import type { ContainerTransaction } from './container-transaction';

export interface ContainerCycle {
  id: string;
  containerNumber: string;
  code: string;
  operationMode?: string;
  startEvent: string;
  endEvent: string | null;
  cargoLoading: string;
  customsStatus: string;
  condition: string;
  sealNumber: string | null;
  containerStatus: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  notes?: string;
  transactions?: ContainerTransaction[];
}

export interface ContainerCycleCreateForm {
  containerNumber: string;
  code?: string;
  operationMode?: string;
  startEvent: string;
  endEvent?: string | null;
  cargoLoading?: string;
  customsStatus?: string;
  condition?: string;
  sealNumber?: string | null;
  containerStatus?: string;
  status?: string;
  isActive?: boolean;
}

export interface ContainerCycleEndForm {
  endEvent: string;
  status?: string;
}
