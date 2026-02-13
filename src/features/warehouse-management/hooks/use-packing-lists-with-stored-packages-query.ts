import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getPackingListsWithStoredPackages } from '@/services/apiWarehouseManagement';
import type { WarehousePackingListQueryParams } from '@/features/warehouse-management/types';

export const packingListsStoredQueryKeys = {
  all: ['packing-lists-stored'] as const,
  list: (filters: WarehousePackingListQueryParams) =>
    [...packingListsStoredQueryKeys.all, 'list', filters] as const,
};

export function usePackingListsWithStoredPackages(
  params: WarehousePackingListQueryParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: packingListsStoredQueryKeys.list(params),
    queryFn: async () => {
      const response = await getPackingListsWithStoredPackages(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled,
    placeholderData: keepPreviousData,
  });
}
