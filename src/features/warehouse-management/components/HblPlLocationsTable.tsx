import React, { useMemo } from 'react';
import EntityTable, { type EntityColumn } from '@/shared/components/EntityTable';
import StatusBadge from '@/features/zones-locations/components/shared/StatusBadge';
import type { WarehousePackageLocationSummary } from '@/features/warehouse-management/types';

interface HblPlLocationsTableProps {
  locations: WarehousePackageLocationSummary[];
}

type LocationWithCount = WarehousePackageLocationSummary & {
  packageCount: number;
};

export const HblPlLocationsTable: React.FC<HblPlLocationsTableProps> = ({
  locations,
}) => {
  const locationsWithCount = useMemo(() => {
    return locations.map((location) => ({
      ...location,
      packageCount: location.packageCount ?? 0,
    }));
  }, [locations]);

  const locationColumns: EntityColumn<LocationWithCount>[] = useMemo(
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
      {
        key: 'packageCount',
        label: 'Packages',
        render: (location) => location.packageCount,
      },
    ],
    [],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <EntityTable<LocationWithCount>
        entities={locationsWithCount}
        loading={false}
        fetching={false}
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

export default HblPlLocationsTable;
