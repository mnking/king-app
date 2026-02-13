import React from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { zonesLocationsApi } from '@/services/apiZonesLocations';
import {
  Location,
  LocationCreateForm,
  LocationUpdateForm,
  PaginatedResponse,
  LocationLayoutRequest,
  LocationLayoutResponse,
} from '../types';
import { zonesQueryKeys } from './use-zones-query';

// Query Keys
export const locationsQueryKeys = {
  all: ['locations'] as const,
  lists: () => [...locationsQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...locationsQueryKeys.lists(), filters] as const,
  details: () => [...locationsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationsQueryKeys.details(), id] as const,
  byZone: (zoneId: string) =>
    [...locationsQueryKeys.all, 'byZone', zoneId] as const,
  byZoneList: (zoneId: string, filters: Record<string, unknown>) =>
    [...locationsQueryKeys.byZone(zoneId), filters] as const,
};

// Query Options
interface LocationsQueryParams extends Record<string, unknown> {
  page?: number;
  itemsPerPage?: number;
  status?: string;
}

// Hooks
export function useLocationsByZone(
  zoneId: string,
  params: LocationsQueryParams = {},
) {
  return useQuery({
    queryKey: locationsQueryKeys.byZoneList(zoneId, params),
    queryFn: async () => {
      const response = await zonesLocationsApi.zones.getLocations(
        zoneId,
        params,
      );
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!zoneId,
    placeholderData: keepPreviousData, // v5 syntax - keeps previous page visible while loading next
  });
}

export function useLocationCounts(zoneIds: string[], status?: string) {
  return useQuery({
    queryKey: ['location-counts', status ?? 'all', zoneIds.sort()],
    queryFn: async () => {
      const counts: Record<string, number> = {};

      // Fetch location counts for each zone
      const promises = zoneIds.map(async (zoneId) => {
        try {
          const response = await zonesLocationsApi.zones.getLocations(zoneId, {
            page: 1,
            itemsPerPage: 1, // We only need the total count, not the actual data
            ...(status ? { status } : {}),
          });
          counts[zoneId] = response.data.total || 0;
        } catch {
          // Silently handle errors - count will default to 0
          counts[zoneId] = 0;
        }
      });

      await Promise.all(promises);
      return counts;
    },
    staleTime: 0,
    retry: 1,
    enabled: zoneIds.length > 0,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationsQueryKeys.detail(id),
    queryFn: async () => {
      const response = await zonesLocationsApi.locations.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LocationCreateForm) => {
      const response = await zonesLocationsApi.locations.create(data);
      return response.data;
    },
    onSuccess: (newLocation) => {
      // Invalidate locations by zone
      queryClient.invalidateQueries({
        queryKey: locationsQueryKeys.byZone(newLocation.zoneId),
      });

      // Optimistically add to cache for immediate UI update
      queryClient.setQueriesData<PaginatedResponse<Location>>(
        { queryKey: locationsQueryKeys.byZone(newLocation.zoneId) },
        (oldData: PaginatedResponse<Location> | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              results: [newLocation, ...oldData.results],
              total: oldData.total + 1,
            };
          }
          return {
            results: [newLocation],
            total: 1,
            page: 1,
            itemsPerPage: 50,
          };
        },
      );

      // Update zone's location count in zone queries
      queryClient.invalidateQueries({
        queryKey: zonesQueryKeys.detail(newLocation.zoneId),
      });
    },
  });
}

