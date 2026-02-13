export type InspectionFile = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes: number;
};

export type Inspection = {
  note: string | null;
  documents: InspectionFile[];
  images: InspectionFile[];
};

export type TruckInfo = {
  plateNumber: string | null;
  driverName: string | null;
};

export type CustomsDeclaration = {
  declaredAt: string | null;
  declaredBy: string | null;
  referenceNo: string | null;
};

export type EmptyContainerReceivingRecord = {
  id: string;
  containerId: string;
  planStuffingId: string;
  workingResultStatus: 'waiting' | 'received' | 'rejected' | null;
  getInEmptyContainerStatus: boolean;
  receiveTime: string | null;
  inspection: Inspection;
  truck: TruckInfo;
  customsDeclaration: CustomsDeclaration;
  createdAt: string;
  updatedAt: string;
};

export type EmptyContainerReceivingListItem = EmptyContainerReceivingRecord & {
  containerPositionStatus: string | null;
  containerNumber: string;
  containerTypeCode: string;
  containerSize: string | null;
  planStuffingNumber: string;
  estimatedStuffingTime: string | null;
};

export type StuffingContainerApiStatus = 'WAITING' | 'RECEIVED' | 'REJECTED' | string;

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

export type ReceiveEmptyContainerQueryParams = {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  containerNumber?: string[];
  planCode?: string[];
  workingResultStatus?: EmptyContainerReceivingRecord['workingResultStatus'];
  estimatedStuffingFrom?: string;
  estimatedStuffingTo?: string;
  sortBy?: 'gate' | 'planner';
};

export type ReceiveEmptyContainerQueryResult = {
  results: EmptyContainerReceivingListItem[];
  total: number;
};

export type StuffingContainerQueryResult = {
  results: StuffingContainerListItem[];
  total: number;
};
