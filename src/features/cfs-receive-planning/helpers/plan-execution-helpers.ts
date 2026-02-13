import type { PlanContainerStatus } from '@/shared/features/plan/types';

import type { ExecutionPlan } from '../hooks/use-plan-execution';

type Container = ExecutionPlan['containers'][number];

export interface ExecutionPartition {
  waiting: Container[];
  processed: Container[];
}

export interface ExecutionSummary {
  total: number;
  waiting: number;
  received: number;
  rejected: number;
  deferred: number;
  problem: number;
  adjusted: number;
}

export const partitionContainers = (containers: Container[]): ExecutionPartition => {
  return containers.reduce<ExecutionPartition>(
    (acc, container) => {
      if (container.status === 'WAITING' || container.status === 'DEFERRED') {
        acc.waiting.push(container);
      } else {
        acc.processed.push(container);
      }
      return acc;
    },
    { waiting: [], processed: [] },
  );
};

export const calculateExecutionSummary = (containers: Container[]): ExecutionSummary => {
  let waiting = 0;
  let received = 0;
  let rejected = 0;
  let deferred = 0;
  let problem = 0;
  let adjusted = 0;

  console.log('Calculating execution summary for containers:', containers);

  containers.forEach((container) => {
    const hasProblem =
      container.receivedType === 'PROBLEM' || Boolean(container.summary?.problem);
    const hasAdjusted =
      container.receivedType === 'ADJUSTED_DOCUMENT' ||
      Boolean(container.summary?.adjustedDocument);

    switch (container.status) {
      case 'WAITING':
        waiting += 1;
        break;
      case 'RECEIVED':
        received += 1;
        break;
      case 'REJECTED':
        rejected += 1;
        break;
      case 'DEFERRED':
        deferred += 1;
        break;
      default:
        break;
    }

    if (hasProblem) {
      problem += 1;
    }
    if (hasAdjusted) {
      adjusted += 1;
    }
  });

  return {
    total: containers.length,
    waiting,
    received,
    rejected,
    deferred,
    problem,
    adjusted,
  };
};

export const calculateProgressPercentage = (
  status: PlanContainerStatus,
  total: number,
  count: number,
): number => {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / total) * 100)));
};

export const getNotePreview = (note?: string | null): string => {
  if (!note) return '';
  const firstLine = note.split('\n')[0]?.trim() ?? '';
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
};

export const shouldEnableDone = (summary: ExecutionSummary): boolean =>
  summary.total > 0 &&
  summary.waiting === 0 &&
  summary.rejected === 0 &&
  summary.deferred === 0;

export const shouldEnablePending = (summary: ExecutionSummary): boolean =>
  summary.waiting === 0 && (summary.rejected > 0 || summary.deferred > 0);