export function useCreateLocationLayout() {
  const queryClient = useQueryClient();

  return useMutation<
    LocationLayoutResponse,
    Error,
    { zoneId: string; payload: LocationLayoutRequest }
  >({
    mutationFn: async ({ zoneId, payload }) => {
      const response = await zonesLocationsApi.locations.createLayout(
        zoneId,
        payload,
      );
      return response.data;
    },
    onSuccess: (response, variables) => {
      const zoneId = variables.zoneId;
      queryClient.invalidateQueries({
        queryKey: locationsQueryKeys.byZone(zoneId),
      });
      queryClient.invalidateQueries({
        queryKey: zonesQueryKeys.detail(zoneId),
      });

      if (response.created?.length) {
        queryClient.setQueriesData<PaginatedResponse<Location>>(
          { queryKey: locationsQueryKeys.byZone(zoneId) },
          (oldData: PaginatedResponse<Location> | undefined) => {
            if (oldData) {
              return {
                ...oldData,
                results: [...response.created, ...oldData.results],
                total: oldData.total + response.created.length,
              };
            }
            return {
              results: response.created,
              total: response.created.length,
              page: 1,
              itemsPerPage: 50,
            };
          },
        );
      }
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: LocationUpdateForm;
    }) => {
      const response = await zonesLocationsApi.locations.update(id, data);
      return response.data;
    },
    onSuccess: (updatedLocation) => {
      // Update specific location in cache
      queryClient.setQueryData(
        locationsQueryKeys.detail(updatedLocation.id),
        updatedLocation,
      );

      // Update locations by zone lists
      queryClient.setQueriesData<PaginatedResponse<Location>>(
        { queryKey: locationsQueryKeys.byZone(updatedLocation.zoneId) },
        (oldData: PaginatedResponse<Location> | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((location: Location) =>
                location.id === updatedLocation.id ? updatedLocation : location,
              ),
            };
          }
          return oldData;
        },
      );
    },
  });
}

export function useUpdateLocationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Location['status'];
    }) => {
      const response = await zonesLocationsApi.locations.updateStatus(
        id,
        status,
      );
      return response.data;
    },
    onSuccess: (updatedLocation) => {
      // Update specific location in cache
      queryClient.setQueryData(
        locationsQueryKeys.detail(updatedLocation.id),
        updatedLocation,
      );

      // Update locations by zone lists
      queryClient.setQueriesData<PaginatedResponse<Location>>(
        { queryKey: locationsQueryKeys.byZone(updatedLocation.zoneId) },
        (oldData: PaginatedResponse<Location> | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((location: Location) =>
                location.id === updatedLocation.id ? updatedLocation : location,
              ),
            };
          }
          return oldData;
        },
      );
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the location to know its zone
      const locationQuery = queryClient.getQueryData<Location>(
        locationsQueryKeys.detail(id),
      );
      if (!locationQuery) {
        // If not in cache, fetch it first
        const response = await zonesLocationsApi.locations.getById(id);
        const location = response.data;
        await zonesLocationsApi.locations.delete(id);
        return { id, zoneId: location.zoneId };
      }

      await zonesLocationsApi.locations.delete(id);
      return { id, zoneId: locationQuery.zoneId };
    },
    onSuccess: ({ id: deletedId, zoneId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: locationsQueryKeys.detail(deletedId),
      });

      // Update locations by zone lists
      queryClient.setQueriesData<PaginatedResponse<Location>>(
        { queryKey: locationsQueryKeys.byZone(zoneId) },
        (oldData: PaginatedResponse<Location> | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter(
                (location: Location) => location.id !== deletedId,
              ),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      // Update zone's location count
      queryClient.invalidateQueries({
        queryKey: zonesQueryKeys.detail(zoneId),
      });
    },
  });
}

export function useBulkUpdateLocationStatuses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: Location['status'];
    }) => {
      // Update each location sequentially
      const updatePromises = ids.map((id) =>
        zonesLocationsApi.locations.updateStatus(id, status),
      );

      const responses = await Promise.all(updatePromises);
      return responses.map((response) => response.data);
    },
    onSuccess: (updatedLocations) => {
      // Group locations by zone for efficient cache updates
      const locationsByZone = new Map<string, Location[]>();

      updatedLocations.forEach((location) => {
        // Update individual location cache
        queryClient.setQueryData(
          locationsQueryKeys.detail(location.id),
          location,
        );

        // Group by zone
        const zoneLocations = locationsByZone.get(location.zoneId) || [];
        zoneLocations.push(location);
        locationsByZone.set(location.zoneId, zoneLocations);
      });

      // Update locations by zone lists for each affected zone
      locationsByZone.forEach((locations, zoneId) => {
        queryClient.setQueriesData<PaginatedResponse<Location>>(
          { queryKey: locationsQueryKeys.byZone(zoneId) },
          (oldData: PaginatedResponse<Location> | undefined) => {
            if (oldData) {
              return {
                ...oldData,
                results: oldData.results.map((location: Location) => {
                  const updatedLocation = locations.find(
                    (updated) => updated.id === location.id,
                  );
                  return updatedLocation || location;
                }),
              };
            }
            return oldData;
          },
        );
      });
    },
  });
}

