import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/apiCFSPlanning';
import type { ReceivePlan } from '../types/receive-plan-types';
import { inProgressPlanQueryKey } from '../query-keys';

/**
 * Hook to fetch the current IN_PROGRESS plan
 *
 * - Only one IN_PROGRESS plan can exist at a time
 * - Polls every 10 minutes to check if plan still exists
 * - Used by MiniMapWidget to show/hide based on IN_PROGRESS plan existence
 *
 * @returns Query result with IN_PROGRESS plan or null
 */
export function useInProgressPlan() {
  return useQuery<ReceivePlan | null>({
    queryKey: inProgressPlanQueryKey,
    queryFn: async () => {
      try {
        // Fetch plans with status=IN_PROGRESS (with pagination params)
        const response = await getPlans({
          status: 'IN_PROGRESS',
          planType: 'RECEIVING',
          page: 1,
          itemsPerPage: 10,
        });

        // Should only have 0 or 1 IN_PROGRESS plan
        if (response.results && response.results.length > 0) {
          // If multiple exist (shouldn't happen), log warning and return first
          if (response.results.length > 1) {
            console.warn(
              `Multiple IN_PROGRESS plans found (${response.results.length}). Expected at most 1. Using first plan.`,
            );
          }
          return response.results[0];
        }

        // No IN_PROGRESS plan exists
        return null;
      } catch (error) {
        console.error('Failed to fetch IN_PROGRESS plan:', error);
        // Return null instead of throwing to avoid breaking UI
        return null;
      }
    },
    // Poll every 10 minutes (600000ms)
    refetchInterval: 10 * 60 * 1000,
    // Also refetch when user returns to window
    refetchOnWindowFocus: true,
    // Always enabled (will return null if no IN_PROGRESS plan)
    enabled: true,
  });
}

