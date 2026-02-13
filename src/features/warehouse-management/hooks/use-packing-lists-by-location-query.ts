import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getPackingListsByStoredLocation } from '@/services/apiWarehouseManagement';
import type { WarehousePackingListQueryParams } from '@/features/warehouse-management/types';

export const packingListsByLocationQueryKeys = {
  all: ['packing-lists-by-location'] as const,
  list: (filters: WarehousePackingListQueryParams) =>
    [...packingListsByLocationQueryKeys.all, 'list', filters] as const,
};

export function usePackingListsByStoredLocation(
  params: WarehousePackingListQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: packingListsByLocationQueryKeys.list(params),
    queryFn: async () => {
      const response = await getPackingListsByStoredLocation(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled,
    placeholderData: keepPreviousData,
  });
}
