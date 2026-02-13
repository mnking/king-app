import { useQuery } from '@tanstack/react-query';
import { forwardersApi } from '@/services/apiForwarder';

// Query key factory
export const agentsQueryKey = ['agents'] as const;

/**
 * Hook to fetch and cache all forwarders (agents)
 * Uses TanStack Query with 10-minute stale time for filter datasource
 */
export function useAgents() {
  return useQuery({
    queryKey: agentsQueryKey,
    queryFn: async () => {
      const response = await forwardersApi.getAll({ status: 'Active' });
      return response.data;
    },
    staleTime: 0,
    gcTime: 15 * 60 * 1000,     // 15 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
}