export function useBulkDeleteLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Get locations from cache to know their zones
      const locationsByZone = new Map<string, string[]>();

      for (const id of ids) {
        const locationQuery = queryClient.getQueryData<Location>(
          locationsQueryKeys.detail(id),
        );
        if (locationQuery) {
          const zoneLocations = locationsByZone.get(locationQuery.zoneId) || [];
          zoneLocations.push(id);
          locationsByZone.set(locationQuery.zoneId, zoneLocations);
        }
      }

      // If some locations are not in cache, we need a different strategy
      if (locationsByZone.size === 0) {
        // Invalidate all location queries instead of trying to update optimistically
        await Promise.all(
          ids.map((id) => zonesLocationsApi.locations.delete(id)),
        );
        return { deletedIds: ids, locationsByZone: new Map() };
      }

      // Delete each location sequentially
      await Promise.all(
        ids.map((id) => zonesLocationsApi.locations.delete(id)),
      );
      return { deletedIds: ids, locationsByZone };
    },
    onSuccess: ({ deletedIds, locationsByZone }) => {
      // Remove from cache
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: locationsQueryKeys.detail(id) });
      });

      if (locationsByZone.size > 0) {
        // Update locations by zone lists for each affected zone
        locationsByZone.forEach((locationIds, zoneId) => {
          queryClient.setQueriesData<PaginatedResponse<Location>>(
            { queryKey: locationsQueryKeys.byZone(zoneId) },
            (oldData: PaginatedResponse<Location> | undefined) => {
              if (oldData) {
                const deletedIdSet = new Set(locationIds);
                return {
                  ...oldData,
                  results: oldData.results.filter(
                    (location: Location) => !deletedIdSet.has(location.id),
                  ),
                  total: oldData.total - locationIds.length,
                };
              }
              return oldData;
            },
          );

          // Update zone's location count
          queryClient.invalidateQueries({
            queryKey: zonesQueryKeys.detail(zoneId),
          });
        });
      } else {
        // If we don't have zone info, invalidate all location queries
        queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: zonesQueryKeys.all });
      }
    },
  });
}

// Selection state management (kept separate from TanStack Query cache)
export function useLocationSelection() {
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<
    string[]
  >([]);

  const toggleLocationSelection = React.useCallback((id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  }, []);

  const selectAllLocations = React.useCallback((locationIds: string[]) => {
    setSelectedLocationIds(locationIds);
  }, []);

  const clearLocationSelection = React.useCallback(() => {
    setSelectedLocationIds([]);
  }, []);

  const isLocationSelected = React.useCallback(
    (id: string) => selectedLocationIds.includes(id),
    [selectedLocationIds],
  );

  const selectedCount = selectedLocationIds.length;

  return {
    selectedLocationIds,
    toggleLocationSelection,
    selectAllLocations,
    clearLocationSelection,
    isLocationSelected,
    selectedCount,
  };
}

// Utility hook for location-related queries
export function useLocationQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateLocations: () =>
      queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all }),
    invalidateLocationsByZone: (zoneId: string) =>
      queryClient.invalidateQueries({
        queryKey: locationsQueryKeys.byZone(zoneId),
      }),
    invalidateLocation: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: locationsQueryKeys.detail(id),
      }),
    refetchLocationsByZone: (zoneId: string) =>
      queryClient.refetchQueries({
        queryKey: locationsQueryKeys.byZone(zoneId),
      }),
  };
}

// Utility functions (extract from old hooks)
export function generateLocationCode(
  zoneCode: string,
  type: 'RBS' | 'CUSTOM',
  details: {
    rbsRow?: string;
    rbsBay?: string;
    rbsSlot?: string;
    customLabel?: string;
  },
): string {
  if (type === 'RBS') {
    const { rbsRow, rbsBay, rbsSlot } = details;
    if (!rbsRow || !rbsBay || !rbsSlot) return '';
    return `${zoneCode}-${rbsRow}-${rbsBay}-${rbsSlot}`;
  } else {
    const { customLabel } = details;
    if (!customLabel) return '';
    return `${zoneCode}-${customLabel}`;
  }
}

export function isLocationCodeUnique(
  code: string,
  locations: Location[],
  excludeId?: string,
): boolean {
  return !locations.some(
    (location) => location.locationCode === code && location.id !== excludeId,
  );
}
