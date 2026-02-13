import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getPlanById } from '@/services/apiCFSPlanning';
import type {
  DestuffingPlan,
  DestuffingPlanContainer,
} from '@/features/destuffing-execution/types';
import { normalizeDestuffingPlan } from '@/features/destuffing-execution/helpers/plan-normalizers';
import { enrichPlanWithBookingOrders } from '@/features/destuffing-execution/utils/booking-order-cache';

export const inProgressDestuffingPlanKey = (planId: string) =>
  ['destuffing-execution', 'plan', planId] as const;

interface UseInProgressPlanOptions {
  enabled?: boolean;
}

export function useInProgressPlan(
  planId: string | undefined,
  options: UseInProgressPlanOptions = {},
): UseQueryResult<DestuffingPlan> {
  return useQuery({
    queryKey: planId ? inProgressDestuffingPlanKey(planId) : ['destuffing-execution', 'plan', '_'],
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
    refetchOnMount: 'always',
    staleTime: 0,
    cacheTime: 0,
  });
}

export function useContainerWorkingStatus(
  planId: string | undefined,
  containerId: string | undefined,
): {
  container: DestuffingPlanContainer | undefined;
  query: UseQueryResult<DestuffingPlan>;
} {
  const query = useInProgressPlan(planId, {
    enabled: Boolean(planId && containerId),
  });

  const container = query.data?.containers.find(
    (item) => item.id === containerId || item.orderContainerId === containerId,
  );

  return { container, query };
}
