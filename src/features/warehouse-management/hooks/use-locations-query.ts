import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { zonesLocationsApi } from '@/services/apiZonesLocations';

interface LocationsQueryParams extends Record<string, unknown> {
  page?: number;
  itemsPerPage?: number;
  status?: string | string[];
  packageCount?: '0' | '1' | 'many' | Array<'0' | '1' | 'many'>;
  search?: string;
  zoneName?: string;
}

export const warehouseLocationsQueryKeys = {
  all: ['warehouse-locations'] as const,
  list: (filters: Record<string, unknown>) =>
    [...warehouseLocationsQueryKeys.all, 'list', filters] as const,
  byZone: (zoneId: string) => [...warehouseLocationsQueryKeys.all, 'byZone', zoneId] as const,
  byZoneList: (zoneId: string, filters: Record<string, unknown>) =>
    [...warehouseLocationsQueryKeys.byZone(zoneId), filters] as const,
};

export function useLocations(params: LocationsQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: warehouseLocationsQueryKeys.list(params),
    queryFn: async () => {
      const response = await zonesLocationsApi.locations.getAll(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useLocationsByZone(
  zoneId: string,
  params: LocationsQueryParams = {},
) {
  return useQuery({
    queryKey: warehouseLocationsQueryKeys.byZoneList(zoneId, params),
    queryFn: async () => {
      const response = await zonesLocationsApi.zones.getLocations(zoneId, params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!zoneId,
    placeholderData: keepPreviousData,
  });
}
