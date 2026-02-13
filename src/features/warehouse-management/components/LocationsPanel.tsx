import React from 'react';
import type { PaginationState } from '@tanstack/react-table';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter } from '@/shared/components/DynamicFilter';
import Button from '@/shared/components/ui/Button';
import type { Location, Zone } from '@/features/zones-locations/types';
import CargoPackagesTable from './CargoPackagesTable';
import { useLocationsPanel } from '../hooks/use-locations-panel';

interface LocationsPanelProps {
  selectedZone: Zone | null;
  locations: Location[];
  loading: boolean;
  fetching: boolean;
  error: string | null;
  pagination: PaginationState;
  totalCount: number;
  selectedLocationId: string | null;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  cargoLoadedFilter: string;
  onCargoLoadedFilterChange: (value: string) => void;
  searchFilter: string;
  onSearchFilterChange: (value: string) => void;
  onPaginationChange: (pagination: PaginationState) => void;
  onLocationSelect: (location: Location) => void;
  viewMode: 'location' | 'package';
  onViewModeChange: (mode: 'location' | 'package') => void;
  canWrite?: boolean;
}

export const LocationsPanel: React.FC<LocationsPanelProps> = ({
  selectedZone,
  locations,
  loading,
  fetching,
  error,
  pagination,
  totalCount,
  selectedLocationId,
  statusFilter,
  onStatusFilterChange,
  cargoLoadedFilter,
  onCargoLoadedFilterChange,
  searchFilter,
  onSearchFilterChange,
  onPaginationChange,
  onLocationSelect,
  viewMode,
  onViewModeChange,
  canWrite = true,
}) => {
  const {
    filterFields,
    filterValues,
    handleApplyFilter,
    handleClearFilter,
    locationColumns,
    filteredLocations,
    resolvedTotalCount,
    occupiedLocationsCount,
    selectedZoneSummary,
  } = useLocationsPanel({
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
  });

  const renderCargoSection = (location: Location) => (
    <div className="min-h-[480px]">
      <CargoPackagesTable location={location} canWrite={canWrite} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Locations Table
              </p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedZoneSummary}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  Occupied Locations {occupiedLocationsCount}/{resolvedTotalCount}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Select a location to view packing lists inside
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'location' ? 'primary' : 'outline'}
                onClick={() => onViewModeChange('location')}
              >
                Location first
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'package' ? 'primary' : 'outline'}
                onClick={() => onViewModeChange('package')}
              >
                HBL/PL first
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DynamicFilter
              fields={filterFields}
              onApplyFilter={handleApplyFilter}
              onClear={handleClearFilter}
              initialValues={filterValues}
              buttonLabel="Filters"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <EntityTable<Location>
          entities={filteredLocations}
          loading={loading}
          fetching={fetching}
          error={error}
          entityName="location"
          entityNamePlural="locations"
          getId={(location) => location.id}
          columns={locationColumns}
          actions={[]}
          canCreate={false}
          canEdit={false}
          canDelete={false}
          canBulkEdit={false}
          enablePagination={true}
          initialPageSize={pagination.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          enableServerSidePagination={true}
          totalCount={resolvedTotalCount}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          emptyStateMessage={
            selectedZone ? 'No locations found in this zone' : 'No locations found'
          }
          selectedEntityId={selectedLocationId ?? undefined}
          onEntitySelect={onLocationSelect}
          expandedEntityId={selectedLocationId}
          renderExpandedRow={renderCargoSection}
        />
      </div>
    </div>
  );
};

export default LocationsPanel;
