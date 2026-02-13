import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { zonesLocationsApi } from '@/services/apiZonesLocations';
import type { Location } from '@/features/zones-locations/types';
import { locationsQueryKeys } from '@/features/zones-locations/hooks/use-locations-query';

export const useLocationLookup = (locationIds: string[]) => {
  const uniqueIds = useMemo(
    () => Array.from(new Set(locationIds.filter(Boolean))),
    [locationIds],
  );

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: locationsQueryKeys.detail(id),
      queryFn: async () => {
        const response = await zonesLocationsApi.locations.getById(id);
        return response.data;
      },
      enabled: Boolean(id),
      staleTime: 0,
      retry: 1,
    })),
  });

  const lookup = useMemo(() => {
    const map = new Map<string, Location>();
    queries.forEach((query, index) => {
      const data = query.data as Location | undefined;
      if (data) {
        map.set(uniqueIds[index], data);
      }
    });
    return map;
  }, [queries, uniqueIds]);

  return {
    lookup,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
  };
};
