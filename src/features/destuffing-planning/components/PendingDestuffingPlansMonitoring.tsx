import React, { useCallback, useMemo, useState } from 'react';
import { Calendar, Package, Clock, ChevronDown, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import { usePendingDestuffingPlans, useDestuffingPlanStatusMutation, useDestuffingPlans } from '../hooks';
import type { DestuffingPlan } from '../types';
import { PendingContainerDetailModal } from './PendingContainerDetailModal';
import {
  getPendingComparableDate,
  reorderPendingPlanContainers,
  sortPendingPlansByRecency,
} from '../utils/pending-destuff-plan-helpers';
import {
  formatDateTimeRange,
  formatSingleDateTime,
  getContainerSizeLabel,
  getContainerTypeCode,
  statusStyles,
} from '@/shared/features/plan/utils/plan-display-helpers';
import { getTempOnHoldCounts, logTempDataWarning } from '../utils/temp-onhold-data';
import { getCargoBadgeClassName, getCargoBadgeConfig } from '@/shared/utils/cargo-badge';
import { useAuth } from '@/features/auth/useAuth';
import {
  buildCargoReleaseNotAllowedHint,
  buildCargoReleaseNotAllowedMessage,
  buildDestuffingNotAllowedHint,
  buildDestuffingNotAllowedMessage,
  getCargoReleaseBlockedContainerLabels,
  getBlockedDestuffingContainerLabels,
} from '../utils/destuffing-start-guard';

export const PendingDestuffingPlansMonitoring: React.FC = () => {
  const { can } = useAuth();
  const canWriteDestuff = can?.('destuff_plan:write') ?? false;
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());
  const [selectedContainer, setSelectedContainer] = useState<DestuffingPlan['containers'][number] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DestuffingPlan | null>(null);
  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePendingDestuffingPlans();

  const { data: inProgressPlans } = useDestuffingPlans({ status: 'IN_PROGRESS' });
  const changePlanStatus = useDestuffingPlanStatusMutation();
  const [reactivatingPlanId, setReactivatingPlanId] = useState<string | null>(null);
  const hasActivePlan = (inProgressPlans?.results?.length ?? 0) > 0;

  const plans: DestuffingPlan[] = useMemo(
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

  const handleContainerClick = useCallback((container: DestuffingPlan['containers'][number], plan: DestuffingPlan) => {
    setSelectedContainer(container);
    setSelectedPlan(plan);
    setIsContainerModalOpen(true);
  }, []);

  const handleCloseContainerModal = useCallback(() => {
    setIsContainerModalOpen(false);
    setSelectedContainer(null);
    setSelectedPlan(null);
  }, []);

  const handleMarkDoing = useCallback(
    async (plan: DestuffingPlan) => {
      if (!canWriteDestuff) {
        toast.error('You do not have permission to modify destuffing plans.');
        return;
      }
      const equipmentBooked = plan.equipmentBooked ?? false;
      const appointmentConfirmed =
        plan.approvedAppointment ?? plan.appointmentConfirmed ?? false;

      if (!equipmentBooked || !appointmentConfirmed) {
        toast.error(
          'Cannot resume execution. Please ensure equipment is booked and appointment is confirmed.',
        );
        return;
      }

      const blockedContainers = getBlockedDestuffingContainerLabels(plan);
      const blockedCargoReleaseContainers =
        getCargoReleaseBlockedContainerLabels(plan);
      const blockedReasons = [
        blockedContainers.length > 0
          ? buildDestuffingNotAllowedMessage(blockedContainers)
          : null,
        blockedCargoReleaseContainers.length > 0
          ? buildCargoReleaseNotAllowedMessage(blockedCargoReleaseContainers)
          : null,
      ]
        .filter(Boolean)
        .join(' ');
      if (blockedReasons) {
        toast.error(blockedReasons);
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
        toast.success(`Plan ${plan.code} is now in progress`);
      } finally {
        setReactivatingPlanId(null);
      }
    },
    [canWriteDestuff, changePlanStatus, hasActivePlan, refetch],
  );

  const renderPlanRow = (plan: DestuffingPlan) => {
    const containers = reorderPendingPlanContainers(plan.containers);
    const isExpanded = expandedPlanIds.has(plan.id);
    const sizeLabel = `${plan.containers.length} container${plan.containers.length === 1 ? '' : 's'}`;
    const pendingTimestamp = getPendingComparableDate(plan);

    const equipmentBooked = plan.equipmentBooked ?? false;
    const appointmentConfirmed =
      plan.approvedAppointment ?? plan.appointmentConfirmed ?? false;
    const blockedContainers = getBlockedDestuffingContainerLabels(plan);
    const blockedCargoReleaseContainers =
      getCargoReleaseBlockedContainerLabels(plan);
    const hasBlockedContainers =
      blockedContainers.length > 0 || blockedCargoReleaseContainers.length > 0;
    const markDoingDisabledReason = [
      blockedContainers.length > 0
        ? buildDestuffingNotAllowedMessage(blockedContainers)
        : null,
      blockedCargoReleaseContainers.length > 0
        ? buildCargoReleaseNotAllowedMessage(blockedCargoReleaseContainers)
        : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
    const markDoingHints = [
      blockedContainers.length > 0
        ? buildDestuffingNotAllowedHint(blockedContainers)
        : null,
      blockedCargoReleaseContainers.length > 0
        ? buildCargoReleaseNotAllowedHint(blockedCargoReleaseContainers)
        : null,
    ].filter(Boolean) as string[];
    const onHoldCounts = getTempOnHoldCounts(plan.id);

    // Log temporary data warning in dev mode
    if (process.env.NODE_ENV === 'development' && isExpanded) {
      logTempDataWarning(`Pending Destuffing Plan ${plan.code}`);
    }

    return (
      <div
        key={plan.id}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => togglePlanExpansion(plan.id)}
          className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
          aria-expanded={isExpanded}
          aria-controls={`pending-destuff-plan-${plan.id}`}
          aria-label={`Toggle containers for ${plan.code}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-gray-900 dark:text-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.code}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full">
                  <Package className="h-3.5 w-3.5 mr-1" />
                  {sizeLabel}
                </span>
                {onHoldCounts.containers > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700/70 rounded-full">
                    {onHoldCounts.containers} on hold
                  </span>
                )}
                {plan.forwarderCode && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-full">
                    {plan.forwarderCode}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Planned:</span>{' '}
                  {formatDateTimeRange(plan.plannedStart, plan.plannedEnd)}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Actual:</span>{' '}
                  {formatDateTimeRange(plan.executionStart, plan.executionEnd)}
                </p>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Pending since:</span>
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold ${equipmentBooked
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                    }`}
                >
                  {equipmentBooked ? 'Equipment booked' : 'Equipment pending'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold ${appointmentConfirmed
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                    }`}
                >
                  {appointmentConfirmed ? 'Appointment confirmed' : 'Appointment pending'}
                </span>
              </div>
              <div className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-3 pt-1 space-y-2">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkDoing(plan);
                }}
                disabled={
                  reactivatingPlanId === plan.id ||
                  changePlanStatus.isPending ||
                  hasActivePlan ||
                  !equipmentBooked ||
                  !appointmentConfirmed ||
                  hasBlockedContainers
                }
                title={markDoingDisabledReason}
                loading={reactivatingPlanId === plan.id}
                className="gap-2"
              >
                Mark Doing
              </Button>
            </div>
            {markDoingHints.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                  <div className="space-y-1">
                    <p className="font-semibold">Mark Doing is disabled.</p>
                    {markDoingHints.map((hint) => (
                      <p key={hint}>{hint}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <div
            id={`pending-destuff-plan-${plan.id}`}
            className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 space-y-3"
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
                const hblNumbers = (container.hbls || [])
                  .map((hbl) => hbl.hblNo)
                  .filter(Boolean);

                const cargoNature = container.orderContainer.summary?.cargo_nature;
                const cargoBadgeConfig = getCargoBadgeConfig(cargoNature);

                return (
                  <button
                    key={container.id}
                    type="button"
                    onClick={() => handleContainerClick(container, plan)}
                    data-testid={`pending-destuff-plan-container-${container.id}`}
                    data-status={container.status}
                    className={`w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 ${container.status === 'REJECTED'
                      ? 'border-red-200 shadow-sm'
                      : 'border-gray-200'
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass}`}
                        >
                          {container.status}
                        </span>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {container.orderContainer.containerNo || 'Unknown container'}
                        </p>
                        {cargoBadgeConfig && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${getCargoBadgeClassName(cargoNature)}`}
                          >
                            {cargoBadgeConfig.icon ? (
                              <cargoBadgeConfig.icon className="h-3.5 w-3.5" />
                            ) : null}
                            {cargoBadgeConfig.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Order Code
                        </span>
                        {container.orderContainer.bookingOrder?.code ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-medium">
                            {container.orderContainer.bookingOrder.code}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-900 dark:text-gray-100">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-medium">
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
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-medium"
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
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Destuffing Plans</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitor destuffing plans waiting for reactivation and refresh to view the latest status.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          loading={isFetching}
          className="gap-2 self-start md:self-auto"
        >
          {!isFetching && <RotateCcw className="h-4 w-4" />}
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <Calendar className="h-6 w-6 mr-2 animate-spin text-gray-500 dark:text-gray-400" />
            Loading pending plans...
          </div>
        ) : isError ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-300 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Unable to load pending plans</p>
            <p className="text-sm text-red-500 dark:text-red-300">Please try again later.</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 gap-2">
            <Calendar className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="font-semibold">No pending destuffing plans available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use the Refresh button to check for newly pending plans.
            </p>
          </div>
        ) : (
          plans.map((plan) => renderPlanRow(plan))
        )}
      </div>

      {/* Container Detail Modal */}
      <PendingContainerDetailModal
        isOpen={isContainerModalOpen}
        onClose={handleCloseContainerModal}
        container={selectedContainer}
        plan={selectedPlan}
      />
    </div>
  );
};

export default PendingDestuffingPlansMonitoring;
