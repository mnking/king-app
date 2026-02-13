import React, { useMemo } from 'react';
import EntityTable, { type EntityColumn } from '@/shared/components/EntityTable';
import StatusBadge from '@/features/zones-locations/components/shared/StatusBadge';
import type { WarehousePackageLocationSummary } from '@/features/warehouse-management/types';

interface PackageLocationsTableProps {
  locations: WarehousePackageLocationSummary[];
}

export const PackageLocationsTable: React.FC<PackageLocationsTableProps> = ({
  locations,
}) => {
  const locationColumns: EntityColumn<WarehousePackageLocationSummary>[] = useMemo(
    () => [
      {
        key: 'locationName',
        label: 'Location',
        render: (location) => (
          <div className="font-mono">
            <span className="font-semibold text-gray-900 dark:text-white">
              {location.locationName ?? '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'zoneName',
        label: 'Zone',
        render: (location) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {location.zoneName ?? '-'}
          </span>
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
    ],
    [],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <EntityTable<WarehousePackageLocationSummary>
        entities={locations}
        loading={false}
        error={null}
        entityName="location"
        entityNamePlural="locations"
        getId={(location) => location.locationId}
        columns={locationColumns}
        actions={[]}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        canBulkEdit={false}
        enablePagination={false}
        className="min-h-0"
        emptyStateMessage="No locations recorded."
      />
    </div>
  );
};

export default PackageLocationsTable;
