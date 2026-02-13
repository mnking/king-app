import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getPlanById } from '@/services/apiCFSPlanning';
import { enrichContainers } from '@/shared/features/plan/utils/enrich-containers';
import { planExecutionQueryKey } from '@/shared/features/plan/query-keys';
import type {
  ReceivePlan,
  PlanContainer,
  EnrichedUnplannedContainer,
} from '@/shared/features/plan/types';

export type ExecutionPlan = Omit<ReceivePlan, 'containers'> & {
  containers: Array<
    Omit<PlanContainer, 'orderContainer'> & {
      orderContainer: EnrichedUnplannedContainer;
      rejectDetails: { notes: string | null; rejectedAt: string | null } | null;
      lastActionUser: string | null;
      lastActionAt: string | null;
    }
  >;
};

interface UsePlanExecutionOptions {
  enabled?: boolean;
}

export function usePlanExecution(
  planId: string | undefined,
  options: UsePlanExecutionOptions = {},
): UseQueryResult<ExecutionPlan> {
  return useQuery({
    queryKey: planId ? planExecutionQueryKey(planId) : planExecutionQueryKey('_'),
    enabled: Boolean(planId) && (options.enabled ?? true),
    queryFn: async (): Promise<ExecutionPlan> => {
      if (!planId) {
        throw new Error('Plan ID is required to fetch execution plan');
      }

      const response = await getPlanById(planId);
      const rawPlan = response.data;

      const rawContainers = rawPlan.containers.map((pc) => pc.orderContainer);
      const enrichedContainers = await enrichContainers(rawContainers);
      const enrichedMap = new Map(
        enrichedContainers.map((container) => [container.id, container]),
      );

      const containers = rawPlan.containers.map((container) => {
        const orderContainer =
          enrichedMap.get(container.orderContainer.id) ??
          (container.orderContainer as EnrichedUnplannedContainer);

        const inferredRejectDetails =
          container.rejectDetails ||
          (container.rejectedAt || container.notes
            ? {
                notes: container.notes,
                rejectedAt: container.rejectedAt,
              }
            : null);

        return {
          ...container,
          orderContainer,
          rejectDetails: inferredRejectDetails,
          deferredAt: container.deferredAt ?? null,
          lastActionUser: container.lastActionUser ?? null,
          lastActionAt:
            container.lastActionAt ??
            container.receivedAt ??
            container.rejectedAt ??
            container.deferredAt ??
            null,
        };
      });

      return {
        ...rawPlan,
        containers,
      };
    },
    refetchOnWindowFocus: true,
    keepPreviousData: false,
    staleTime: 0,
  });
}
