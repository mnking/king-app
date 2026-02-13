import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/apiCFSPlanning';
import type { EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import { enrichContainers } from '@/shared/features/plan/utils/enrich-containers';
import { unplannedQueryKeys } from '@/shared/features/plan/query-keys';

// ===========================
// Query Hooks
// ===========================

/**
 * Fetch list of unplanned containers (not assigned to any plan)
 * Enriched with:
 * - Booking order details (Order Code, Agent, ETA, Vessel/Voyage)
 * - HBL data (Container Type, HBL Numbers)
 * - Random cargo nature (temporary until backend provides)
 * - Random yard status (temporary until backend provides)
 */
export function useUnplannedContainers() {
  return useQuery({
    queryKey: unplannedQueryKeys.all,
    queryFn: async (): Promise<EnrichedUnplannedContainer[]> => {
      // 1. Fetch unplanned containers
      const response = await api.getUnplannedContainers();
      const containers = response.data;

      // 2. Enrich containers with booking order and HBL data
      return enrichContainers(containers);
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

// ===========================
// Utility Hooks
// ===========================

/**
 * Utility hook for unplanned containers query operations
 */
export function useUnplannedQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUnplanned: () =>
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all }),
    refetchUnplanned: () =>
      queryClient.refetchQueries({ queryKey: unplannedQueryKeys.all }),
  };
}
