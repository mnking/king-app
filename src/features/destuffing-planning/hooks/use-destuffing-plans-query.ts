import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { PlansQueryParams, PaginatedResponse } from '@/shared/features/plan/types';
import type { DestuffingPlan } from '../types';
import { normalizeDestuffingPlan } from '../utils/plan-transformers';
import { enrichPlanWithBookingOrders } from '../utils/booking-order-cache';

export const destuffingPlanQueryKeys = {
  all: ['destuffing-plans'] as const,
  list: (filters: Record<string, unknown>) =>
    [...destuffingPlanQueryKeys.all, filters] as const,
};

/**
 * Fetch paginated list of destuffing plans.
 * Reuses the shared GET /v1/plans endpoint with planType=DESTUFFING.
 */
export function useDestuffingPlans(
  params: PlansQueryParams = {},
  options?: Partial<
    UseQueryOptions<
      PaginatedResponse<DestuffingPlan>,
      Error,
      PaginatedResponse<DestuffingPlan>
    >
  >,
) {
  return useQuery({
    queryKey: destuffingPlanQueryKeys.list(params),
    queryFn: async (): Promise<PaginatedResponse<DestuffingPlan>> => {
      const response = await getPlans({
        ...params,
        planType: 'DESTUFFING',
      });

      const normalizedResults = response.results.map((plan) =>
        normalizeDestuffingPlan({
          ...plan,
          planType: 'DESTUFFING',
        } as DestuffingPlan),
      );

      const enrichedResults = await Promise.all(
        normalizedResults.map((plan) => enrichPlanWithBookingOrders(plan)),
      );

      return {
        ...response,
        results: enrichedResults,
      };
    },
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
}
