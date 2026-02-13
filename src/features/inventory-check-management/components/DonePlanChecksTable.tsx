import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';
import EntityTable, { type EntityColumn } from '@/shared/components/EntityTable';
import { DynamicFilter, type FilterFieldConfig, type FilterValues } from '@/shared/components/DynamicFilter';
import type { InventoryPlanCheck } from '../types';

interface DonePlanChecksTableProps {
  rows: InventoryPlanCheck[];
  loading: boolean;
  fetching: boolean;
  error: string | null;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  totalCount: number;
  onView?: (plan: InventoryPlanCheck) => void;
  filterValues: FilterValues;
  onApplyFilter: (values: FilterValues) => void;
  onClearFilter: () => void;
}

const formatDateTime = (value: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const statusStyles: Record<InventoryPlanCheck['status'], string> = {
  CREATED:
    'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  RECORDING:
    'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
  RECORDED:
    'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  EXPLAINED:
    'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800',
  ADJUSTING:
    'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800',
  DONE:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
  CANCELED:
    'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
};

const typeStyles: Record<InventoryPlanCheck['type'], string> = {
  INTERNAL:
    'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
  CUSTOM:
    'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800',
};

const DonePlanChecksTable: React.FC<DonePlanChecksTableProps> = ({
  rows,
  loading,
  fetching,
  error,
  pagination,
  onPaginationChange,
  totalCount,
  onView,
  filterValues,
  onApplyFilter,
  onClearFilter,
}) => {
  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        type: 'datetime',
        name: 'estimateStartFrom',
        label: 'Estimate start (from)',
      },
      {
        type: 'datetime',
        name: 'estimateStartTo',
        label: 'Estimate start (to)',
      },
      {
        type: 'datetime',
        name: 'actualStartFrom',
        label: 'Actual start (from)',
      },
      {
        type: 'datetime',
        name: 'actualStartTo',
        label: 'Actual start (to)',
      },
      {
        type: 'datetime',
        name: 'actualEndFrom',
        label: 'Actual end (from)',
      },
      {
        type: 'datetime',
        name: 'actualEndTo',
        label: 'Actual end (to)',
      },
      {
        type: 'select',
        name: 'type',
        label: 'Type',
        options: [
          { value: 'INTERNAL', label: 'INTERNAL' },
          { value: 'CUSTOM', label: 'CUSTOM' },
        ],
        keyField: 'value',
        valueField: 'label',
        placeholder: 'All types',
      },
      {
        type: 'multiselect',
        name: 'mismatchFlags',
        label: 'Mismatch flags',
        options: [
          { value: 'location', label: 'Location mismatch' },
          { value: 'qty', label: 'Qty mismatch' },
        ],
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Any',
      },
    ],
    [],
  );

  const columns: EntityColumn<InventoryPlanCheck>[] = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[item.type]}`}
        >
          {item.type}
        </span>
      ),
    },
    {
      key: 'estimateStartTime',
      label: 'Estimated Start',
      sortable: true,
      render: (item) => formatDateTime(item.estimateStartTime),
    },
    {
      key: 'actualStartTime',
      label: 'Actual Start',
      sortable: true,
      sortingFn: (rowA, rowB) => {
        const a = Date.parse(rowA.original.actualStartTime || '');
        const b = Date.parse(rowB.original.actualStartTime || '');
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return 1;
        if (Number.isNaN(b)) return -1;
        return a - b;
      },
      render: (item) => formatDateTime(item.actualStartTime),
    },
    {
      key: 'actualEndTime',
      label: 'Actual End',
      sortable: true,
      sortingFn: (rowA, rowB) => {
        const a = Date.parse(rowA.original.actualEndTime || '');
        const b = Date.parse(rowB.original.actualEndTime || '');
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return 1;
        if (Number.isNaN(b)) return -1;
        return a - b;
      },
      render: (item) => formatDateTime(item.actualEndTime),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
        >
          {item.status}
        </span>
      ),
    },
    {
      key: 'flags',
      label: 'Mismatch Flags',
      render: (item) => {
        if (!item.locationMismatchFlag && !item.qtyMismatchFlag) {
          return '—';
        }
        return (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {item.locationMismatchFlag && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Location mismatch
              </span>
            )}
            {item.qtyMismatchFlag && (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                Qty mismatch
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DynamicFilter
          fields={filterFields}
          initialValues={filterValues}
          onApplyFilter={onApplyFilter}
          onClear={onClearFilter}
          buttonLabel="Filters"
        />
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-xl bg-white dark:border-gray-700 dark:bg-gray-800">
        <EntityTable
          entities={rows}
          loading={loading}
          fetching={fetching}
          error={error}
          entityName="plan check"
          entityNamePlural="plan checks"
          getId={(item) => item.id}
          columns={columns}
          actions={[
            {
              key: 'view',
              label: 'View',
              icon: <Eye className="h-4 w-4" />,
              onClick: (item) => onView?.(item),
            },
          ]}
          enablePagination
          enableServerSidePagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          totalCount={totalCount}
        />
      </div>
    </section>
  );
};

export default DonePlanChecksTable;
