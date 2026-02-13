import React from 'react';
import { ClipboardList, Eye, Edit3, Trash2 } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import type { ExportServiceOrder } from '../types';
import EntityTable from '@/shared/components/EntityTable';
import type { EntityAction, EntityColumn } from '@/shared/components/EntityTable';

interface ExportServiceOrderTableProps {
  orders: ExportServiceOrder[];
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onOrderView: (order: ExportServiceOrder) => void;
  onOrderEdit: (order: ExportServiceOrder) => void;
  onOrderDelete: (order: ExportServiceOrder) => void;
  onCreateStuffingPlan?: (order: ExportServiceOrder) => void;
  onViewStuffingPlan?: (order: ExportServiceOrder) => void;
  creatingPlanId?: string | null;
  className?: string;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  canCreate?: boolean;
  canWrite?: boolean;
  resolveForwarderName?: (order: ExportServiceOrder) => string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const getStatusBadge = (status?: string | null) => {
  const statusConfig: Record<string, { color: string; label: string }> = {
    DRAFT: {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      label: 'Draft',
    },
    APPROVED: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: 'Approved',
    },
    DONE: {
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      label: 'Done',
    },
  };

  const config = status ? statusConfig[status] : undefined;
  const fallbackConfig = {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    label: status ? String(status) : 'Unknown',
  };

  const resolvedConfig = config ?? fallbackConfig;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${resolvedConfig.color}`}>
      {resolvedConfig.label}
    </span>
  );
};

export const ExportServiceOrderTable: React.FC<ExportServiceOrderTableProps> = ({
  orders,
  loading,
  fetching,
  error,
  onOrderView,
  onOrderEdit,
  onOrderDelete,
  onCreateStuffingPlan,
  onViewStuffingPlan,
  creatingPlanId,
  className = '',
  totalCount,
  pagination,
  onPaginationChange,
  canCreate = true,
  canWrite = true,
  resolveForwarderName,
}) => {
  const columns: EntityColumn<ExportServiceOrder>[] = [
    {
      key: 'status',
      label: 'Status',
      render: (order) => getStatusBadge(order.status),
    },
    {
      key: 'code',
      label: 'Order Number',
      searchable: true,
      render: (order) => (
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {order.code ?? '-'}
        </div>
      ),
    },
    {
      key: 'forwarder',
      label: 'Forwarder',
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {resolveForwarderName ? resolveForwarderName(order) : order.forwarderCode ?? '-'}
        </div>
      ),
    },
    {
      key: 'bookingNumber',
      label: 'Booking Confirmation',
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {order.bookingConfirmation?.bookingNumber ?? '-'}
        </div>
      ),
    },
    {
      key: 'stuffingPlan',
      label: 'Stuffing Plan',
      render: (order) => {
        if (!order.planId) {
          return <span className="text-sm text-gray-500">-</span>;
        }

        return (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onViewStuffingPlan?.(order);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            View plan
          </button>
        );
      },
    },
    {
      key: 'requestTime',
      label: 'Request Time',
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(order.requestTime)}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Update',
      render: (order) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(order.updatedAt)}
        </div>
      ),
    },
  ];

  const actions: EntityAction<ExportServiceOrder>[] = [
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: onOrderView,
    },
    ...(onViewStuffingPlan
      ? [
          {
            key: 'view-stuffing-plan',
            label: 'View Stuffing Plan',
            icon: <ClipboardList className="h-4 w-4" />,
            onClick: onViewStuffingPlan,
            hidden: (order) => !order.planId,
          },
        ]
      : []),
    ...(onCreateStuffingPlan
      ? [
          {
            key: 'create-stuffing-plan',
            label: 'Create Stuffing Plan',
            icon: <ClipboardList className="h-4 w-4" />,
            onClick: onCreateStuffingPlan,
            hidden: (order) => Boolean(order.planId),
            disabled: (order) =>
              order.status !== 'APPROVED' || !canWrite || Boolean(creatingPlanId),
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit3 className="h-4 w-4" />,
      onClick: onOrderEdit,
      disabled: (order) => order.status === 'DONE' || !canWrite,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onOrderDelete,
      variant: 'destructive',
      disabled: (order) => order.status !== 'DRAFT' || !canWrite,
    },
  ];

  return (
    <EntityTable
      entities={orders}
      loading={loading}
      fetching={fetching}
      error={error ?? null}
      entityName="export service order"
      entityNamePlural="export service orders"
      getId={(order) => order.id}
      columns={columns}
      actions={actions}
      className={className}
      enablePagination
      enableServerSidePagination
      totalCount={totalCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      initialPageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
      canCreate={canCreate}
      canEdit={canWrite}
      canDelete={canWrite}
    />
  );
};

export default ExportServiceOrderTable;
