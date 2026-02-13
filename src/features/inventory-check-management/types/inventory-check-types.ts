export interface InventoryPlanDocument {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes: number;
}

export type InventoryPlanCheckStatus =
  | 'CREATED'
  | 'RECORDING'
  | 'RECORDED'
  | 'EXPLAINED'
  | 'ADJUSTING'
  | 'DONE'
  | 'CANCELED';

export type InventoryPlanCheckType = 'INTERNAL' | 'CUSTOM';

export interface InventoryPlanCheck {
  id: string;
  estimateStartTime: string;
  type: InventoryPlanCheckType;
  note: string;
  membersNote: string;
  actualStartTime: string;
  resultDocument: InventoryPlanDocument | null;
  actualEndTime: string;
  locationMismatchFlag: boolean;
  qtyMismatchFlag: boolean;
  status: InventoryPlanCheckStatus;
}

export interface InventoryPlanCheckQueryResult {
  results: InventoryPlanCheck[];
  total: number;
}

export interface InventoryPlanCheckQueryParams {
  estimateStartFrom?: string;
  estimateStartTo?: string;
  actualStartFrom?: string;
  actualStartTo?: string;
  actualEndFrom?: string;
  actualEndTo?: string;
  type?: InventoryPlanCheckType;
  mismatchFlags?: Array<'location' | 'qty'>;
}
