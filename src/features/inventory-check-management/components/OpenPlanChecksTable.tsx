import React from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Building2, CheckCircle2, Eye, Globe, Hash, MapPin, Pencil, Trash2 } from 'lucide-react';
import { PaginationControls, PaginationInfo } from '@/shared/components/pagination';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import type { InventoryPlanCheck } from '../types';

interface OpenPlanChecksTableProps {
  rows: InventoryPlanCheck[];
  loading: boolean;
  fetching: boolean;
  error: string | null;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  totalCount: number;
  onView?: (plan: InventoryPlanCheck) => void;
  onEdit?: (plan: InventoryPlanCheck) => void;
  onDelete?: (plan: InventoryPlanCheck) => void;
  canWrite?: boolean;
}

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

const formatDateTime = (value: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const OpenPlanChecksTable: React.FC<OpenPlanChecksTableProps> = ({
  rows,
  loading,
  fetching,
  error,
  pagination,
  onPaginationChange,
  totalCount,
  onView,
  onEdit,
  onDelete,
  canWrite = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const canPreviousPage = pagination.pageIndex > 0;
  const canNextPage = pagination.pageIndex < totalPages - 1;

  const handlePageChange = (pageIndex: number) => {
    onPaginationChange({ ...pagination, pageIndex });
  };

  const handlePageSizeChange = (pageSize: number) => {
    onPaginationChange({ pageIndex: 0, pageSize });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <LoadingSpinner size="sm" />
          Loading open plan checks...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No open plan checks available.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {item.type === 'INTERNAL' ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      {item.type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Estimate Start
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDateTime(item.estimateStartTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Actual Start
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDateTime(item.actualStartTime)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Mismatch Flags
                      </p>
                      {item.locationMismatchFlag || item.qtyMismatchFlag ? (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                          {item.locationMismatchFlag && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                              <MapPin className="h-3.5 w-3.5" />
                              Location mismatch
                            </span>
                          )}
                          {item.qtyMismatchFlag && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                              <Hash className="h-3.5 w-3.5" />
                              Qty mismatch
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="mt-1 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <CheckCircle2 className="h-4 w-4" />
                          No mismatches
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                  <button
                    type="button"
                    onClick={() => onView?.(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    aria-label="View plan check"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(item)}
                    disabled={item.status !== 'CREATED' || !canWrite}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    aria-label="Edit plan check"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(item)}
                    disabled={item.status !== 'CREATED' || !canWrite}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50"
                    aria-label="Delete plan check"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <PaginationInfo
          currentPage={pagination.pageIndex}
          pageSize={pagination.pageSize}
          totalCount={totalCount}
          currentPageSize={rows.length}
          entityName="plan check"
          entityNamePlural="plan checks"
        />
        <PaginationControls
          currentPage={pagination.pageIndex}
          totalPages={totalPages}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          disabled={loading}
          className="pt-2"
        />
      </div>

      {fetching && !loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <LoadingSpinner size="sm" />
          Updating list...
        </div>
      )}
    </div>
  );
};

export default OpenPlanChecksTable;
