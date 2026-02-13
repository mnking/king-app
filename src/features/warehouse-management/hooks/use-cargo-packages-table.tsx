import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import type { EntityColumn } from '@/shared/components/EntityTable';
import type { Location } from '@/features/zones-locations/types';
import { getLocations } from '@/services/apiZonesLocations';
import type {
  WarehousePackingListStoredItem,
  WarehousePackageLocationSummary,
} from '@/features/warehouse-management/types';
import { usePackingListsByStoredLocation } from './use-packing-lists-by-location-query';

export type LocationCargoItem = {
  id: string;
  packingListId: string;
  packingListNo: string;
  hblNo: string;
  forwarderName: string;
  direction: string;
  shipperName: string;
  consigneeName: string;
  locations: WarehousePackageLocationSummary[];
  packageCount: number;
};

interface UseCargoPackagesTableParams {
  location?: Location | null;
  showSearch?: boolean;
  canWrite?: boolean;
}

const resolveLocationLabel = (location?: Location | null) =>
  location?.displayCode
  || location?.absoluteCode
  || location?.locationCode
  || null;

const toLocationCargoItem = (
  item: WarehousePackingListStoredItem,
  locationMap: Map<string, Location>,
  selectedLocationId?: string,
): LocationCargoItem => {
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
  const packageCount = selectedLocationId
    ? locationCounts.get(selectedLocationId) ?? 0
    : locations.reduce((total, location) => total + (location.packageCount ?? 0), 0);

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
    packageCount,
  };
};

const cargoSearchFilter = (item: LocationCargoItem, searchTerm: string) => {
  const search = searchTerm.toLowerCase();
  return [
    item.packingListNo,
    item.hblNo,
    item.forwarderName,
    item.direction,
    item.shipperName,
    item.consigneeName,
    item.packageCount,
    item.locations.map((location) => location.locationName).join(' '),
  ].some((value) => String(value ?? '').toLowerCase().includes(search));
};

export const useCargoPackagesTable = ({
  location,
  showSearch = true,
}: UseCargoPackagesTableParams) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const {
    data: packingListsData,
    isLoading,
    isFetching,
    error,
  } = usePackingListsByStoredLocation(
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      storedLocationId: location?.id ?? undefined,
    },
    Boolean(location?.id),
  );

  const packingLists = useMemo(
    () => packingListsData?.results ?? [],
    [packingListsData?.results],
  );
  const totalCount = packingListsData?.total ?? 0;

  const uniqueLocationIds = useMemo(() => {
    const ids = new Set<string>();
    packingLists.forEach((item) => {
      (item.storedLocationIds ?? []).forEach((id) => ids.add(id));
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
  });

  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    (locationsData ?? []).forEach((location) => {
      map.set(location.id, location);
    });
    return map;
  }, [locationsData]);

  const cargoItems = useMemo(
    () => packingLists.map((item) => toLocationCargoItem(item, locationMap, location?.id)),
    [location?.id, locationMap, packingLists],
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSearchTerm('');
  }, [location?.id]);

  const cargoColumns: EntityColumn<LocationCargoItem>[] = useMemo(
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
        key: 'packageCount',
        label: 'Packages',
        render: (item) => item.packageCount,
      },
    ],
    [],
  );

  const filteredCargoItems = useMemo(() => {
    if (!showSearch) {
      return cargoItems;
    }

    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return cargoItems;
    }

    return cargoItems.filter((item) => cargoSearchFilter(item, trimmed));
  }, [cargoItems, searchTerm, showSearch]);

  const resolvedTotalCount =
    searchTerm.trim().length > 0 ? filteredCargoItems.length : totalCount;

  const handleToggleExpand = useCallback((item: LocationCargoItem) => {
    setExpandedRowId((prev) => (prev === item.id ? null : item.id));
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    expandedRowId,
    cargoColumns,
    filteredCargoItems,
    isLoading: Boolean(location?.id) && isLoading,
    isFetching: isFetching || isFetchingLocations,
    error: error instanceof Error ? error.message : error ? 'Failed to load packing lists' : null,
    resolvedTotalCount,
    actions: [],
    handleToggleExpand,
    showSearch,
  };
};
