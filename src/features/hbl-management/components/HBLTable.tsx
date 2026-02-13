import React from 'react';
import { FileText, Edit3, Trash2, Eye, CheckCheck } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import type { HouseBill } from '../types';
import EntityTable from '@/shared/components/EntityTable';
import type {
  EntityColumn,
  EntityAction,
} from '@/shared/components/EntityTable';
const directionFlowConfig: Record<
  NonNullable<HouseBill['directionFlow']>,
  { label: string; badgeClass: string }
> = {
  IMPORT: {
    label: 'Import',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  EXPORT: {
    label: 'Export',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
};

interface HBLTableProps {
  hbls: HouseBill[];
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onHBLView: (hbl: HouseBill) => void;
  onHBLEdit: (hbl: HouseBill) => void;
  onHBLDelete: (hbl: HouseBill) => void;
  onHBLMarkDone: (hbl: HouseBill) => void;
  onHBLManageCustomsDeclarations: (hbl: HouseBill) => void;
  onCreateHBL: () => void;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  className?: string;
  canCreate?: boolean;
  canWrite?: boolean;
}

export const HBLTable: React.FC<HBLTableProps> = ({
  hbls,
  loading,
  fetching,
  error,
  onHBLView,
  onHBLEdit,
  onHBLDelete,
  onHBLMarkDone,
  onHBLManageCustomsDeclarations,
  onCreateHBL,
  totalCount,
  pagination,
  onPaginationChange,
  className = '',
  canCreate = true,
  canWrite = true,
}) => {
  // Status badge helper
  const getStatusBadge = (status?: string) => {
    const statusColors = {
      pending:
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      approved:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      done: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };

    const statusIcons = {
      pending: '○',
      approved: '✓',
      done: '✓✓',
    };

    const statusLabels = {
      pending: 'Draft',
      approved: 'Approved',
      done: 'Done',
    };

    // Default to pending if status is undefined or invalid
    const statusKey = (status && (status in statusColors) ? status : 'pending') as keyof typeof statusColors;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[statusKey]}`}
      >
        {statusIcons[statusKey]} {statusLabels[statusKey]}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Entity Table configuration
  const columns: EntityColumn<HouseBill>[] = [
    {
      key: 'receivedAt',
      label: 'Received Date',
      sortable: false,
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hbl.receivedAt ? formatDate(hbl.receivedAt) : '—'}
        </div>
      ),
    },
    {
      key: 'code',
      label: 'HBL No',
      searchable: true,
      sortable: false,
      render: (hbl) => (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {hbl.code || '—'}
        </span>
      ),
    },
    {
      key: 'shipper',
      label: 'Shipper',
      searchable: true,
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hbl.shipper || '—'}
        </div>
      ),
    },
    {
      key: 'consignee',
      label: 'Consignee',
      searchable: true,
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hbl.consignee || '—'}
        </div>
      ),
    },
    {
      key: 'containers',
      label: 'Container',
      render: (hbl) => {
        const container = hbl.containers?.[0];
        if (!container?.containerNumber) {
          return <span className="text-sm text-gray-400">—</span>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {container.containerNumber}
            </div>
            {container.containerTypeCode && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {container.containerTypeCode}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'seal',
      label: 'Seal', // TODO(i18n): translate to hbl.table.seal
      render: (hbl) => {
        const container = hbl.containers?.[0];
        const sealNumber = container?.sealNumber;

        if (!sealNumber) {
          return <span className="text-sm text-gray-400">—</span>;
        }

        return (
          <div className="text-sm break-words text-gray-900 dark:text-gray-100">
            {sealNumber}
          </div>
        );
      },
    },
    {
      key: 'pol-pod',
      label: 'POL → POD',
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hbl.pol && hbl.pod ? `${hbl.pol} → ${hbl.pod}` : '—'}
        </div>
      ),
    },
    {
      key: 'vessel-voyage',
      label: 'Vessel / Voyage',
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hbl.vesselName || hbl.voyageNumber
            ? `${hbl.vesselName || ''} ${hbl.voyageNumber ? '/ ' + hbl.voyageNumber : ''}`
            : '—'}
        </div>
      ),
    },
    {
      key: 'cargoWeight',
      label: 'Weight (kg)',
      sortable: false,
      render: (hbl) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
          {hbl.cargoWeight?.toLocaleString() || '—'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (hbl) => getStatusBadge(hbl.status),
    },
    {
      key: 'directionFlow',
      label: 'Direction Flow',
      sortable: false,
      render: (hbl) => {
        if (!hbl.directionFlow) {
          return <span className="text-sm text-gray-400">—</span>;
        }
        const config =
          directionFlowConfig[hbl.directionFlow as keyof typeof directionFlowConfig];
        if (!config) {
          return (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {hbl.directionFlow}
            </span>
          );
        }
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </span>
        );
      },
    },
  ];

  const actions: EntityAction<HouseBill>[] = [
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: onHBLView,
    },
    {
      key: 'customsDeclarations',
      label: 'Customs Declarations',
      icon: <FileText className="h-4 w-4" />,
      onClick: onHBLManageCustomsDeclarations,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit3 className="h-4 w-4" />,
      onClick: onHBLEdit,
      disabled: (hbl) => !canWrite || hbl.status === 'approved' || hbl.status === 'done',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onHBLDelete,
      variant: 'destructive',
      disabled: (hbl) => !canWrite || hbl.status === 'approved' || hbl.status === 'done',
    },
    {
      key: 'markDone',
      label: 'Mark Done',
      icon: <CheckCheck className="h-4 w-4" />,
      onClick: onHBLMarkDone,
      disabled: (hbl) => !canWrite || hbl.status !== 'approved',
    },
  ];

  // Note: searchFilter removed - now using server-side filtering via FilterTextbox

  return (
    <EntityTable
      entities={hbls}
      loading={loading}
      fetching={fetching}
      error={error ?? null}
      entityName="HBL"
      entityNamePlural="HBLs"
      getId={(hbl) => hbl.id}
      columns={columns}
      actions={actions}
      // Removed searchPlaceholder and searchFilter - using FilterTextbox instead
      onCreateNew={onCreateHBL}
      canCreate={canCreate}
      canBulkEdit={false}
      enablePagination={true}
      initialPageSize={pagination.pageSize}
      pageSizeOptions={[10, 20, 50, 100]}
      enableServerSidePagination={true}
      totalCount={totalCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      emptyStateMessage="No HBLs found"
      emptyStateIcon={<FileText className="h-12 w-12 text-gray-400" />}
      className={className}
    />
  );
};

export default HBLTable;
