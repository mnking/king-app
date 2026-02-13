import { useQuery } from '@tanstack/react-query';
import { forwardersApi } from '@/services/apiForwarder';

// Query key factory
export const forwardersQueryKey = ['forwarders'] as const;

/**
 * Hook to fetch and cache all forwarders for booking order form modal
 * Uses TanStack Query with 10-minute stale time
 */
export function useForwarders() {
  return useQuery({
    queryKey: forwardersQueryKey,
    queryFn: async () => {
      const response = await forwardersApi.getAll({ status: 'Active' });
      return response.data;
    },
    staleTime: 0,
    gcTime: 15 * 60 * 1000,     // 15 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
}
