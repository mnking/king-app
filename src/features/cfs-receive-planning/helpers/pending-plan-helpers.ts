import type { EnrichedReceivePlan } from '../hooks/use-plans-query';

/**
 * Determine the best timestamp to represent when a plan entered the pending queue.
 * Falls back through execution/persistence fields when pendingDate is absent.
 */
export const getPendingComparableDate = (plan: EnrichedReceivePlan) =>
  plan.pendingDate ?? plan.executionEnd ?? plan.updatedAt ?? plan.createdAt ?? null;

/**
 * Sort pending plans so the most recent items appear first.
 */
export const sortPendingPlansByRecency = (
  plans: EnrichedReceivePlan[],
): EnrichedReceivePlan[] => {
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
  containers: EnrichedReceivePlan['containers'],
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

