import type { PackingListDocumentStatus } from '../types';

export const DOCUMENT_STATUS_OPTIONS: {
  value: PackingListDocumentStatus;
  label: string;
}[] = [
  { value: 'CREATED', label: 'Created' },
  { value: 'AMENDED', label: 'Amended' },
  { value: 'APPROVED', label: 'Approved' },
];

export const isDocumentStatusTransitionDisabled = (
  currentStatus: PackingListDocumentStatus | null,
  nextStatus: PackingListDocumentStatus,
) => {
  if (!currentStatus) return false;
  if (currentStatus === 'AMENDED' && nextStatus === 'CREATED') {
    return true;
  }
  if (
    currentStatus === 'APPROVED' &&
    (nextStatus === 'CREATED' || nextStatus === 'AMENDED')
  ) {
    return true;
  }
  return false;
};
