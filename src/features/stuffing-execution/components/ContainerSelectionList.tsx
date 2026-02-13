import { useMemo, useState } from 'react';
import { RefreshCw, Box, Calendar, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { formatDate } from '@/shared/utils/date-format';
import type {
  ExportOrder,
  ExportPlan,
  ExportPlanContainer,
  ExportPlanStatus,
} from '@/features/stuffing-planning';

interface ContainerSelectionListProps {
  flowName: string;
  groups: Array<{ plan: ExportPlan; containers: ExportPlanContainer[] }>;
  exportOrdersByPlanId: Record<string, ExportOrder | null>;
  selectedContainer: { planId: string; containerId: string } | null;
  onSelectContainer: (planId: string, containerId: string) => void;
  planOptions: Array<{ value: string; label: string }>;
  planStatus: ExportPlanStatus | 'all';
  onPlanStatusChange: (value: ExportPlanStatus | 'all') => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const PLAN_STATUS_OPTIONS: Array<{ value: ExportPlanStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'CREATED', label: 'Created' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

const getPlanLabel = (plan: ExportPlan) => plan.code ?? plan.id;

const getStatusBadge = (status: ExportPlanStatus) => {
  if (status === 'IN_PROGRESS') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  }
  if (status === 'DONE') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
};

const getContainerStatusBadge = (status: ExportPlanContainer['status']) => {
  if (status === 'IN_PROGRESS') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  }
  if (status === 'STUFFED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
};
export const ContainerSelectionList = ({
  flowName,
  groups,
  exportOrdersByPlanId,
  selectedContainer,
  onSelectContainer,
  planOptions,
  planStatus,
  onPlanStatusChange,
  planFilter,
  onPlanFilterChange,
  isLoading = false,
  error,
  onRefresh,
}: ContainerSelectionListProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalContainers = useMemo(
    () => groups.reduce((acc, group) => acc + group.containers.length, 0),
    [groups],
  );

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Stuffing Execution
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Flow: {flowName}
            </p>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefreshClick}
              loading={isRefreshing}
            >
              {!isRefreshing && <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Containers ({totalContainers})
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Plan Status
              <select
                value={planStatus}
                onChange={(event) =>
                  onPlanStatusChange(event.target.value as ExportPlanStatus | 'all')
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {PLAN_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Stuffing Plan
              <select
                value={planFilter}
                onChange={(event) => onPlanFilterChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All plans</option>
                {planOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {/* TODO: forwarder filter when backend parameters are available. */}
          {/* TODO: container number filter when backend parameters are available. */}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
            Loading containers...
          </div>
        ) : error ? (
          <div className="m-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Box className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              No eligible containers
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Containers appear here when stuffing is in progress.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {groups.map((group) => {
              const exportOrder = exportOrdersByPlanId[group.plan.id];
              const planLabel = getPlanLabel(group.plan);
              return (
                <div key={group.plan.id} className="py-4">
                  <div className="px-5 pb-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {planLabel}
                          </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadge(
                                group.plan.status,
                              )}`}
                            >
                            {group.plan.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Forwarder:{' '}
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {exportOrder?.forwarderCode ?? '—'}
                          </span>
                          {exportOrder?.bookingConfirmation?.etd ? (
                            <span className="ml-3">
                              ETD:{' '}
                              <span className="font-medium text-gray-700 dark:text-gray-200">
                                {formatDate(exportOrder.bookingConfirmation.etd)}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 px-5">
                    {group.containers.map((container) => {
                      const isSelected =
                        selectedContainer?.planId === group.plan.id &&
                        selectedContainer?.containerId === container.id;

                      return (
                        <div
                          key={container.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectContainer(group.plan.id, container.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onSelectContainer(group.plan.id, container.id);
                            }
                          }}
                          aria-pressed={isSelected}
                          className={`flex cursor-pointer flex-col gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-900/20'
                              : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {container.containerNumber ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Type: {container.containerTypeCode ?? '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${getContainerStatusBadge(
                                  container.status,
                                )}`}
                              >
                                {container.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Plan: {planLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContainerSelectionList;
