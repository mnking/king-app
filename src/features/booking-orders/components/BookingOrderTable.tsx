import React from 'react';
import { Package, Edit3, Trash2, Eye } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import type { BookingOrder } from '../types';
import EntityTable from '@/shared/components/EntityTable';
import type {
  EntityColumn,
  EntityAction,
} from '@/shared/components/EntityTable';

interface BookingOrderTableProps {
  orders: BookingOrder[];
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onOrderView: (order: BookingOrder) => void;
  onOrderEdit: (order: BookingOrder) => void;
  onOrderDelete: (order: BookingOrder) => void;
  onCreateOrder: () => void;
  className?: string;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  canCreate?: boolean;
  canWrite?: boolean;
}

export const BookingOrderTable: React.FC<BookingOrderTableProps> = ({
  orders,
  loading,
  fetching,
  error,
  onOrderView,
  onOrderEdit,
  onOrderDelete,
  onCreateOrder,
  className = '',
  totalCount,
  pagination,
  onPaginationChange,
  canCreate = true,
  canWrite = true,
}) => {
  // Status badge helper
  const getStatusBadge = (status?: string | null) => {
    const statusConfig: Record<
      string,
      { color: string; icon: string; label: string }
    > = {
      DRAFT: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: '○',
        label: 'Draft',
      },
      SUBMITTED: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: '◎',
        label: 'Submitted',
      },
      APPROVED: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: '✓',
        label: 'Approved',
      },
      DONE: {
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: '●',
        label: 'Done',
      },
      REJECTED: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: '!',
        label: 'Rejected',
      },
      CANCELLED: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: 'X',
        label: 'Cancelled',
      },
    };

    const config = status ? statusConfig[status] : undefined;
    const fallbackConfig = {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      icon: '?',
      label: status ? String(status) : 'Unknown',
    };
    const resolvedConfig = config ?? fallbackConfig;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${resolvedConfig.color}`}
      >
        {resolvedConfig.icon} {resolvedConfig.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const isDoneStatus = (status?: string | null) => status === 'DONE';

  // Entity Table configuration
  // Note: Client-side sorting is disabled - use DynamicFilter for server-side sorting
  const columns: EntityColumn<BookingOrder>[] = [
    {
      key: 'agentCode',
      label: 'Agent',
      searchable: true,
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {order.agentCode || '—'}
        </div>
      ),
    },
    {
      key: 'bookingNumber',
      label: 'Booking Number',
      searchable: true,
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {order.bookingNumber || '—'}
        </div>
      ),
    },
    {
      key: 'eta',
      label: 'ETA',
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {order.eta ? formatDate(order.eta) : '—'}
        </div>
      ),
    },
    {
      key: 'vesselCode',
      label: 'Vessel',
      searchable: true,
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {order.vesselCode || '—'}
        </div>
      ),
    },
    {
      key: 'voyage',
      label: 'Voyage',
      searchable: true,
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {order.voyage}
          </div>
          {order.subVoyage && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sub: {order.subVoyage}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'containers',
      label: 'Containers',
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {order.containers?.length || 0}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => getStatusBadge(order.status),
    },
    {
      key: 'code',
      label: 'Order Code',
      searchable: true,
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {order.code || '-'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      sortable: false,  // Sorting handled server-side via DynamicFilter
      render: (order) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(order.createdAt)}
        </div>
      ),
    },
  ];

  const actions: EntityAction<BookingOrder>[] = [
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: onOrderView,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit3 className="h-4 w-4" />,
      onClick: onOrderEdit,
      hidden: (order) => isDoneStatus(order.status),
      disabled: (order) => !canWrite || order.status === 'APPROVED',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onOrderDelete,
      variant: 'destructive',
      hidden: (order) => isDoneStatus(order.status),
      disabled: (order) => !canWrite || order.status === 'APPROVED',
    },
  ];

  // Note: searchFilter removed - now using server-side filtering via FilterTextbox

  return (
    <EntityTable
      entities={orders}
      loading={loading}
      fetching={fetching}
      error={error ?? null}
      entityName="Booking Order"
      entityNamePlural="Booking Orders"
      getId={(order) => order.id}
      columns={columns}
      actions={actions}
      // Removed searchPlaceholder and searchFilter - using FilterTextbox instead
      onCreateNew={onCreateOrder}
      canCreate={canCreate}
      canBulkEdit={false}
      enablePagination={true}
      initialPageSize={pagination.pageSize}
      pageSizeOptions={[10, 20, 50, 100]}
      enableServerSidePagination={true}
      totalCount={totalCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      emptyStateMessage="No booking orders found. Create your first order."
      emptyStateIcon={<Package className="h-12 w-12 text-gray-400" />}
      className={className}
    />
  );
};

export default BookingOrderTable;
