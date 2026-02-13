import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { zonesLocationsApi } from '@/services/apiZonesLocations';
import {
  Zone,
  ZoneCreateForm,
  ZoneUpdateForm,
  PaginatedResponse,
} from '../types';

// Query Keys
export const zonesQueryKeys = {
  all: ['zones'] as const,
  lists: () => [...zonesQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...zonesQueryKeys.lists(), filters] as const,
  details: () => [...zonesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...zonesQueryKeys.details(), id] as const,
  locations: (zoneId: string) =>
    [...zonesQueryKeys.detail(zoneId), 'locations'] as const,
};

// Query Options
interface ZonesQueryParams extends Record<string, unknown> {
  page?: number;
  itemsPerPage?: number;
  status?: string | string[];
}

// Hooks
export function useZones(params: ZonesQueryParams = {}) {
  return useQuery({
    queryKey: zonesQueryKeys.list(params),
    queryFn: async () => {
      const response = await zonesLocationsApi.zones.getAll(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    placeholderData: keepPreviousData, // v5 syntax - keeps previous page visible while loading next
  });
}

export function useZone(id: string) {
  return useQuery({
    queryKey: zonesQueryKeys.detail(id),
    queryFn: async () => {
      const response = await zonesLocationsApi.zones.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZoneCreateForm) => {
      const response = await zonesLocationsApi.zones.create(data);
      return response.data;
    },
    onSuccess: (newZone) => {
      // Invalidate and refetch zones lists
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.lists() });

      // Optimistically add to cache for immediate UI update
      queryClient.setQueryData<PaginatedResponse<Zone>>(
        zonesQueryKeys.list({}),
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: [newZone, ...oldData.results],
              total: oldData.total + 1,
            };
          }
          return {
            results: [newZone],
            total: 1,
            page: 1,
            itemsPerPage: 20,
          };
        },
      );
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ZoneUpdateForm }) => {
      const response = await zonesLocationsApi.zones.update(id, data);
      return response.data;
    },
    onSuccess: (updatedZone) => {
      // Update specific zone in cache
      queryClient.setQueryData(
        zonesQueryKeys.detail(updatedZone.id),
        updatedZone,
      );

      // Update zones lists
      queryClient.setQueriesData<PaginatedResponse<Zone>>(
        { queryKey: zonesQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((zone) =>
                zone.id === updatedZone.id ? updatedZone : zone,
              ),
            };
          }
          return oldData;
        },
      );
    },
  });
}

export function useUpdateZoneStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Zone['status'];
    }) => {
      const response = await zonesLocationsApi.zones.updateStatus(id, status);
      return response.data;
    },
    onSuccess: (updatedZone) => {
      // Update specific zone in cache
      queryClient.setQueryData(
        zonesQueryKeys.detail(updatedZone.id),
        updatedZone,
      );

      // Update zones lists
      queryClient.setQueriesData<PaginatedResponse<Zone>>(
        { queryKey: zonesQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((zone) =>
                zone.id === updatedZone.id ? updatedZone : zone,
              ),
            };
          }
          return oldData;
        },
      );
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await zonesLocationsApi.zones.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: zonesQueryKeys.detail(deletedId) });

      // Update zones lists
      queryClient.setQueriesData<PaginatedResponse<Zone>>(
        { queryKey: zonesQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter((zone) => zone.id !== deletedId),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      // Invalidate related locations
      queryClient.invalidateQueries({
        queryKey: zonesQueryKeys.locations(deletedId),
      });
    },
  });
}

export function useBulkUpdateZoneStatuses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: Zone['status'];
    }) => {
      // Update each zone sequentially
      const updatePromises = ids.map(async (id) => {
        try {
          return await zonesLocationsApi.zones.updateStatus(id, status);
        } catch (error) {
          // Capture individual failures
          return {
            error: error instanceof Error ? error.message : 'Unknown error',
            id,
          };
        }
      });

      const responses = await Promise.all(updatePromises);

      // Separate successful updates from failures
      const successful = responses.filter((response) => !('error' in response)) as Awaited<ReturnType<typeof zonesLocationsApi.zones.updateStatus>>[];
      const failed = responses.filter((response) => 'error' in response) as Array<{ error: string; id: string }>;

      if (failed.length > 0) {
        const errorMsg = `Failed to update ${failed.length} zone(s): ${failed.map((f) => f.error).join(', ')}`;
        throw new Error(errorMsg);
      }

      return successful.map((response) => response.data);
    },
    onSuccess: (updatedZones) => {
      // Update each zone in cache
      updatedZones.forEach((updatedZone) => {
        queryClient.setQueryData(
          zonesQueryKeys.detail(updatedZone.id),
          updatedZone,
        );
      });

      // Update zones lists
      queryClient.setQueriesData<PaginatedResponse<Zone>>(
        { queryKey: zonesQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((zone) => {
                const updatedZone = updatedZones.find(
                  (updated) => updated.id === zone.id,
                );
                return updatedZone || zone;
              }),
            };
          }
          return oldData;
        },
      );
    },
    onError: (error) => {
      console.error('Bulk zone status update failed:', error);
    },
  });
}

export function useBulkDeleteZones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete each zone sequentially with individual error handling
      const deletePromises = ids.map(async (id) => {
        try {
          await zonesLocationsApi.zones.delete(id);
          return { id, success: true };
        } catch (error) {
          // Capture individual failures
          return {
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const results = await Promise.all(deletePromises);

      // Separate successful deletions from failures
      const successful = results.filter((result) => result.success);
      const failed = results.filter((result) => !result.success);

      if (failed.length > 0) {
        const errorMsg = `Failed to delete ${failed.length} zone(s): ${failed.map((f) => f.error).join(', ')}`;
        throw new Error(errorMsg);
      }

      return successful.map((result) => result.id);
    },
    onSuccess: (deletedIds) => {
      // Remove from cache
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: zonesQueryKeys.detail(id) });
        queryClient.invalidateQueries({
          queryKey: zonesQueryKeys.locations(id),
        });
      });

      // Update zones lists
      queryClient.setQueriesData<PaginatedResponse<Zone>>(
        { queryKey: zonesQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            const deletedIdSet = new Set(deletedIds);
            return {
              ...oldData,
              results: oldData.results.filter(
                (zone) => !deletedIdSet.has(zone.id),
              ),
              total: oldData.total - deletedIds.length,
            };
          }
          return oldData;
        },
      );
    },
    onError: (error) => {
      console.error('Bulk zone deletion failed:', error);
    },
  });
}

// Utility hook for zone-related queries
export function useZoneQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateZones: () =>
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.all }),
    invalidateZonesList: () =>
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.lists() }),
    invalidateZone: (id: string) =>
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.detail(id) }),
    invalidateZoneLocations: (zoneId: string) =>
      queryClient.invalidateQueries({
        queryKey: zonesQueryKeys.locations(zoneId),
      }),
    refetchZones: () =>
      queryClient.refetchQueries({ queryKey: zonesQueryKeys.all }),
  };
}
