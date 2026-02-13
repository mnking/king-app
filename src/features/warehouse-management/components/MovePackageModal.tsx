import React from 'react';
import { X } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter } from '@/shared/components/DynamicFilter';
import type { Location } from '@/features/zones-locations/types';
import { useMovePackageModal } from '../hooks/use-move-package-modal';

interface MovePackageModalProps {
  open: boolean;
  packageCode?: string;
  packageId?: string;
  fromLocationIds?: string[];
  onClose: () => void;
  canWrite: boolean;
}

export const MovePackageModal: React.FC<MovePackageModalProps> = ({
  open,
  packageCode,
  packageId,
  fromLocationIds,
  onClose,
  canWrite,
}) => {
  const {
    filters,
    filterFields,
    handleApplyFilter,
    handleClearFilter,
    selectedLocations,
    filteredLocations,
    removeLocation,
    clearSelection,
    locationColumns,
    isTableLoading,
    isTableFetching,
    tableError,
    totalCount,
    pagination,
    handlePaginationChange,
    handleMoveToLocations,
    handleClose,
    relocatePending,
  } = useMovePackageModal({
    open,
    packageId,
    fromLocationIds,
    onClose,
    canWrite,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Move package
            </h3>
            {packageCode ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Package {packageCode}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-6 py-5 text-sm text-gray-600 dark:text-gray-300">
          {!canWrite ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              Read-only access. You cannot move packages.
            </div>
          ) : null}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <DynamicFilter
              fields={filterFields}
              onApplyFilter={handleApplyFilter}
              onClear={handleClearFilter}
              initialValues={filters}
              buttonLabel="Filters"
            />
          </div>
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Selected locations
              </span>
              <div className="flex items-center gap-3">
                <span>{selectedLocations.length}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedLocations.length === 0 || !canWrite}
                >
                  Clear selection
                </Button>
              </div>
            </div>
            {selectedLocations.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                No locations selected yet. Click a row to add it.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedLocations.map((location) => (
                  <button
                    type="button"
                    key={location.id}
                    onClick={() => removeLocation(location.id)}
                    disabled={!canWrite}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800"
                  >
                    <span className="font-mono">{location.displayCode}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {location.zoneName ?? location.zoneCode ?? 'Zone'}
                    </span>
                    <span className="text-gray-400">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-[60vh]">
            <EntityTable<Location>
              entities={filteredLocations}
              loading={isTableLoading}
              fetching={isTableFetching}
              error={
                tableError
                  ? tableError instanceof Error
                    ? tableError.message
                    : 'Failed to load locations'
                  : null
              }
              entityName="location"
              entityNamePlural="locations"
              getId={(location) => location.id}
              columns={locationColumns}
              actions={[]}
              canCreate={false}
              canEdit={false}
              canDelete={false}
              canBulkEdit={false}
              onPaginationChange={handlePaginationChange}
              enablePagination={true}
              enableServerSidePagination={true}
              totalCount={totalCount}
              initialPageSize={pagination.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              className="h-full"
              emptyStateMessage="No active locations available."
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleMoveToLocations}
            disabled={selectedLocations.length === 0 || !canWrite || relocatePending}
            className="mr-3"
            title={canWrite ? 'Move package' : 'Read-only access'}
          >
            {relocatePending ? 'Moving...' : 'Move'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MovePackageModal;
