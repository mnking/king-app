import { useMemo } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import type { EntityColumn } from '@/shared/components/EntityTable';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import type { Location, Zone } from '@/features/zones-locations/types';
import StatusBadge from '@/features/zones-locations/components/shared/StatusBadge';
import TypeBadge from '@/features/zones-locations/components/shared/TypeBadge';

interface UseLocationsPanelParams {
  selectedZone: Zone | null;
  locations: Location[];
  pagination: PaginationState;
  totalCount: number;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  cargoLoadedFilter: string;
  onCargoLoadedFilterChange: (value: string) => void;
  searchFilter: string;
  onSearchFilterChange: (value: string) => void;
  onPaginationChange: (pagination: PaginationState) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'locked', label: 'Locked' },
];

const CARGO_LOADED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'empty', label: 'Empty' },
  { value: 'one', label: 'One' },
  { value: 'many', label: 'Many' },
];

export const useLocationsPanel = ({
  selectedZone,
  locations,
  pagination,
  totalCount,
  statusFilter,
  onStatusFilterChange,
  cargoLoadedFilter,
  onCargoLoadedFilterChange,
  searchFilter,
  onSearchFilterChange,
  onPaginationChange,
}: UseLocationsPanelParams) => {
  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'search',
        label: 'Search location',
        placeholder: 'Search by location code...',
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status',
        options: STATUS_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
      {
        type: 'select' as const,
        name: 'cargoLoaded',
        label: 'Cargo Loaded',
        options: CARGO_LOADED_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
    ],
    [],
  );

  const filterValues = useMemo<FilterValues>(
    () => ({
      status: statusFilter,
      search: searchFilter,
      cargoLoaded: cargoLoadedFilter,
    }),
    [cargoLoadedFilter, searchFilter, statusFilter],
  );

  const handleApplyFilter = (values: FilterValues) => {
    const nextStatus = typeof values.status === 'string' ? values.status : 'all';
    const nextSearch = typeof values.search === 'string' ? values.search : '';
    const nextCargoLoaded =
      typeof values.cargoLoaded === 'string' ? values.cargoLoaded : 'all';
    onStatusFilterChange(nextStatus || 'all');
    onCargoLoadedFilterChange(nextCargoLoaded || 'all');
    onSearchFilterChange(nextSearch);
    onPaginationChange({ ...pagination, pageIndex: 0 });
  };

  const handleClearFilter = () => {
    onStatusFilterChange('all');
    onCargoLoadedFilterChange('all');
    onSearchFilterChange('');
    onPaginationChange({ ...pagination, pageIndex: 0 });
  };

  const locationColumns: EntityColumn<Location>[] = useMemo(
    () => [
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
        sortingFn: (rowA, rowB) => {
          const statusOrder = { active: 0, inactive: 1, locked: 2 };
          const statusA = rowA.original.status;
          const statusB = rowB.original.status;
          const orderA = statusOrder[statusA as keyof typeof statusOrder] ?? 999;
          const orderB = statusOrder[statusB as keyof typeof statusOrder] ?? 999;
          return orderA - orderB;
        },
        render: (location) => <StatusBadge status={location.status} />,
      },
      {
        key: 'packageCount',
        label: 'Packages',
        sortable: true,
        render: (location) => (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {location.packageCount ?? 0}
          </span>
        ),
      },
      {
        key: 'packingListCount',
        label: 'Packing Lists',
        sortable: true,
        render: (location) => (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {location.packingListCount ?? 0}
          </span>
        ),
      },
    ],
    [],
  );

  const occupiedLocationsCount = useMemo(
    () => locations.filter((location) => (location.packageCount ?? 0) > 0).length,
    [locations],
  );

  const selectedZoneSummary = selectedZone
    ? `Zone ${selectedZone.code} • ${selectedZone.name}`
    : 'All locations';

  return {
    filterFields,
    filterValues,
    handleApplyFilter,
    handleClearFilter,
    locationColumns,
    filteredLocations: locations,
    resolvedTotalCount: totalCount,
    occupiedLocationsCount,
    selectedZoneSummary,
  };
};
