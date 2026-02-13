import React from 'react';
import { Edit2, Trash2, Plus, MapPin } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import type {
  Location,
  Zone,
  LocationStatus,
} from '@/features/zones-locations/types';
import EntityTable from '@/shared/components/EntityTable';
import { toastAdapter } from '@/shared/services';
import StatusBadge from '../shared/StatusBadge';
import TypeBadge from '../shared/TypeBadge';
import type {
  EntityColumn,
  EntityAction,
} from '@/shared/components/EntityTable';

interface LocationTableProps {
  locations: Location[];
  selectedLocations: string[];
  zone: Zone | null;
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onLocationEdit: (location: Location) => void;
  onLocationDelete: (location: Location) => void;
  onLocationsDelete: (locationIds: string[]) => void;
  onLocationsStatusUpdate: (
    locationIds: string[],
    status: LocationStatus,
  ) => void;
  onLocationSelect: (locationId: string) => void;
  onCreateLocation: () => void;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  className?: string;
}

export const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  selectedLocations,
  zone,
  loading,
  fetching,
  error,
  onLocationEdit,
  onLocationDelete,
  onLocationSelect,
  onCreateLocation,
  totalCount,
  pagination,
  onPaginationChange,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLocationType = (location: Location) =>
    (location.zoneType || location.type) as Location['zoneType'];

  const getLocationDetails = (location: Location) => {
    if (getLocationType(location) === 'RBS') {
      return `Row ${location.rbsRow} • Bay ${location.rbsBay} • Slot ${location.rbsSlot}`;
    }
    return location.customLabel || '';
  };

  // Table columns configuration
  const columns: EntityColumn<Location>[] = [
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
        const typeA = getLocationType(rowA.original);
        const typeB = getLocationType(rowB.original);
        return typeA.localeCompare(typeB);
      },
      render: (location) => <TypeBadge type={getLocationType(location)} />,
    },
    {
      key: 'details',
      label: 'Details',
      render: (location) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getLocationDetails(location)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortingFn: (rowA, rowB) => {
        const statusOrder = {
          active: 0,
          inactive: 1,
          locked: 2,
        };
        const statusA = rowA.original.status;
        const statusB = rowB.original.status;
        const orderA = statusOrder[statusA as keyof typeof statusOrder] ?? 999;
        const orderB = statusOrder[statusB as keyof typeof statusOrder] ?? 999;
        return orderA - orderB;
      },
      render: (location) => <StatusBadge status={location.status} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (location) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(location.createdAt)}
        </div>
      ),
    },
  ];

  // Table actions configuration
  const actions: EntityAction<Location>[] = [
    {
      key: 'edit',
      label: 'Edit Location',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: onLocationEdit,
    },
    {
      key: 'delete',
      label: 'Delete Location',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      onClick: async (location: Location) => {
        const codeLabel = location.displayCode || location.locationCode;
        const confirmed = await toastAdapter.confirm(
          `Delete location "${codeLabel}"?`,
          { intent: 'danger' },
        );
        if (confirmed) {
          onLocationDelete(location);
        }
      },
    },
  ];

  const searchFilter = (location: Location, searchTerm: string) => {
    const search = searchTerm.toLowerCase();
    return (
      location.displayCode.toLowerCase().includes(search) ||
      location.locationCode.toLowerCase().includes(search) ||
      location.absoluteCode.toLowerCase().includes(search) ||
      (location.customLabel &&
        location.customLabel.toLowerCase().includes(search)) ||
      (location.rbsRow && location.rbsRow.toLowerCase().includes(search)) ||
      (location.rbsBay && location.rbsBay.toLowerCase().includes(search)) ||
      (location.rbsSlot && location.rbsSlot.toLowerCase().includes(search))
    );
  };

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Plus className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium">Select a Zone</p>
          <p className="text-sm">
            Choose a zone from the left panel to view and manage its locations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${className}`}>
      <div className="flex-1 min-h-0 flex flex-col">
        <EntityTable
          entities={locations}
          loading={loading}
          fetching={fetching}
          error={error ?? null}
          entityName="location"
          entityNamePlural="locations"
          getId={(location) => location.id}
          columns={columns}
          actions={actions}
          searchPlaceholder="Search locations by code, type, or details..."
          searchFilter={searchFilter}
          onCreateNew={onCreateLocation}
          canCreate={true}
          canEdit={true}
          canDelete={true}
          enablePagination={true}
          initialPageSize={pagination.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          enableServerSidePagination={true}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          emptyStateMessage="No locations found in this zone"
          emptyStateIcon={<MapPin className="h-16 w-16 text-gray-400" />}
          selectedEntityIds={selectedLocations}
          onEntitySelect={(location) => onLocationSelect(location.id)}
          onBulkSelect={(_selectedIds) => {
            // Bulk selection is handled by parent component via onLocationSelect
          }}
        />
      </div>
    </div>
  );
};

export default LocationTable;
