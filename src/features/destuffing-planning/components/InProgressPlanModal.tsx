import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, Package, FileText, Receipt, User, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { DestuffingPlan } from '../types';
import type { PlanContainerStatus } from '@/shared/features/plan/types';
import { useDestuffingPlanExecution, destuffingPlanExecutionQueryKey } from '../hooks';
import { getContainerTypeCode } from '@/shared/features/plan/utils/plan-display-helpers';
import {
  CARGO_RELEASE_STATUS,
  type CargoReleaseStatus,
} from '@/shared/constants/container-status';

const EMPTY_CONTAINERS: DestuffingPlan['containers'] = [];

interface InProgressPlanModalProps {
  planId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  onCancelPlan: (plan: DestuffingPlan) => Promise<void>;
  onMarkDone: (plan: DestuffingPlan) => Promise<void>;
  onMarkPending: (plan: DestuffingPlan) => Promise<void>;
  isProcessing?: boolean;
}

const statusLabelMap: Record<PlanContainerStatus, string> = {
  WAITING: 'Waiting',
  IN_PROGRESS: 'In_Progress',
  ON_HOLD: 'On_Hold',
  DONE: 'Done',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
  DEFERRED: 'Deferred',
};

const toCargoReleaseStatusEnum = (value?: string | null): CargoReleaseStatus | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');

  return Object.values(CARGO_RELEASE_STATUS).includes(normalized as CargoReleaseStatus)
    ? (normalized as CargoReleaseStatus)
    : null;
};

const allowDestuffingBadgeClass = (isAllowed: boolean) =>
  isAllowed
    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

const cargoReleaseBadgeClass = (status: CargoReleaseStatus | null) =>
  status === CARGO_RELEASE_STATUS.APPROVED
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

