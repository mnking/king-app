import type { ClearanceStatus } from './types';

export const statusLabels: Record<ClearanceStatus, string> = {
  unregistered: 'Unregistered',
  registered: 'Registered',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const statusDescriptions: Record<ClearanceStatus, string> = {
  unregistered: 'In progress',
  registered: 'In progress',
  pending: 'Awaiting customs decision',
  approved: 'Cleared',
  rejected: 'Requires correction',
};

export const statusToStepIndex: Record<ClearanceStatus, number> = {
  unregistered: 0,
  registered: 1,
  pending: 2,
  approved: 3,
  rejected: 3,
};

export const nextStatusOptions: Record<ClearanceStatus, ClearanceStatus[]> = {
  unregistered: ['registered'],
  registered: ['pending'],
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};
