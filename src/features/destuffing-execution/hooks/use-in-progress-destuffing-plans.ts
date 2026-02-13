import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { DestuffingPlan } from '../types';
import { normalizeDestuffingPlan } from '../helpers/plan-normalizers';
import { enrichPlanWithBookingOrders } from '../utils/booking-order-cache';

export const inProgressDestuffingPlanQueryKey = [
  'destuffing-execution',
  'in-progress-plans',
] as const;

export function useInProgressDestuffingPlans() {
  return useQuery({
    queryKey: inProgressDestuffingPlanQueryKey,
    queryFn: async (): Promise<DestuffingPlan[]> => {
      const response = await getPlans({
        status: 'IN_PROGRESS',
        planType: 'DESTUFFING'
      });

      const normalizedPlans = response.results.map((plan) =>
        normalizeDestuffingPlan({
          ...plan,
          planType: 'DESTUFFING',
        } as DestuffingPlan),
      );

      return Promise.all(normalizedPlans.map((plan) => enrichPlanWithBookingOrders(plan)));
    },
    refetchInterval: 600000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    cacheTime: 0,
  });
}