export const InProgressPlanModal: React.FC<InProgressPlanModalProps> = ({
  planId,
  isOpen,
  onClose,
  onCancelPlan,
  onMarkDone,
  onMarkPending,
  isProcessing = false,
}) => {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<'cancel' | 'pending' | 'done' | null>(null);

  // Fetch plan details with enriched container data
  const {
    data: plan,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDestuffingPlanExecution(planId, { enabled: isOpen && Boolean(planId) });

  const containers = plan?.containers ?? EMPTY_CONTAINERS;
  const totalContainers = containers.length;
  const processedContainers = containers.filter((container) => container.status !== 'WAITING');
  const receivedContainers = containers.filter((container) => container.status === 'RECEIVED');
  const waitingContainers = containers.filter((container) => container.status === 'WAITING');
  const completedContainers = containers.filter(
    (container) => container.status === 'DONE',
  );

  const canCancel = waitingContainers.length === totalContainers && totalContainers > 0;
  const canMarkDone = totalContainers > 0 && completedContainers.length === totalContainers;
  const canMarkPending = processedContainers.length > 0 && waitingContainers.length > 0;

  const statusCounts = useMemo(() => {
    return containers.reduce<Record<PlanContainerStatus, number>>(
      (acc, container) => {
        acc[container.status] = (acc[container.status] ?? 0) + 1;
        return acc;
      },
      {
        WAITING: 0,
        RECEIVED: 0,
        REJECTED: 0,
        DEFERRED: 0,
      },
    );
  }, [containers]);

  const adjustedEstimateEnd = useMemo(() => {
    if (!plan) return null;
    if (plan.executionEnd) {
      return plan.executionEnd;
    }
    if (!plan.executionStart || !plan.plannedStart || !plan.plannedEnd) {
      return null;
    }
    const plannedDuration =
      new Date(plan.plannedEnd).getTime() - new Date(plan.plannedStart).getTime();
    if (plannedDuration <= 0) {
      return null;
    }
    const adjusted = new Date(new Date(plan.executionStart).getTime() + plannedDuration);
    return adjusted.toISOString();
  }, [plan]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleRefresh = async () => {
    if (!planId) return;
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: destuffingPlanExecutionQueryKey(planId) }),
        queryClient.invalidateQueries({ queryKey: ['destuffing-plans', 'in-progress'] }),
        queryClient.invalidateQueries({ queryKey: ['destuffing-plans', 'list'] }),
      ]);
      await refetch({ throwOnError: false });
    } catch (error) {
      // Error handled by React Query
      console.error('Failed to refresh plan data', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleAction = async (action: (target: DestuffingPlan) => Promise<void>) => {
    if (!plan) return;
    await action(plan);
  };

  const confirmLabels: Record<
    Exclude<typeof pendingAction, null>,
    { title: string; description: string; confirmLabel: string; intent: 'primary' | 'danger' }
  > = {
    cancel: {
      title: 'Cancel Execution',
      description: `Cancel ${plan?.code ?? 'this plan'} and move it back to SCHEDULED?`,
      confirmLabel: 'Cancel Doing',
      intent: 'danger',
    },
    pending: {
      title: 'Mark Plan Pending',
      description: `Mark ${plan?.code ?? 'this plan'} as PENDING?`,
      confirmLabel: 'Mark Pending',
      intent: 'primary',
    },
    done: {
      title: 'Mark Plan Done',
      description: `Mark ${plan?.code ?? 'this plan'} as DONE?`,
      confirmLabel: 'Mark Done',
      intent: 'primary',
    },
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const actionMap = {
      cancel: onCancelPlan,
      pending: onMarkPending,
      done: onMarkDone,
    };
    const action = actionMap[pendingAction];
    setPendingAction(null);
    await handleAction(action);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Current Execution Details: {plan?.code || '...'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            aria-label="Refresh plan data"
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 text-gray-900 dark:text-gray-100">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading plan details...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-center">
              <p className="text-red-700 dark:text-red-200">Failed to load plan details. Please try again.</p>
            </div>
          )}

          {/* Plan Details */}
          {plan && (
            <>
          {/* Plan Information Section */}
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Planned Start Time */}
              <div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Start Time: </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {plan.plannedStart
                    ? new Date(plan.plannedStart).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '—'}
                </span>
              </div>

              {/* Planned End Time */}
              <div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">End Time: </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {plan.plannedEnd
                    ? new Date(plan.plannedEnd).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '—'}
                </span>
              </div>

              {/* Actual Start Time */}
              <div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Actual Start: </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {plan.executionStart
                    ? new Date(plan.executionStart).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '--'}
                </span>
              </div>

              {/* Actual End Time */}
              <div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Actual End: </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {plan.executionEnd
                    ? new Date(plan.executionEnd).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '--'}
                </span>
              </div>

              {/* Expected End Time (moved to separate row) */}
              <div className="col-span-2">
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">Expected: </span>
                <span className="text-sm text-green-900 dark:text-green-200">
                  {adjustedEstimateEnd
                    ? new Date(adjustedEstimateEnd).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-6">
            <div className="flex items-center gap-8">
              {/* Total Containers */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Total: {totalContainers} containers
              </div>

              {/* Progress Counter */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Progress: <span className="text-green-600 dark:text-green-300">{receivedContainers.length} / {totalContainers}</span> Containers
              </div>

              {/* Rejected Counter */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Rejected: <span className="text-red-600 dark:text-red-300">{statusCounts.REJECTED} / {totalContainers}</span> Containers
              </div>
            </div>
          </div>

          {/* Container List Section */}
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Container List ({containers.length})
            </h3>
            <div className="space-y-4">
            {containers.map((container) => {
              const hblNumbers = (container.hbls || [])
                .map((hbl) => hbl.hblNo)
                .filter(Boolean);
              const typeCode = getContainerTypeCode(container);
              const orderCode = container.orderContainer?.bookingOrder?.code || container.orderContainer?.orderCode;
              const bookingNumber = container.orderContainer?.bookingOrder?.bookingNumber;
              const mblNumber = container.orderContainer?.mblNumber;
              const cargoReleaseStatus = container.orderContainer?.cargoReleaseStatus;
              const cargoReleaseStatusEnum = toCargoReleaseStatusEnum(cargoReleaseStatus);
              const allowDestuffing =
                container.orderContainer?.allowStuffingOrDestuffing === true;
              const isPriority = container.orderContainer?.isPriority;

              const statusBgColor =
                container.status === 'RECEIVED'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                  : container.status === 'REJECTED'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                    : container.status === 'DEFERRED'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : container.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700';

              return (
                <div
                  key={container.id}
                  className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 p-5"
                >
                  {/* Header: Container Number + Status Badges + Type */}
                  <div className="flex items-start gap-3 mb-4">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                        {container.orderContainer?.containerNo ?? '—'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {typeCode ? typeCode : 'Type: N/A'}
                        </span>
                        {container.orderContainer?.sealNumber && (
                          <>
                            <span>•</span>
                            <span>Seal: {container.orderContainer.sealNumber ?? '—'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isPriority && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 whitespace-nowrap transition-colors duration-150">
                          <Zap className="h-3.5 w-3.5" />
                          High Priority
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBgColor}`}>
                        {statusLabelMap[container.status]}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-t dark:border-gray-700 pt-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</p>
                      <div className="flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {orderCode ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Booking Number</p>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {bookingNumber ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MBL</p>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {mblNumber ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {container.orderContainer?.forwarderName ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Pills (Cargo Release) */}
                  {cargoReleaseStatus && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cargoReleaseBadgeClass(cargoReleaseStatusEnum)}`}
                      >
                        Cargo Release: {cargoReleaseStatusEnum ?? cargoReleaseStatus}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${allowDestuffingBadgeClass(allowDestuffing)}`}
                      >
                        Allow Destuffing: {allowDestuffing ? 'Allowed' : 'Not Allowed'}
                      </span>
                    </div>
                  )}

                  {/* HBLs Section */}
                  {hblNumbers.length > 0 && (
                    <div className="border-t dark:border-gray-700 pt-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        House B/L ({hblNumbers.length})
                      </p>
                      <div className="max-h-32 overflow-y-auto p-1 -m-1">
                        <div className="flex flex-wrap gap-1.5">
                          {hblNumbers.map((hblNo) => (
                            <span
                              key={hblNo}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-mono font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            >
                              {hblNo}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {containers.length === 0 && (
              <p className="py-8 text-center text-gray-500 dark:text-gray-400">No containers in this plan.</p>
            )}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer with action buttons */}
        {plan && (
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={() => setPendingAction('cancel')}
              disabled={!canCancel || isProcessing}
              title={
                canCancel
                  ? 'Cancel plan execution (only if no containers processed)'
                  : 'Cannot cancel: containers have been processed'
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
            >
              {isProcessing ? 'Cancelling...' : 'Cancel Doing'}
            </button>

            <button
              type="button"
              onClick={() => setPendingAction('pending')}
              disabled={!canMarkPending || isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mark Pending
            </button>

            <button
              type="button"
              onClick={() => setPendingAction('done')}
              disabled={!canMarkDone || isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mark Done
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Close
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => setPendingAction(null)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {confirmLabels[pendingAction].title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              {confirmLabels[pendingAction].description}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmLabels[pendingAction].intent === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {isProcessing ? 'Confirming...' : confirmLabels[pendingAction].confirmLabel}
              </button>
              <button
                onClick={() => setPendingAction(null)}
                disabled={isProcessing}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InProgressPlanModal;
