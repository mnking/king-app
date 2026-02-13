import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import type { EntityColumn } from '@/shared/components/EntityTable';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import { getLocations } from '@/services/apiZonesLocations';
import type { Location } from '@/features/zones-locations/types';
import type {
  WarehousePackingListStoredItem,
  WarehousePackageLocationSummary,
  WarehousePackingListQueryParams,
} from '@/features/warehouse-management/types';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import { usePackingListsWithStoredPackages } from './use-packing-lists-with-stored-packages-query';

export type PackageFirstItem = {
  id: string;
  packingListId: string;
  packingListNo: string;
  hblNo: string;
  forwarderName: string;
  direction: string;
  shipperName: string;
  consigneeName: string;
  locations: WarehousePackageLocationSummary[];
  locationStatus: string;
  zoneName: string;
};

const resolveLocationLabel = (location?: Location | null) =>
  location?.displayCode
  || location?.absoluteCode
  || location?.locationCode
  || null;

const resolveLocationStatus = (locations: WarehousePackageLocationSummary[]) => {
  if (locations.some((location) => location.status === 'locked')) {
    return 'locked';
  }
  if (locations.some((location) => location.status === 'active')) {
    return 'active';
  }
  if (locations.some((location) => location.status === 'inactive')) {
    return 'inactive';
  }
  return 'unknown';
};

const resolveZoneName = (locations: WarehousePackageLocationSummary[]) => {
  const uniqueZones = new Set(
    locations
      .map((location) => location.zoneName)
      .filter((zoneName): zoneName is string => Boolean(zoneName)),
  );
  return uniqueZones.size ? Array.from(uniqueZones).join(', ') : '-';
};

const toPackageFirstItem = (
  item: WarehousePackingListStoredItem,
  locationMap: Map<string, Location>,
): PackageFirstItem => {
  const storedLocationIds = item.storedLocationIds ?? [];
  const locationCounts = new Map(
    (item.storedLocationPackageCounts ?? []).map((entry) => [
      entry.locationId,
      entry.packageCount,
    ]),
  );
  const locations = storedLocationIds.map((locationId) => {
    const location = locationMap.get(locationId);
    return {
      locationId,
      status: location?.status ?? 'active',
      zoneName: location?.zoneName ?? null,
      locationName: resolveLocationLabel(location),
      packageCount: locationCounts.get(locationId) ?? 0,
    };
  });
  const locationStatus = resolveLocationStatus(locations);
  const zoneName = resolveZoneName(locations);

  return {
    id: item.id,
    packingListId: item.id,
    packingListNo: item.packingListNumber ?? '-',
    hblNo: item.hblData?.hblCode ?? item.hblCode ?? '-',
    forwarderName: item.hblData?.forwarderName ?? '-',
    direction: item.directionFlow ?? '-',
    shipperName: item.hblData?.shipper ?? '-',
    consigneeName: item.hblData?.consignee ?? '-',
    locations,
    locationStatus,
    zoneName,
  };
};

