import type { ContainerType } from './container-types';
import type { ContainerCycle } from './container-cycle';

export interface ContainerSnapshot {
  id: string | null;
  number: string;
  containerTypeCode: string;
  containerType: ContainerType | null;
}

export interface Container {
  id: string;
  number: string;
  containerTypeCode: string;
  containerType: ContainerType;
  createdAt: string;
  updatedAt: string;
}

export interface ContainerDetail extends Container {
  currentCycle: ContainerCycle | null;
  currentCycleTransactionCount: number | null;
}

export interface ContainerCreateForm {
  number: string;
  containerTypeCode: string;
}

export interface ContainerUpdateForm {
  number?: string;
  containerTypeCode?: string;
}
