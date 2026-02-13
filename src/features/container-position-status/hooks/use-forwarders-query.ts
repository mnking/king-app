import { useQuery } from '@tanstack/react-query';
import { forwardersApi } from '@/services/apiForwarder';
import type { Forwarder, ForwardersQueryParams } from '@/features/forwarder/types';

interface UseForwardersOptions {
  enabled?: boolean;
}

/**
 * Local forwarder lookup hook scoped to container position status feature.
 * Keeps this page stable even if the shared forwarder hook changes.
 */
export function useForwardersForContainerPosition(
  params: ForwardersQueryParams = {},
  options?: UseForwardersOptions,
) {
  const mergedParams = {
    status: 'Active',
    itemsPerPage: 100,
    ...params,
  };

  return useQuery({
    queryKey: ['container-position-forwarders', mergedParams],
    queryFn: async () => {
      const response = await forwardersApi.getAll(mergedParams);
      // Limit type exposure to minimal data we need
      return response.data as { results: Forwarder[]; total: number };
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}
