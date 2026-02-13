import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getLocationPackages } from '@/services/apiWarehouseManagement';
import type { WarehousePackageListQueryParams } from '@/features/warehouse-management/types';

export const warehousePackagesQueryKeys = {
  all: ['warehouse-packages'] as const,
  list: (filters: WarehousePackageListQueryParams) =>
    [...warehousePackagesQueryKeys.all, 'list', filters] as const,
};

export function useWarehousePackages(
  params: WarehousePackageListQueryParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: warehousePackagesQueryKeys.list(params),
    queryFn: async () => {
      const response = await getLocationPackages(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled,
    placeholderData: keepPreviousData,
  });
}
