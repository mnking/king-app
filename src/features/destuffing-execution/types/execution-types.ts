export type ContainerWorkingStatus = 'waiting' | 'in-progress' | 'done' | 'on-hold';

export type HblDestuffStatusValue = 'waiting' | 'in-progress' | 'done' | 'on-hold';

export type DestuffClassification = 'passed' | 'unmatched' | 'on-hold';

export interface DestuffFileInfo {
  id: string;
  name: string;
  url?: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface DestuffResult {
  timestamp: string;
  document: DestuffFileInfo | null;
  image: DestuffFileInfo | null;
  note: string | null;
  classification: DestuffClassification;
  onHoldFlag: boolean;
}

export interface HblDestuffStatus {
  hblId: string;
  hblCode: string;
  packingListId: string | null;
  packingListNo: string | null;
  bypassStorageFlag?: boolean | null;
  destuffStatus: HblDestuffStatusValue;
  inspectionSessionId: string | null;
  destuffResult: DestuffResult | null;
}

export interface ResealMetadata {
  timestamp: string;
  newSealNumber: string;
  onHoldFlag: boolean;
  note: string | null;
}
