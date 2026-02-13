import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import type { EntityColumn } from '@/shared/components/EntityTable';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import { toastAdapter } from '@/shared/services';
import {
  useLocations,
  useLocationsByZone,
  warehouseLocationsQueryKeys,
} from '@/features/warehouse-management/hooks/use-locations-query';
import type { Location } from '@/features/zones-locations/types';
import StatusBadge from '@/features/zones-locations/components/shared/StatusBadge';
import TypeBadge from '@/features/zones-locations/components/shared/TypeBadge';
import { useMovePackageSelection } from '@/features/warehouse-management/hooks/use-move-package-selection';
import { relocateCargoPackage } from '@/services/apiWarehouseManagement';
import { warehousePackagesQueryKeys } from './use-warehouse-packages-query';

interface UseMovePackageModalParams {
  open: boolean;
  packageId?: string;
  fromLocationIds?: string[];
  onClose: () => void;
  canWrite: boolean;
}

export const useMovePackageModal = ({
  open,
  packageId,
  fromLocationIds,
  onClose,
  canWrite,
}: UseMovePackageModalParams) => {
  const queryClient = useQueryClient();
  const initialPageSize = 25;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({
    location: '',
    zoneName: '',
    emptyLocation: 'all',
  });
  const locationSearch =
    typeof filters.location === 'string' ? filters.location.trim() : '';
  const zoneNameSearch =
    typeof filters.zoneName === 'string' ? filters.zoneName.trim() : '';
  const emptyLocationFilter =
    typeof filters.emptyLocation === 'string' ? filters.emptyLocation : 'all';
  const packageCountFilter = useMemo(() => {
    if (emptyLocationFilter === 'empty') {
      return '0';
    }
    if (emptyLocationFilter === 'not-empty') {
      return ['1', 'many'] as const;
    }
    return undefined;
  }, [emptyLocationFilter]);
  const locationQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      status: 'active',
      ...(locationSearch ? { search: locationSearch } : {}),
      ...(zoneNameSearch && !activeZoneId ? { zoneName: zoneNameSearch } : {}),
      ...(packageCountFilter ? { packageCount: packageCountFilter } : {}),
    }),
    [
      activeZoneId,
      locationSearch,
      pagination.pageIndex,
      pagination.pageSize,
      packageCountFilter,
      zoneNameSearch,
    ],
  );
  const { data, isLoading, isFetching, error } = useLocations(
    locationQueryParams,
    open,
  );
  const {
    data: zoneData,
    isLoading: isZoneLoading,
    isFetching: isZoneFetching,
    error: zoneError,
  } = useLocationsByZone(activeZoneId ?? '', {
    ...locationQueryParams,
  });

  const locations = useMemo(
    () => (activeZoneId ? zoneData?.results ?? [] : data?.results ?? []),
    [activeZoneId, data, zoneData],
  );
  const {
    selectedLocations,
    filteredLocations,
    handleLocationSelect,
    clearSelection,
    removeLocation,
    selectedZoneId,
  } = useMovePackageSelection({
    locations,
  });
  const selectedLocationIds = useMemo(
    () => new Set(selectedLocations.map((location) => location.id)),
    [selectedLocations],
  );

  const handleApplyFilter = (values: FilterValues) => {
    setFilters(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const handleClearFilter = () => {
    setFilters({ location: '', zoneName: '', emptyLocation: 'all' });
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const handleMoveToLocations = () => {
    if (!canWrite) {
      toastAdapter.info('Read-only access. You cannot move packages.');
      return;
    }
    if (!packageId) {
      toastAdapter.error('Missing package reference for relocation.');
      return;
    }
    const fromLocationId = (fromLocationIds ?? []).filter(Boolean);
    if (fromLocationId.length === 0) {
      toastAdapter.error('Package does not have a current location to move from.');
      return;
    }
    if (selectedLocations.length === 0) return;
    const toLocationId = Array.from(
      new Set(selectedLocations.map((location) => location.id)),
    );
    relocatePackageMutation.mutate({
      packageId,
      fromLocationId,
      toLocationId,
    });
  };

  const handleClose = () => {
    clearSelection();
    onClose();
  };

  const handleLocationToggle = useCallback(
    (location: Location) => {
      if (!canWrite) {
        return;
      }
      if (selectedLocationIds.has(location.id)) {
        removeLocation(location.id);
        return;
      }

      handleLocationSelect(location);
    },
    [canWrite, handleLocationSelect, removeLocation, selectedLocationIds],
  );

  useEffect(() => {
    if (!selectedZoneId && activeZoneId) {
      setActiveZoneId(null);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      return;
    }

    if (selectedZoneId && selectedZoneId !== activeZoneId) {
      setActiveZoneId(selectedZoneId);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }
  }, [activeZoneId, selectedZoneId]);

  const locationColumns: EntityColumn<Location>[] = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        render: (location) => (
          <input
            type="checkbox"
            aria-label={`Select ${location.displayCode}`}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={selectedLocationIds.has(location.id)}
            onChange={() => handleLocationToggle(location)}
            disabled={!canWrite}
          />
        ),
      },
      {
        key: 'displayCode',
        label: 'Location Code',
        searchable: true,
        sortable: true,
        render: (location) => (
          <div className="font-mono">
            <span className="font-semibold text-gray-900 dark:text-white">
              {location.displayCode}
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {location.absoluteCode}
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        sortingFn: (rowA, rowB) => {
          const typeA = (rowA.original.zoneType || rowA.original.type) as Location['zoneType'];
          const typeB = (rowB.original.zoneType || rowB.original.type) as Location['zoneType'];
          return typeA.localeCompare(typeB);
        },
        render: (location) => (
          <TypeBadge type={(location.zoneType || location.type) as Location['zoneType']} />
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (location) => <StatusBadge status={location.status} />,
      },
      {
        key: 'zoneName',
        label: 'Zone name',
        sortable: true,
        render: (location) => location.zoneName ?? '-',
      },
    ],
    [canWrite, handleLocationToggle, selectedLocationIds],
  );

  const isTableLoading = activeZoneId ? isZoneLoading : isLoading;
  const isTableFetching = activeZoneId ? isZoneFetching : isFetching;
  const tableError = activeZoneId ? zoneError : error;

  const handlePaginationChange = useCallback((next: PaginationState) => {
    setPagination(next);
  }, []);

  const totalCount = activeZoneId ? zoneData?.total : data?.total;

  const relocatePackageMutation = useMutation({
    mutationFn: relocateCargoPackage,
    onSuccess: () => {
      toastAdapter.success('Package relocated.');
      queryClient.invalidateQueries({
        queryKey: warehousePackagesQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: warehouseLocationsQueryKeys.all,
      });
      handleClose();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to relocate package.';
      toastAdapter.error(message);
    },
  });

  const filterFields = [
    {
      type: 'text',
      name: 'location',
      label: 'Location',
      placeholder: 'Search location...',
    },
    ...(selectedLocations.length === 0
      ? [
          {
            type: 'text' as const,
            name: 'zoneName',
            label: 'Zone name',
            placeholder: 'Search zone name...',
          },
        ]
      : []),
    {
      type: 'select',
      name: 'emptyLocation',
      label: 'Empty location',
      options: [
        { value: 'all', label: 'All' },
        { value: 'empty', label: 'Empty' },
        { value: 'not-empty', label: 'Not empty' },
      ],
      keyField: 'value',
      valueField: 'label',
    },
  ];

  return {
    filters,
    filterFields,
    handleApplyFilter,
    handleClearFilter,
    selectedLocations,
    filteredLocations,
    removeLocation,
    clearSelection,
    selectedLocationIds,
    locationColumns,
    isTableLoading,
    isTableFetching,
    tableError,
    totalCount,
    pagination,
    handlePaginationChange,
    handleMoveToLocations,
    handleClose,
    relocatePending: relocatePackageMutation.isPending,
    canWrite,
  };
};