export const usePackageFirstTable = (
  _canWrite = true,
  onTotalCountChange?: (total: number) => void,
) => {
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data: forwardersResponse } = useForwarders({
    page: 1,
    itemsPerPage: 200,
    status: 'Active',
  });
  const forwarders = useMemo(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse],
  );

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'search',
        label: 'Packing List / HBL',
        placeholder: 'Search by packing list or HBL...',
      },
      {
        type: 'select' as const,
        name: 'forwarderId',
        label: 'Forwarder',
        options: forwarders,
        keyField: 'id' as const,
        valueField: 'name' as const,
        placeholder: 'All forwarders',
      },
    ],
    [forwarders],
  );

  const queryParams = useMemo<WarehousePackingListQueryParams>(() => {
    const params: WarehousePackingListQueryParams = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
    };

    const search =
      typeof filterValues.search === 'string' ? filterValues.search.trim() : '';
    if (search) {
      params.search = search;
    }

    const forwarderId =
      typeof filterValues.forwarderId === 'string' ? filterValues.forwarderId : '';
    if (forwarderId) {
      params.forwarderId = forwarderId;
    }

    return params;
  }, [filterValues, pagination]);

  const {
    data: packingListsData,
    isLoading,
    isFetching,
    error,
  } = usePackingListsWithStoredPackages(queryParams);

  const packingLists = useMemo(
    () => packingListsData?.results ?? [],
    [packingListsData?.results],
  );
  const totalCount = packingListsData?.total ?? 0;

  useEffect(() => {
    if (onTotalCountChange && packingListsData) {
      onTotalCountChange(totalCount);
    }
  }, [onTotalCountChange, packingListsData, totalCount]);

  const uniqueLocationIds = useMemo(() => {
    const ids = new Set<string>();
    packingLists.forEach((item) => {
      (item.storedLocationPackageCounts ?? []).forEach((entry) => {
        ids.add(entry.locationId);
      });
    });
    return Array.from(ids);
  }, [packingLists]);

  const { data: locationsData, isFetching: isFetchingLocations } = useQuery({
    queryKey: ['warehouse-locations', uniqueLocationIds],
    queryFn: async () => {
      const response = await getLocations({
        page: 1,
        itemsPerPage: uniqueLocationIds.length,
        ids: uniqueLocationIds,
      });
      return response.data.results;
    },
    enabled: uniqueLocationIds.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    (locationsData ?? []).forEach((location) => {
      map.set(location.id, location);
    });
    return map;
  }, [locationsData]);

  const packageItems = useMemo(
    () => packingLists.map((item) => toPackageFirstItem(item, locationMap)),
    [locationMap, packingLists],
  );

  const packageColumns: EntityColumn<PackageFirstItem>[] = useMemo(
    () => [
      {
        key: 'packingListNo',
        label: 'PL number',
        render: (item) => item.packingListNo,
      },
      {
        key: 'hblNo',
        label: 'HBL number',
        render: (item) => item.hblNo,
      },
      {
        key: 'forwarderName',
        label: 'Forwarder',
        render: (item) => item.forwarderName,
      },
      {
        key: 'direction',
        label: 'Direction',
        render: (item) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              item.direction === 'IMPORT'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
            }`}
          >
            {item.direction}
          </span>
        ),
      },
      {
        key: 'shipperName',
        label: 'Shipper',
        render: (item) => item.shipperName,
      },
      {
        key: 'consigneeName',
        label: 'Consignee',
        render: (item) => item.consigneeName,
      },
      {
        key: 'pkgInManyLocation',
        label: 'In Many Location',
        render: (item) => {
          const hasManyLocations = item.locations.length > 1;
          const badgeClass = hasManyLocations
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {hasManyLocations ? 'Yes' : 'No'}
            </span>
          );
        },
      },
      {
        key: 'locations',
        label: 'Location ID',
        render: (item) =>
          item.locations
            .map((location) => location.locationName ?? '-')
            .join(', '),
      },
      {
        key: 'locationStatus',
        label: 'Location status',
        render: (item) => {
          const normalized = item.locationStatus.toLowerCase();
          const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
          const badgeClass =
            normalized === 'active'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'zoneName',
        label: 'Zone name',
        render: (item) => item.zoneName,
      },
    ],
    [],
  );

  const handleToggleExpand = useCallback((item: PackageFirstItem) => {
    setExpandedRowId((prev) => (prev === item.id ? null : item.id));
  }, []);

  const handleApplyFilter = useCallback((values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  return {
    filterFields,
    filterValues,
    handleApplyFilter,
    handleClearFilter,
    packageColumns,
    packageItems,
    isLoading,
    isFetching: isFetching || isFetchingLocations,
    error: error instanceof Error
      ? error.message
      : error
        ? 'Failed to load packing lists'
        : null,
    resolvedTotalCount: totalCount,
    pagination,
    setPagination,
    expandedRowId,
    handleToggleExpand,
  };
};
