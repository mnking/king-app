import type { Document } from '@/features/document-service/types';

export type DirectionFlow = 'import' | 'export';
export type ClearanceStatus =
  | 'unregistered'
  | 'registered'
  | 'pending'
  | 'approved'
  | 'rejected';

export type ClearanceRecord = {
  id: string;
  direction: DirectionFlow;
  status: ClearanceStatus;
  hblNumber: string;
  file: Document | null;
};

export type ModalMode = 'view' | 'edit';
