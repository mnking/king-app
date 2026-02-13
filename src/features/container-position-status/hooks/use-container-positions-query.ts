import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { bookingOrderContainersApi } from '@/services/apiCFS';
import type {
  ContainerPosition,
  ContainerPositionFilters,
} from '../types';

export const containerPositionQueryKeys = {
  all: ['container-position-status'] as const,
  lists: () => [...containerPositionQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...containerPositionQueryKeys.lists(), filters] as const,
};

interface UseContainerPositionsOptions {
  enabled?: boolean;
  keepPreviousData?: boolean;
}

export function useAvailableContainers(
  filters: ContainerPositionFilters = {},
  options?: UseContainerPositionsOptions,
) {
  const normalizedFilters = {
    containerNo: filters.containerNo,
    forwarderId: filters.forwarderId,
    page: filters.page ?? 1,
    itemsPerPage: filters.itemsPerPage ?? 10,
  };

  return useQuery({
    queryKey: containerPositionQueryKeys.list(normalizedFilters),
    queryFn: async () => {
      const response = await bookingOrderContainersApi.getAvailable(
        normalizedFilters,
      );
      const data = response.data;
      const results = data?.results ?? [];
      return {
        ...(data ?? ({
          results: [],
          total: 0,
          page: normalizedFilters.page,
          itemsPerPage: normalizedFilters.itemsPerPage,
        } as const)),
        results: results.map((container) => container as ContainerPosition),
      };
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData:
      options?.keepPreviousData === false ? undefined : keepPreviousData,
  });
}
