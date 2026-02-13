import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { BookingOrderHBL } from '@/features/booking-orders/types';
import type { PlanContainer, ReceivePlan } from '@/shared/features/plan/types';

const ITEMS_PER_PAGE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type DeliveryDestuffingPlanContainer = PlanContainer & {
  hbls?: BookingOrderHBL[];
};

export type DeliveryDestuffingPlan = ReceivePlan & {
  planType?: 'DESTUFFING';
  containers: DeliveryDestuffingPlanContainer[];
};

export const deliveryDestuffingPlansQueryKey = [
  'cfs-cargo-package-delivery',
  'destuffing-plans',
] as const;

export function useDeliveryDestuffingPlans() {
  return useQuery<DeliveryDestuffingPlan[]>({
    queryKey: deliveryDestuffingPlansQueryKey,
    queryFn: async (): Promise<DeliveryDestuffingPlan[]> => {
      const statuses = ['IN_PROGRESS', 'DONE'] as const;

      const responses = await Promise.all(
        statuses.map((status) =>
          getPlans({
            status,
            planType: 'DESTUFFING',
            itemsPerPage: ITEMS_PER_PAGE,
          }),
        ),
      );

      const planMap = new Map<string, DeliveryDestuffingPlan>();
      responses.forEach((resp) => {
        resp.results.forEach((plan) => {
          planMap.set(plan.id, {
            ...(plan as DeliveryDestuffingPlan),
            planType: 'DESTUFFING',
          });
        });
      });

      return Array.from(planMap.values());
    },
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS * 2,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}
