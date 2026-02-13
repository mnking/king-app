import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { zonesLocationsApi } from '@/services/apiZonesLocations';

interface ZonesQueryParams extends Record<string, unknown> {
  page?: number;
  itemsPerPage?: number;
  status?: string | string[];
}

const zonesQueryKeys = {
  all: ['warehouse-zones'] as const,
  list: (filters: Record<string, unknown>) =>
    [...zonesQueryKeys.all, 'list', filters] as const,
};

export function useZones(params: ZonesQueryParams = {}) {
  return useQuery({
    queryKey: zonesQueryKeys.list(params),
    queryFn: async () => {
      const response = await zonesLocationsApi.zones.getAll(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
