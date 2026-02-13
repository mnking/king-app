import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { DestuffingPlan, DestuffingPlanContainer } from '../types';
import { normalizeDestuffingPlan } from '../utils/plan-transformers';

export const plannedDestuffingHblIdsQueryKey = ['destuffing', 'planned-hbl-ids'] as const;

const collectContainerHblIds = (container: DestuffingPlanContainer): string[] => {
  const summarySelections = container.summary?.selectedHbls ?? [];
  if (summarySelections.length > 0) {
    return summarySelections
      .map((selection) => selection.hblId)
      .filter((hblId): hblId is string => Boolean(hblId));
  }

  const selections = container.selectedHbls ?? container.hbls ?? [];
  return selections
    .map((selection) =>
      selection.hblId ?? ('id' in selection ? selection.id : null),
    )
    .filter((hblId): hblId is string => Boolean(hblId));
};

const collectPlannedHblIds = (plans: DestuffingPlan[]): string[] => {
  const plannedIds = new Set<string>();
  plans.forEach((plan) => {
    (plan.containers ?? []).forEach((container) => {
      collectContainerHblIds(container).forEach((hblId) => {
        plannedIds.add(hblId);
      });
    });
  });
  return Array.from(plannedIds);
};

export function usePlannedDestuffingHblIds() {
  return useQuery({
    queryKey: plannedDestuffingHblIdsQueryKey,
    queryFn: async (): Promise<string[]> => {
      const statuses = ['SCHEDULED', 'IN_PROGRESS', 'PENDING'] as const;
      const itemsPerPage = 1000;

      const responses = await Promise.all(
        statuses.map((status) =>
          getPlans({
            status,
            planType: 'DESTUFFING',
            itemsPerPage,
          }),
        ),
      );

      const plans = responses.flatMap((response) =>
        response.results.map((plan) =>
          normalizeDestuffingPlan({
            ...plan,
            planType: 'DESTUFFING',
          } as DestuffingPlan),
        ),
      );

      return collectPlannedHblIds(plans);
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
