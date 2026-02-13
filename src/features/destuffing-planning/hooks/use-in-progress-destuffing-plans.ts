import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { DestuffingPlan } from '../types';
import { normalizeDestuffingPlan } from '../utils/plan-transformers';
import { enrichPlanWithBookingOrders } from '../utils/booking-order-cache';

export const inProgressDestuffingPlanQueryKey = ['in-progress-destuffing-plans'] as const;

/**
 * Fetch all destuffing plans with statuses IN_PROGRESS and DONE (no pagination).
 * Note: DONE plans can accumulate; this fetch requests all items (itemsPerPage large enough to cover current volume).
 */
export function useInProgressDestuffingPlans() {
  return useQuery({
    queryKey: inProgressDestuffingPlanQueryKey,
    queryFn: async (): Promise<DestuffingPlan[]> => {
      const statuses = ['IN_PROGRESS', 'DONE'] as const;
      const itemsPerPage = 1000; // request a large page to avoid missing DONE plans

      const responses = await Promise.all(
        statuses.map((status) =>
          getPlans({
            status,
            planType: 'DESTUFFING',
            itemsPerPage,
          }),
        ),
      );

      const planMap = new Map<string, DestuffingPlan>();
      responses.forEach((resp) => {
        resp.results.forEach((plan) => {
          planMap.set(
            plan.id,
            normalizeDestuffingPlan({ ...plan, planType: 'DESTUFFING' } as DestuffingPlan),
          );
        });
      });

      const plans = Array.from(planMap.values());
      const enrichedPlans = await Promise.all(
        plans.map((plan) => enrichPlanWithBookingOrders(plan)),
      );
      return enrichedPlans;
    },
    refetchInterval: 600000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
