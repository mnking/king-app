import type { DestuffingPlan } from '../types';

/**
 * Determine the best timestamp to represent when a destuffing plan entered the pending queue.
 * Falls back through execution/persistence fields when pendingDate is absent.
 */
export const getPendingComparableDate = (plan: DestuffingPlan) =>
  plan.pendingDate ?? plan.executionEnd ?? plan.updatedAt ?? plan.createdAt ?? null;

/**
 * Sort pending destuffing plans so the most recent items appear first.
 */
export const sortPendingPlansByRecency = (
  plans: DestuffingPlan[],
): DestuffingPlan[] => {
  const toTimestamp = (value: string | null | undefined) =>
    value ? new Date(value).getTime() : 0;

  return [...plans].sort((a, b) => {
    const aValue = toTimestamp(getPendingComparableDate(a));
    const bValue = toTimestamp(getPendingComparableDate(b));
    return bValue - aValue;
  });
};

/**
 * Reorder containers so rejected entries surface to the top of the list.
 */
export const reorderPendingPlanContainers = (
  containers: DestuffingPlan['containers'],
) => {
  const rejected: typeof containers = [];
  const others: typeof containers = [];

  containers.forEach((container) => {
    if (container.status === 'REJECTED') {
      rejected.push(container);
    } else {
      others.push(container);
    }
  });

  return [...rejected, ...others];
};

/**
 * Calculate total HBL count across all containers in a plan
 */
export const calculateTotalHBLs = (plan: DestuffingPlan): number => {
  return plan.containers.reduce((total, container) => {
    const hblCount = container.orderContainer.hbls?.length ?? 0;
    const selectedHblCount = container.selectedHbls?.length ?? 0;
    // Use the max of both since selectedHbls might be a subset
    return total + Math.max(hblCount, selectedHblCount);
  }, 0);
};
