import { RotateCcw, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { changePlanStatus } from '@/services/apiCFSPlanning';
import { InProgressContainerCard } from './InProgressContainerCard';
import { calculateExpectedEndTime } from '@/shared/features/plan/utils/expected-end-time';
import { inProgressPlanQueryKey, planExecutionQueryKey } from '@/shared/features/plan/query-keys';
import toast from 'react-hot-toast';

import { usePlanExecution } from '../hooks/use-plan-execution';
import {
  calculateExecutionSummary,
  shouldEnableDone,
  shouldEnablePending,
} from '../helpers';

interface ActivePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string | undefined;
  canWrite?: boolean;
}

/**
 * ActivePlanModal - Popup modal showing IN_PROGRESS plan details
 *
 * - Standalone component (reusable for future dedicated page)
 * - Displays: Plan info, expected end time, progress, container list
 * - Read-only view (no actions)
 *
 * Reference: /home/hungvd/Pictures/Screenshots/Screenshot From 2025-10-20 22-59-33.png
 */
export function ActivePlanModal({ isOpen, onClose, planId, canWrite = true }: ActivePlanModalProps) {
  const queryClient = useQueryClient();
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch plan details with enriched container data
  const {
    data: plan,
    isLoading,
    error,
    refetch,
    isFetching,
  } = usePlanExecution(planId, { enabled: isOpen && Boolean(planId) });

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

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus modal when opened
      document.getElementById('active-plan-modal-header')?.focus();
    }
  }, [isOpen]);

  // Auto-reload interval (10 minutes)
  useEffect(() => {
    if (!isOpen || !planId) return;

    // Set interval to refetch plan data every 10 minutes (600,000 ms)
    const intervalId = setInterval(() => {
      if (!planId) return;
      queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
    }, 600000);

    // Cleanup: clear interval on unmount or when modal closes
    return () => clearInterval(intervalId);
  }, [isOpen, planId, queryClient]);

  // Cancel plan mutation (change status from IN_PROGRESS to SCHEDULED)
  const cancelPlanMutation = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error('Plan ID is required');
      return changePlanStatus(planId, { status: 'SCHEDULED' });
    },
    onSuccess: () => {
      toast.success('Plan execution cancelled successfully');
      // Invalidate all plan queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['receive-plans', 'list'] });
      queryClient.invalidateQueries({ queryKey: inProgressPlanQueryKey });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      }
      setShowCancelConfirmation(false);
      onClose();
    },
    onError: () => {
      toast.error('Failed to cancel plan execution. Please try again.');
    },
  });

  const markPendingMutation = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error('Plan ID is required');
      return changePlanStatus(planId, { status: 'PENDING' });
    },
    onSuccess: () => {
      toast.success('Plan flagged as pending for follow-up.');
      queryClient.invalidateQueries({ queryKey: ['receive-plans', 'list'] });
        queryClient.invalidateQueries({ queryKey: inProgressPlanQueryKey });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      }
      onClose();
    },
    onError: () => {
      toast.error('Failed to mark plan as pending. Please try again.');
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error('Plan ID is required');
      return changePlanStatus(planId, { status: 'DONE' });
    },
    onSuccess: () => {
      toast.success('Plan marked as completed');
      queryClient.invalidateQueries({ queryKey: ['receive-plans', 'list'] });
        queryClient.invalidateQueries({ queryKey: inProgressPlanQueryKey });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      }
      onClose();
    },
    onError: () => {
      toast.error('Failed to mark plan as done. Please try again.');
    },
  });

  const summary = useMemo(
    () => (plan ? calculateExecutionSummary(plan.containers) : null),
    [plan],
  );
  const canMarkPending = summary ? shouldEnablePending(summary) : false;
  const canMarkDone = summary ? shouldEnableDone(summary) : false;
  const ensureWriteAccess = () => {
    if (canWrite) return true;
    toast.error('You do not have permission to modify receive plans.');
    return false;
  };

  const handleRefresh = async () => {
    if (!planId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) }),
        queryClient.invalidateQueries({ queryKey: inProgressPlanQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['receive-plans', 'list'] }),
      ]);
      await refetch({ throwOnError: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate if all containers are WAITING (for Cancel Doing button)
  const allContainersWaiting = plan?.containers.every(c => c.status === 'WAITING') ?? false;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          id="active-plan-modal-header"
          tabIndex={-1}
          className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Current Execution Details: {plan?.code || '...'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-200 transition hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh plan data"
            disabled={isRefreshing || isFetching}
          >
            {isRefreshing || isFetching ? (
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
              <p className="text-red-700 dark:text-red-300">Failed to load plan details. Please try again.</p>
            </div>
          )}

          {/* Plan Details */}
          {plan && (
            <div className="space-y-6">
              {/* Plan Information Section */}
              <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {/* Planned Start Time */}
                  <div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-100">Start Time: </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(plan.plannedStart).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>

                  {/* Planned End Time */}
                  <div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-100">End Time: </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(plan.plannedEnd).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>

                  {/* Actual Start Time */}
                  <div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-100">Actual Start: </span>
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
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-100">Actual End: </span>
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
                      {calculateExpectedEndTime(plan)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div>
                {(() => {
                  const totalContainers = plan.containers.length;
                  const receivedCount = plan.containers.filter(c => c.status === 'RECEIVED').length;
                  const rejectedCount = plan.containers.filter(c => c.status === 'REJECTED').length;

                  return (
                    <div className="flex items-center gap-8 text-gray-900 dark:text-gray-100">
                      {/* Total Containers */}
                      <div className="text-lg font-semibold text-gray-900">
                        Total: {totalContainers} containers
                      </div>

                      {/* Progress Counter */}
                      <div className="text-lg font-semibold text-gray-900">
                        Progress: <span className="text-green-600 dark:text-green-300">{receivedCount} / {totalContainers}</span> Containers
                      </div>

                      {/* Rejected Counter */}
                      <div className="text-lg font-semibold text-gray-900">
                        Rejected: <span className="text-red-600 dark:text-red-300">{rejectedCount} / {totalContainers}</span> Containers
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Container List Section */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Container List ({plan.containers.length})
                </h3>
                <div className="space-y-4">
                  {plan.containers.map((planContainer) => (
                    <InProgressContainerCard
                      key={planContainer.id}
                      container={planContainer.orderContainer}
                      processingStatus={planContainer.status}
                      className="border-gray-300"
                      planContext={{ plannedStart: plan.plannedStart }}
                    />
                  ))}
                  {plan.containers.length === 0 && (
                    <p className="py-8 text-center text-gray-500 dark:text-gray-400">No containers in this plan.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Cancel Doing and Close buttons */}
        {plan && (
          <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!ensureWriteAccess()) return;
                  setShowCancelConfirmation(true);
                }}
                disabled={!canWrite || !allContainersWaiting || cancelPlanMutation.isPending}
                title={
                  allContainersWaiting
                    ? 'Cancel plan execution (only if no containers processed)'
                    : 'Cannot cancel: containers have been processed'
                }
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
              >
                {cancelPlanMutation.isPending ? 'Cancelling...' : 'Cancel Doing'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!ensureWriteAccess()) return;
                  markPendingMutation.mutate();
                }}
                disabled={
                  !canWrite ||
                  !canMarkPending ||
                  markPendingMutation.isPending ||
                  markDoneMutation.isPending ||
                  cancelPlanMutation.isPending
                }
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-200 transition hover:bg-amber-100 dark:hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markPendingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mark Pending
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!ensureWriteAccess()) return;
                  markDoneMutation.mutate();
                }}
                disabled={
                  !canWrite ||
                  !canMarkDone ||
                  markDoneMutation.isPending ||
                  markPendingMutation.isPending ||
                  cancelPlanMutation.isPending
                }
                className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {markDoneMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
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

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => setShowCancelConfirmation(false)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Confirm Cancellation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel this plan execution? The plan will return to SCHEDULED status.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!ensureWriteAccess()) return;
                  cancelPlanMutation.mutate();
                }}
                disabled={!canWrite || cancelPlanMutation.isPending}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelPlanMutation.isPending ? 'Confirming...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowCancelConfirmation(false)}
                disabled={cancelPlanMutation.isPending}
                className="flex-1 rounded-md bg-gray-200 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
