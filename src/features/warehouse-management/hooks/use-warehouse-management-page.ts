import { useEffect, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import type { Location } from '@/features/zones-locations/types';
import { useAuth } from '@/features/auth/useAuth';
import { useLocations, useLocationsByZone } from './use-locations-query';
import { useZones } from './use-zones-query';

type WarehouseViewMode = 'location' | 'package';

export const useWarehouseManagementPage = () => {
  const { can } = useAuth();
  const canWriteWarehouse = can?.('warehouse_management:write') ?? false;
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<WarehouseViewMode>('location');
  const [locationStatusFilter, setLocationStatusFilter] = useState<string>('all');
  const [cargoLoadedFilter, setCargoLoadedFilter] = useState<string>('all');
  const [locationSearchFilter, setLocationSearchFilter] = useState<string>('');
  const [locationsPagination, setLocationsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const {
    data: zonesData,
    isLoading: isLoadingZones,
    isFetching: isFetchingZones,
    error: zonesError,
    refetch: refetchZones,
  } = useZones({ page: 1, itemsPerPage: 50, status: 'active' });

  const zones = useMemo(() => zonesData?.results ?? [], [zonesData]);
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, zones],
  );

  const locationQueryParams = useMemo(() => {
    const base = {
      page: locationsPagination.pageIndex + 1,
      itemsPerPage: locationsPagination.pageSize,
    };

    const packageCount =
      cargoLoadedFilter === 'empty'
        ? '0'
        : cargoLoadedFilter === 'one'
          ? '1'
          : cargoLoadedFilter === 'many'
            ? 'many'
            : undefined;

    if (!selectedZoneId) {
      const status =
        locationStatusFilter === 'active' || locationStatusFilter === 'locked'
          ? locationStatusFilter
          : ['active', 'locked'];
      return {
        ...base,
        status,
        ...(packageCount ? { packageCount } : {}),
        ...(locationSearchFilter.trim() ? { search: locationSearchFilter.trim() } : {}),
      };
    }

    const status =
      locationStatusFilter === 'all'
        ? ['active', 'locked']
        : locationStatusFilter;
    return {
      ...base,
      status,
      ...(packageCount ? { packageCount } : {}),
      ...(locationSearchFilter.trim() ? { search: locationSearchFilter.trim() } : {}),
    };
  }, [
    cargoLoadedFilter,
    locationStatusFilter,
    locationSearchFilter,
    locationsPagination.pageIndex,
    locationsPagination.pageSize,
    selectedZoneId,
  ]);

  const {
    data: locationsByZoneData,
    isLoading: isLoadingLocationsByZone,
    isFetching: isFetchingLocationsByZone,
    error: locationsByZoneError,
  } = useLocationsByZone(selectedZoneId ?? '', locationQueryParams);

  const {
    data: locationsAllData,
    isLoading: isLoadingLocationsAll,
    isFetching: isFetchingLocationsAll,
    error: locationsAllError,
  } = useLocations(locationQueryParams, !selectedZoneId);

  const locationsData = selectedZoneId ? locationsByZoneData : locationsAllData;
  const isLoadingLocations = selectedZoneId
    ? isLoadingLocationsByZone
    : isLoadingLocationsAll;
  const isFetchingLocations = selectedZoneId
    ? isFetchingLocationsByZone
    : isFetchingLocationsAll;
  const locationsError = selectedZoneId ? locationsByZoneError : locationsAllError;

  const locations = useMemo(
    () => locationsData?.results ?? [],
    [locationsData],
  );
  const locationsTotalCount = locationsData?.total ?? 0;

  useEffect(() => {
    if (selectedZoneId && !selectedZone) {
      setSelectedZoneId(null);
    }
  }, [selectedZone, selectedZoneId]);

  useEffect(() => {
    setSelectedLocationId(null);
    setLocationsPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [cargoLoadedFilter, locationSearchFilter, locationStatusFilter, selectedZoneId]);

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocationId((prev) => (prev === location.id ? null : location.id));
  };

  return {
    viewMode,
    setViewMode,
    canWriteWarehouse,
    zonesSidebarProps: {
      zones,
      selectedZoneId,
      isLoading: isLoadingZones,
      isFetching: isFetchingZones,
      error: zonesError
        ? zonesError instanceof Error
          ? zonesError.message
          : 'Unknown error'
        : null,
      onSelect: handleZoneSelect,
      onRefresh: () => void refetchZones(),
    },
    locationsPanelProps: {
      selectedZone,
      locations,
      loading: isLoadingLocations,
      fetching: isFetchingLocations,
      error: locationsError
        ? locationsError instanceof Error
          ? locationsError.message
          : 'Failed to load locations'
        : null,
      pagination: locationsPagination,
      totalCount: locationsTotalCount,
      selectedLocationId,
      statusFilter: locationStatusFilter,
      onStatusFilterChange: setLocationStatusFilter,
      cargoLoadedFilter,
      onCargoLoadedFilterChange: setCargoLoadedFilter,
      searchFilter: locationSearchFilter,
      onSearchFilterChange: setLocationSearchFilter,
      onPaginationChange: setLocationsPagination,
      onLocationSelect: handleLocationSelect,
      viewMode,
      onViewModeChange: setViewMode,
      canWrite: canWriteWarehouse,
    },
    packageFirstPanelProps: {
      viewMode,
      onViewModeChange: setViewMode,
      canWrite: canWriteWarehouse,
    },
  };
};
