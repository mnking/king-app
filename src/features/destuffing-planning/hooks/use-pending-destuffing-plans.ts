import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { PaginatedResponse } from '@/shared/features/plan/types';
import type { DestuffingPlan } from '../types';
import { normalizeDestuffingPlan } from '../utils/plan-transformers';

/**
 * Query key factory for pending destuffing plans
 */
export const pendingDestuffingPlansKeys = {
  all: ['pending-destuffing-plans'] as const,
  lists: () => [...pendingDestuffingPlansKeys.all, 'list'] as const,
};

/**
 * Fetch pending destuffing plans with enriched data
 *
 * API: GET /v1/plans?status=PENDING&planType=DESTUFFING&includeReceivePlanInfo=true
 *
 * @returns Query result with pending destuffing plans
 */
export function usePendingDestuffingPlans(
  options?: Partial<
    UseQueryOptions<
      PaginatedResponse<DestuffingPlan>,
      Error,
      PaginatedResponse<DestuffingPlan>,
      ReturnType<typeof pendingDestuffingPlansKeys.lists>
    >
  >,
) {
  return useQuery({
    queryKey: pendingDestuffingPlansKeys.lists(),
    queryFn: async (): Promise<PaginatedResponse<DestuffingPlan>> => {
      const response = await getPlans({
        status: 'PENDING',
        planType: 'DESTUFFING',
        includeReceivePlanInfo: true,
      });

      return {
        ...response,
        results: response.results.map((plan) =>
          normalizeDestuffingPlan({
            ...plan,
            planType: 'DESTUFFING',
          } as DestuffingPlan),
        ),
      };
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    staleTime: 0,
    ...options,
  });
}
