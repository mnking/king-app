export type UploadedFile = {
  id: string;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
};

export enum StuffedMoveWorkingResultStatus {
  RECEIVED = 'received',
  MOVED = 'moved',
}

export type TruckInfo = {
  plateNumber: string | null;
  driverName: string | null;
};

export type CustomsDeclarationInfo = {
  declaredAt: string | null;
  declaredBy: string | null;
  referenceNo: string | null;
};

export type ContainerRef = {
  id: string;
  number: string;
  containerTypeCode: string;
  size?: string | null;
  description?: string | null;
};

export type PlanStuffingRef = {
  id: string;
  number: string;
  forwarder?: string | null;
  estimateMoveTime?: string | null;
  etd?: string | null;
};

export type StuffedContainerMoveOut = {
  id: string;
  containerId: string;
  planStuffingId: string;
  container?: ContainerRef | null;
  planStuffing?: PlanStuffingRef | null;
  workingResultStatus: StuffedMoveWorkingResultStatus;
  getOutContainerStatus: boolean;
  estimateMoveTime: string | null;
  etd: string | null;
  actualMoveTime: string | null;
  truck: TruckInfo;
  customsDeclaration: CustomsDeclarationInfo;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MoveStuffedContainerPayload = {
  plateNumber: string;
  driverName: string;
};

export type DeclareGetOutPayload = {
  referenceNo?: string | null;
};

export type StuffedContainerMoveOutListItem = StuffedContainerMoveOut & {
  containerNumber: string;
  containerTypeCode: string;
  containerSize: string | null;
  planStuffingNumber: string;
  forwarder: string | null;
};

export type MoveLoadedContainerQueryParams = {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  containerNumber?: string[];
  planCode?: string[];
  workingResultStatus?: StuffedMoveWorkingResultStatus;
  getOutContainerStatus?: boolean;
  estimateMoveFrom?: string;
  estimateMoveTo?: string;
  sortBy?: 'gate' | 'planner';
};

export type MoveLoadedContainerQueryResult = {
  results: StuffedContainerMoveOutListItem[];
  total: number;
};

export type StuffingContainerApiStatus =
  | 'WAITING'
  | 'MOVED'
  | string;

export type StuffingContainerListItem = {
  id: string;
  planId: string;
  planCode: string;
  containerNumber: string;
  containerTypeCode: string;
  workingResultStatus: StuffingContainerApiStatus;
  isContainerOut: boolean;
  isContainerIn: boolean;
  actualMoveTime: string | null;
  receivedAt: string | null;
  estimateMoveTime: string | null;
  etd: string | null;
  forwarderCode: string | null;
};

export type StuffingContainerQueryResult = {
  results: StuffingContainerListItem[];
  total: number;
};
