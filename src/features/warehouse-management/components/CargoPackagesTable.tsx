import React from 'react';
import { Search } from 'lucide-react';
import EntityTable from '@/shared/components/EntityTable';
import type { Location } from '@/features/zones-locations/types';
import { useCargoPackagesTable, type LocationCargoItem } from '../hooks/use-cargo-packages-table';

interface CargoPackagesTableProps {
  location?: Location | null;
  showSearch?: boolean;
  canWrite?: boolean;
}

export const CargoPackagesTable: React.FC<CargoPackagesTableProps> = ({
  location,
  showSearch = true,
}) => {
  const {
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    cargoColumns,
    filteredCargoItems,
    isLoading,
    isFetching,
    error,
    resolvedTotalCount,
    handleToggleExpand,
  } = useCargoPackagesTable({ location, showSearch });

  return (
    <>
      <div className="h-full min-h-[480px] rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <div className="mb-3 flex-shrink-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {location
                  ? `Packing lists in ${location.displayCode}`
                  : 'All packing lists'}
              </div>
              {location ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Location {location.absoluteCode}
                </div>
              ) : null}
            </div>
            {showSearch ? (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search packing lists..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            ) : null}
          </div>
        </div>
        <EntityTable<LocationCargoItem>
          entities={filteredCargoItems}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          entityName="packing list"
          entityNamePlural="packing lists"
          getId={(item) => item.id}
          columns={cargoColumns}
          actions={[]}
          canCreate={false}
          canEdit={false}
          canDelete={false}
          canBulkEdit={false}
          enablePagination={true}
          initialPageSize={pagination.pageSize}
          pageSizeOptions={[50, 100, 200]}
          enableServerSidePagination={true}
          totalCount={resolvedTotalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          className="flex-1 min-h-0"
          emptyStateMessage="No packing lists recorded in this location."
          onEntityExpand={handleToggleExpand}
        />
      </div>
    </>
  );
};

export default CargoPackagesTable;
