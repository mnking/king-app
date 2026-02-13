import React, { useCallback, useMemo, useState } from 'react';
import { Calendar, Package, Clock, ChevronDown, AlertCircle, RotateCcw, Loader2, Play } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { usePendingPlansMonitoring, usePlans, useChangePlanStatus } from '@/features/cfs-receive-planning/hooks';
import type { EnrichedReceivePlan } from '@/features/cfs-receive-planning/hooks/use-plans-query';
import { toast } from 'react-hot-toast';
import {
  getPendingComparableDate,
  reorderPendingPlanContainers,
  sortPendingPlansByRecency,
} from '../helpers';
import {
  formatDateTimeRange,
  formatSingleDateTime,
  getContainerSizeLabel,
  getContainerTypeCode,
  statusStyles,
} from '@/shared/features/plan/utils/plan-display-helpers';
import { getCargoBadgeClassName, getCargoBadgeConfig } from '@/shared/utils/cargo-badge';
import { getStatusBadgeClassName, getStatusBadgeConfig } from '@/shared/utils/status-badge';

export const PendingPlanMonitoring: React.FC = () => {
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePendingPlansMonitoring();
  const { data: inProgressPlans } = usePlans({ status: 'IN_PROGRESS' });
  const changePlanStatus = useChangePlanStatus();
  const [reactivatingPlanId, setReactivatingPlanId] = useState<string | null>(null);
  const hasActivePlan = (inProgressPlans?.results?.length ?? 0) > 0;

  const plans: EnrichedReceivePlan[] = useMemo(
    () => sortPendingPlansByRecency(data?.results ?? []),
    [data],
  );

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleRefresh = useCallback(() => {
    void refetch({ throwOnError: false });
  }, [refetch]);

  const handleMarkDoing = useCallback(
    async (plan: EnrichedReceivePlan) => {
      if (plan.containers.length === 0) {
        toast.error('Cannot resume execution for an empty plan.');
        return;
      }
      if (!plan.equipmentBooked || !plan.portNotified) {
        toast.error(
          'Cannot resume execution. Please ensure equipment is booked and the port is notified.',
        );
        return;
      }

      if (hasActivePlan) {
        toast.error('Another plan is already in progress. Complete it before resuming this plan.');
        return;
      }

      setReactivatingPlanId(plan.id);
      try {
        await changePlanStatus.mutateAsync({
          id: plan.id,
          data: { status: 'IN_PROGRESS' },
        });
        setExpandedPlanIds((prev) => {
          const next = new Set(prev);
          next.delete(plan.id);
          return next;
        });
        await refetch({ throwOnError: false });
      } finally {
        setReactivatingPlanId(null);
      }
    },
    [changePlanStatus, hasActivePlan, refetch],
  );

  const renderPlanRow = (plan: EnrichedReceivePlan) => {
    const containers = reorderPendingPlanContainers(plan.containers);
    const isExpanded = expandedPlanIds.has(plan.id);
    const sizeLabel = `${plan.containers.length} container${plan.containers.length === 1 ? '' : 's'}`;
    const pendingTimestamp = getPendingComparableDate(plan);
    const statusBadge = getStatusBadgeConfig(plan.status ?? 'PENDING');
    const statusBadgeClassName = getStatusBadgeClassName(plan.status ?? 'PENDING');

    return (
      <div
        key={plan.id}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-4 overflow-hidden transition-all duration-200"
      >
        <button
          type="button"
          onClick={() => togglePlanExpansion(plan.id)}
          className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-all duration-200"
          aria-expanded={isExpanded}
          aria-controls={`pending-plan-${plan.id}`}
          aria-label={`Toggle containers for ${plan.code}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.code}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${statusBadgeClassName}`}>
                  {statusBadge.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full">
                  <Package className="h-3.5 w-3.5" />
                  {sizeLabel}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Planned:</span>{' '}
                  {formatDateTimeRange(plan.plannedStart, plan.plannedEnd)}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Actual:</span>{' '}
                  {formatDateTimeRange(plan.executionStart, plan.executionEnd)}
                </p>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Pending since:</span>
                  <span className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-100 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    {pendingTimestamp ? formatSingleDateTime(pendingTimestamp) : '—'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-colors duration-150 ${
                    plan.equipmentBooked
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {plan.equipmentBooked ? 'Equipment booked' : 'Equipment pending'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-colors duration-150 ${
                    plan.portNotified
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {plan.portNotified ? 'Port notified' : 'Port pending'}
                </span>
              </div>
              <div className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-3 pt-1 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkDoing(plan);
              }}
              loading={reactivatingPlanId === plan.id || changePlanStatus.isPending}
              disabled={
                reactivatingPlanId === plan.id ||
                changePlanStatus.isPending ||
                hasActivePlan ||
                plan.containers.length === 0 ||
                !plan.equipmentBooked ||
                !plan.portNotified
              }
              className="gap-2"
            >
              {!reactivatingPlanId && !changePlanStatus.isPending && <Play className="h-4 w-4" />}
              Mark Doing
            </Button>
          </div>
        )}

        {isExpanded && (
          <div
            id={`pending-plan-${plan.id}`}
            className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-3"
          >
            {containers.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                No containers available for this plan.
              </div>
            ) : (
              containers.map((container) => {
                const statusClass = statusStyles[container.status] || statusStyles.WAITING;
                const typeCode = getContainerTypeCode(container);
                const hblNumbers = (container.orderContainer.hbls || [])
                  .map((hbl) => hbl.hblNo)
                  .filter(Boolean);

                // Get cargo nature badge from backend summary data (using shared utility)
                const cargoNature = container.orderContainer.summary?.cargo_nature;
                const specialCargoBadge = getCargoBadgeConfig(cargoNature);
                const cargoBadgeClassName = getCargoBadgeClassName(cargoNature);

                return (
                  <div
                    key={container.id}
                    data-testid={`pending-plan-container-${container.id}`}
                    data-status={container.status}
                    className={`bg-white dark:bg-gray-800 border rounded-lg p-3 ${
                      container.status === 'REJECTED'
                        ? 'border-red-200 dark:border-red-700 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass}`}
                        >
                          {container.status}
                        </span>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {container.orderContainer.containerNo || 'Unknown container'}
                        </p>
                        {specialCargoBadge && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-150 ${cargoBadgeClassName}`}>
                            {specialCargoBadge.icon && <specialCargoBadge.icon className="h-3.5 w-3.5" />}
                            {specialCargoBadge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Order Code
                        </span>
                        {container.orderContainer.bookingOrder?.code ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {container.orderContainer.bookingOrder.code}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Type</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{typeCode ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Size</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {getContainerSizeLabel(typeCode)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Seal Number</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {container.orderContainer.sealNumber || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">MBL Number</p>
                        {container.orderContainer.mblNumber ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {container.orderContainer.mblNumber}
                          </span>
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-gray-100">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">HBL Numbers</p>
                        {hblNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hblNumbers.map((hblNo) => (
                              <span
                                key={hblNo}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                              >
                                {hblNo}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-gray-100">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Plans</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitor receive plans waiting for reconciliation and refresh to view the latest status.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          loading={isFetching}
          variant="secondary"
          size="sm"
          className="gap-2 self-start md:self-auto"
        >
          {!isFetching && <RotateCcw className="h-4 w-4" />}
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <Loader2 className="h-6 w-6 mr-2 animate-spin" />
            Loading pending plans...
          </div>
        ) : isError ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-400 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Unable to load pending plans</p>
            <p className="text-sm text-red-500 dark:text-red-300">Please try again later.</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 gap-2">
            <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="font-semibold">No pending plans available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use the Refresh button to check for newly pending plans.
            </p>
          </div>
        ) : (
          plans.map((plan) => renderPlanRow(plan))
        )}
      </div>
    </div>
  );
};

export default PendingPlanMonitoring;
