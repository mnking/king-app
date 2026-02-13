import React from 'react';
import { Edit3, Trash2, ToggleLeft, Building2 } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import { Zone } from '@/features/zones-locations/types';
import EntityTable from '@/shared/components/EntityTable';
import { useToast } from '@/shared/hooks';
import { toastAdapter } from '@/shared/services';
import StatusBadge from '../shared/StatusBadge';
import type {
  EntityColumn,
  EntityAction,
} from '@/shared/components/EntityTable';

interface ZoneTableProps {
  zones: Zone[];
  selectedZone: Zone | null;
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onZoneSelect: (zone: Zone) => void;
  onZoneEdit: (zone: Zone) => void;
  onZoneDelete: (zone: Zone) => void;
  onZoneToggleStatus: (zone: Zone) => void;
  onCreateZone: () => void;
  onBulkDeleteZones: (zoneIds: string[]) => Promise<void>;
  onBulkUpdateZoneStatuses: (
    zoneIds: string[],
    status: Zone['status'],
  ) => Promise<void>;
  onSort?: (sortBy: 'code' | 'name', order: 'asc' | 'desc') => void;
  getLocationCount?: (zoneId: string) => number;
  getLockedLocationCount?: (zoneId: string) => number;
  canDeleteZone?: (zone: Zone) => boolean;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  className?: string;
}

export const ZoneTable: React.FC<ZoneTableProps> = ({
  zones,
  selectedZone,
  loading,
  fetching,
  error,
  onZoneSelect,
  onZoneEdit,
  onZoneDelete,
  onZoneToggleStatus,
  onCreateZone,
  getLocationCount,
  getLockedLocationCount,
  totalCount,
  pagination,
  onPaginationChange,
  className = '',
}) => {
  const toast = useToast();
  // Get location count for each zone using the provided function
  const getZoneLocationCount = (zoneId: string): number => {
    return getLocationCount ? getLocationCount(zoneId) : 0;
  };

  const getZoneLockedLocationCount = (zoneId: string): number => {
    return getLockedLocationCount ? getLockedLocationCount(zoneId) : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Table columns configuration
  const columns: EntityColumn<Zone>[] = [
    {
      key: 'code',
      label: 'Code',
      searchable: true,
      sortable: true,
      render: (zone) => (
        <span className="font-mono text-sm font-semibold">
          {zone.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      searchable: true,
      sortable: true,
      render: (zone) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {zone.name}
          </div>
          {zone.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {zone.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortingFn: (rowA, rowB) => {
        const statusOrder = { active: 0, inactive: 1 };
        const statusA = rowA.original.status;
        const statusB = rowB.original.status;
        const orderA = statusOrder[statusA as keyof typeof statusOrder] ?? 999;
        const orderB = statusOrder[statusB as keyof typeof statusOrder] ?? 999;
        return orderA - orderB;
      },
      render: (zone) => <StatusBadge status={zone.status} />,
    },
    {
      key: 'locationCount',
      label: 'Locations',
      sortable: true,
      render: (zone) => (
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {getZoneLocationCount(zone.id)}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (zone) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(zone.createdAt)}
        </div>
      ),
    },
  ];

  // Table actions configuration
  const actions: EntityAction<Zone>[] = [
    {
      key: 'edit',
      label: 'Edit Zone',
      icon: <Edit3 className="h-4 w-4" />,
      onClick: onZoneEdit,
    },
    {
      key: 'toggle-status',
      label: 'Toggle Status',
      icon: <ToggleLeft className="h-4 w-4" />,
      onClick: onZoneToggleStatus,
      disabled: (zone) =>
        zone.status === 'active' && getZoneLockedLocationCount(zone.id) > 0,
    },
    {
      key: 'delete',
      label: 'Delete Zone',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      onClick: async (zone: Zone) => {
        const locationCount = getZoneLocationCount(zone.id);
        if (locationCount > 0) {
          toast.warning(
            `Cannot delete zone "${zone.name}" because it contains ${locationCount} location${locationCount !== 1 ? 's' : ''}. Remove locations first.`,
          );
          return;
        }
        const confirmed = await toastAdapter.confirm(
          `Delete zone "${zone.name}"?`,
          {
            intent: 'danger',
            description: 'This will permanently remove the zone and its configuration.',
          },
        );
        if (confirmed) {
          onZoneDelete(zone);
        }
      },
    },
  ];

  const searchFilter = (zone: Zone, searchTerm: string) => {
    const search = searchTerm.toLowerCase();
    return (
      zone.code.toLowerCase().includes(search) ||
      zone.name.toLowerCase().includes(search) ||
      (zone.description && zone.description.toLowerCase().includes(search))
    );
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      <EntityTable
        entities={zones}
        loading={loading}
        fetching={fetching}
        error={error ?? null}
        entityName="zone"
        entityNamePlural="zones"
        getId={(zone) => zone.id}
        columns={columns}
        actions={actions}
        searchPlaceholder="Search zones by code, name, or description..."
        searchFilter={searchFilter}
        onCreateNew={onCreateZone}
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
        emptyStateMessage="No zones found"
        emptyStateIcon={<Building2 className="h-16 w-16 text-gray-400" />}
        selectedEntityId={selectedZone?.id}
        onEntitySelect={onZoneSelect}
      />
    </div>
  );
};

export default ZoneTable;
