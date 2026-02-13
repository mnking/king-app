import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '@/services/apiCFSPlanning';
import { enrichContainers } from '@/shared/features/plan/utils/enrich-containers';
import { getCachedBookingOrderById } from '../utils/booking-order-cache';
import type { UnplannedDestuffingContainer } from '../types';

export const unplannedDestuffingQueryKeys = {
  all: ['destuffing', 'unplanned-containers'] as const,
  list: (filters: Record<string, unknown>) =>
    [...unplannedDestuffingQueryKeys.all, filters] as const,
};

/**
 * Fetch list of unplanned containers eligible for destuffing.
 * Currently enriched with booking order + HBL data for display purposes.
 */
export function useUnplannedDestuffingContainers(
  forwarderId?: string,
  options?: Partial<
    UseQueryOptions<
      UnplannedDestuffingContainer[],
      Error,
      UnplannedDestuffingContainer[],
      ReturnType<typeof unplannedDestuffingQueryKeys.list>
    >
  >,
) {
  return useQuery({
    queryKey: unplannedDestuffingQueryKeys.list({
      forwarderId: forwarderId ?? null,
    }),
    queryFn: async (): Promise<UnplannedDestuffingContainer[]> => {
      const response = await api.getUnplannedDestuffingContainers(forwarderId);
      const enriched = await enrichContainers(response.data, {
        getBookingOrderById: getCachedBookingOrderById,
      });

      return enriched.map((container) => ({
        ...container,
        bypassStorageFlag: container.bypassStorageFlag ?? false,
        // TODO: Replace fallback when backend returns explicit forwarder metadata
        forwarderName: container.bookingOrder?.agentCode ?? 'Unknown Forwarder',
      }));
    },
    retry: 1,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
    ...options,
  });
}
