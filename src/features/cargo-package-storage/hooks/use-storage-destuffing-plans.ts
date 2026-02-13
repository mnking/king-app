import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { BookingOrderHBL } from '@/features/booking-orders/types';
import type { PlanContainer, ReceivePlan } from '@/shared/features/plan/types';

const ITEMS_PER_PAGE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type StorageDestuffingPlanContainer = PlanContainer & {
  hbls?: BookingOrderHBL[];
};

export type StorageDestuffingPlan = ReceivePlan & {
  planType?: 'DESTUFFING';
  containers: StorageDestuffingPlanContainer[];
};

export const storageDestuffingPlansQueryKey = [
  'cargo-package-storage',
  'destuffing-plans',
] as const;

export function useStorageDestuffingPlans() {
  return useQuery<StorageDestuffingPlan[]>({
    queryKey: storageDestuffingPlansQueryKey,
    queryFn: async (): Promise<StorageDestuffingPlan[]> => {
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

      const planMap = new Map<string, StorageDestuffingPlan>();
      responses.forEach((resp) => {
        resp.results.forEach((plan) => {
          planMap.set(plan.id, {
            ...(plan as StorageDestuffingPlan),
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
