import type { ExportPlanContainerStatus, ExportPlanStatus } from '../types';

export const containerStatusOrder: Record<ExportPlanContainerStatus, number> = {
  CREATED: 0,
  SPECIFIED: 1,
  CONFIRMED: 2,
  IN_PROGRESS: 3,
  STUFFED: 4,
};

export const planStatusLabel: Record<ExportPlanStatus, string> = {
  CREATED: 'Created',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export const containerStatusLabel: Record<ExportPlanContainerStatus, string> = {
  CREATED: 'Created',
  SPECIFIED: 'Specified',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  STUFFED: 'Stuffed',
};

export const isContainerStatusBefore = (
  status: ExportPlanContainerStatus,
  target: ExportPlanContainerStatus,
): boolean => containerStatusOrder[status] < containerStatusOrder[target];

export const isContainerStatusAtLeast = (
  status: ExportPlanContainerStatus,
  target: ExportPlanContainerStatus,
): boolean => containerStatusOrder[status] >= containerStatusOrder[target];
