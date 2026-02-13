import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getPlanById } from '@/services/apiCFSPlanning';
import type { DestuffingPlan } from '../types';
import { normalizeDestuffingPlan } from '../utils/plan-transformers';
import { enrichPlanWithBookingOrders } from '../utils/booking-order-cache';

export const destuffingPlanExecutionQueryKey = (planId: string) =>
  ['destuffing-plans', 'execution', planId] as const;

interface UseDestuffingPlanExecutionOptions {
  enabled?: boolean;
}

/**
 * Fetch a single destuffing plan by ID for execution/monitoring.
 * Used by InProgressPlanModal to display and refresh plan details.
 */
export function useDestuffingPlanExecution(
  planId: string | undefined,
  options: UseDestuffingPlanExecutionOptions = {},
): UseQueryResult<DestuffingPlan> {
  return useQuery({
    queryKey: planId
      ? destuffingPlanExecutionQueryKey(planId)
      : ['destuffing-plans', 'execution', '_'],
    enabled: Boolean(planId) && (options.enabled ?? true),
    queryFn: async (): Promise<DestuffingPlan> => {
      if (!planId) {
        throw new Error('Plan ID is required to fetch execution plan');
      }

      const response = await getPlanById(planId);
      const normalizedPlan = normalizeDestuffingPlan(response.data as DestuffingPlan);
      return enrichPlanWithBookingOrders(normalizedPlan);
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
