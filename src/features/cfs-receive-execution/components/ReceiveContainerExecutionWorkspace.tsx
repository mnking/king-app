import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  ClipboardList,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { usePlanExecution } from '../hooks';
import { useInProgressPlan } from '@/shared/features/plan/hooks/use-in-progress-plan-query';
import { planExecutionQueryKey } from '@/shared/features/plan/query-keys';
import type { ExecutionPlan } from '../hooks/use-plan-execution';
import type { PlanContainer, ReceivePlan } from '@/shared/features/plan/types';
import { calculateExecutionSummary } from '../helpers/plan-execution-helpers';
import { calculateExpectedEndTime } from '@/shared/features/plan/utils/expected-end-time';
import { formatSingleDateTime } from '@/shared/features/plan/utils/plan-display-helpers';
import { fromDateTimeLocalFormat } from '@/shared/utils';
import {
  receivePlanContainer,
  rejectPlanContainer,
  deferPlanContainer,
  updatePlanContainerDetails,
} from '@/services/apiCFSPlanning';
import { useAuth } from '@/features/auth/useAuth';
import { ExecutionHeader } from './ExecutionHeader';
import { ProgressCard } from './ProgressCard';
import {
  ReceiveModal,
  ContainerProblemModal,
  RejectModal,
  DeferModal,
} from './ReceiveExecutionModals';
import type { IssueFormSubmission } from './ReceiveExecutionModals';
import { WaitingContainerRow, ReceivedContainerRow } from './ReceiveExecutionRows';
import { mapPlaceholdersToStrings } from '../helpers/ReceiveExecutionHelpers';
import type { ActionType, ExecutionContainer } from '../helpers/ReceiveExecutionHelpers';

interface ActionState {
  type: ActionType | null;
  container: ExecutionContainer | null;
}

interface ReceiveActionPayload {
  truckNo: string;
  notes: string | null;
  documents: string[];
  photos: string[];
}

export const ReceiveContainerExecutionWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canWriteExecution = can?.('actual_container_receive:write') ?? false;

  const { data: activePlan, isLoading: isLoadingActive } = useInProgressPlan();
  const planId = activePlan?.id;

  const {
    data: executionPlan,
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePlanExecution(planId, { enabled: Boolean(planId) });

  useEffect(() => {
    if (!planId) return;
    queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
  }, [planId, queryClient]);

  const handleRefresh = useCallback(async () => {
    if (!planId) return;
    await queryClient.invalidateQueries({
      queryKey: planExecutionQueryKey(planId),
      refetchType: 'all',
    });
    await refetch({ cancelRefetch: false, throwOnError: false });
  }, [planId, queryClient, refetch]);

  const [action, setAction] = useState<ActionState>({
    type: null,
    container: null,
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const summary = useMemo(
    () =>
      executionPlan
        ? calculateExecutionSummary(executionPlan.containers)
        : null,
    [executionPlan],
  );

  const sortedContainers = useMemo(() => {
    if (!executionPlan) return [] as ExecutionContainer[];

    const statusOrder: Record<string, number> = {
      RECEIVED: 0,
      REJECTED: 1,
      DEFERRED: 2,
      WAITING: 3,
    };

    const buckets: ExecutionContainer[][] = [[], [], [], []];

    const toComparableTime = (container: ExecutionContainer) => {
      const source =
        container.lastActionAt ??
        container.receivedAt ??
        container.rejectedAt ??
        container.deferredAt ??
        container.assignedAt;
      return source ? new Date(source).getTime() : 0;
    };

    executionPlan.containers.forEach((container) => {
      const bucketIndex = statusOrder[container.status] ?? statusOrder.WAITING;
      buckets[bucketIndex].push(container);
    });

    const ordered = buckets.flatMap((collection) =>
      collection.sort((a, b) => toComparableTime(b) - toComparableTime(a)),
    );

    console.log('[ReceivePlan] sorted containers snapshot', {
      received: buckets[0].length,
      rejected: buckets[1].length,
      deferred: buckets[2].length,
      waiting: buckets[3].length,
      total: ordered.length,
    });

    return ordered;
  }, [executionPlan]);

  const actionableContainers = useMemo(
    () =>
      sortedContainers.filter((container) => container.status !== 'RECEIVED'),
    [sortedContainers],
  );

  const progressedCount = summary ? summary.received + summary.rejected : 0;
  const progressPercent = summary && summary.total > 0
    ? Math.round((progressedCount / summary.total) * 100)
    : 0;

  const updatePlan = useCallback(
    (updater: (plan: ExecutionPlan) => ExecutionPlan) => {
      if (!planId) return;
      queryClient.setQueryData<ExecutionPlan>(
        planExecutionQueryKey(planId),
        (current) => {
          if (!current) return current as ExecutionPlan | undefined;
          const updated = updater(current);
          return {
            ...updated,
            updatedAt: new Date().toISOString(),
          };
        },
      );
    },
    [planId, queryClient],
  );

  const openAction = (type: ActionType, container: ExecutionContainer) => {
    if (!canWriteExecution && !type.startsWith('view')) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    setAction({ type, container });
  };

  const closeAction = () => {
    setAction({ type: null, container: null });
  };

  const handleReceive = async (
    receiveType: PlanContainer['receivedType'],
    payload: ReceiveActionPayload,
  ) => {
    if (!planId || !action.container) return;
    if (!canWriteExecution) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    const containerNo = action.container.orderContainer.containerNo;

    setIsActionLoading(true);
    try {
      const receivedAtIso = new Date().toISOString();
      let response: Awaited<ReturnType<typeof receivePlanContainer>> | null = null;
      if (receiveType === 'NORMAL') {
        response = await receivePlanContainer(planId, action.container.id, {
          truckNo: payload.truckNo,
          notes: payload.notes ?? null,
          documents: payload.documents,
          photos: payload.photos,
        });
      } else if (receiveType === 'PROBLEM') {
        const updatePayload = {
          receivedType: 'PROBLEM',
          summary: {
            problemTimestamp: receivedAtIso,
            documents: payload.documents,
            photos: payload.photos,
            notes: payload.notes ?? null,
          },
        } as const;

        console.log('[ReceivePlan] PATCH problem summary', {
          planId,
          containerId: action.container.id,
          body: updatePayload,
        });

        response = await updatePlanContainerDetails(
          planId,
          action.container.id,
          updatePayload,
        );
      } else if (receiveType === 'ADJUSTED_DOCUMENT') {
        const updatePayload = {
          receivedType: 'ADJUSTED_DOCUMENT',
          summary: {
            adjustedDocTimestamp: receivedAtIso,
            documents: payload.documents,
            photos: payload.photos,
            notes: payload.notes ?? null,
          },
        } as const;

        console.log('[ReceivePlan] PATCH adjusted summary', {
          planId,
          containerId: action.container.id,
          body: updatePayload,
        });

        response = await updatePlanContainerDetails(
          planId,
          action.container.id,
          updatePayload,
        );
      }

      updatePlan((plan) => ({
        ...plan,
        containers: plan.containers.map((container) => {
          if (container.id !== action.container?.id) {
            return container;
          }

          const nextSummary = { ...(container.summary ?? {}) };
          if (receiveType === 'PROBLEM') {
            nextSummary.problem = {
              problemTimestamp: receivedAtIso,
              documents: payload.documents,
              photos: payload.photos,
              notes: payload.notes ?? null,
            };
          }
          if (receiveType === 'ADJUSTED_DOCUMENT') {
            nextSummary.adjustedDocument = {
              adjustedDocTimestamp: receivedAtIso,
              documents: payload.documents,
              photos: payload.photos,
              notes: payload.notes ?? null,
            };
          }

          return {
            ...container,
            status: 'RECEIVED',
            truckNo: payload.truckNo,
            receivedAt: receivedAtIso,
            receivedType: receiveType,
            notes:
              receiveType === 'NORMAL'
                ? payload.notes
                : container.notes ?? null,
            completed: true,
            summary:
              receiveType === 'NORMAL'
                ? container.summary ?? null
                : nextSummary,
            rejectDetails: null,
            deferredAt: null,
            lastActionUser: 'Current Operator',
            lastActionAt: receivedAtIso,
          };
        }),
      }));

      await queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      if (response?.statusCode === 200) {
        toast.success(`Container ${containerNo} is received.`);
      }

      closeAction();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to update container status. Please retry.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleProblemSave = async (payload: IssueFormSubmission) => {
    if (!planId || !action.container) return;
    const containerNo = action.container.orderContainer.containerNo;
    setIsActionLoading(true);
  try {
    const problemTimestamp = fromDateTimeLocalFormat(payload.timestamp);
    const documents = mapPlaceholdersToStrings(payload.attachments);
    const photos = mapPlaceholdersToStrings(payload.photos ?? []);

    const updatePayload = {
      receivedType: 'PROBLEM',
      summary: {
        problemTimestamp,
        documents,
        photos,
        notes: payload.notes ?? null
      },
    } as const;

    const response = await updatePlanContainerDetails(
      planId,
      action.container.id,
      updatePayload,
    );

    updatePlan((plan) => ({
      ...plan,
      containers: plan.containers.map((container) => {
        if (container.id !== action.container?.id) {
          return container;
        }

        return {
          ...container,
          receivedType: 'PROBLEM',
          summary: {
            ...(container.summary ?? {}),
            problem: {
              problemTimestamp,
              documents,
              photos,
              notes: payload.notes ?? null,
            }
          },
        };
      }),
    }));

    await queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
    if (response.statusCode === 200) {
      toast.success(`Problem saved for container ${containerNo}.`);
    }
    closeAction();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to save problem details. Please retry.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdjustedSave = async (payload: IssueFormSubmission) => {
    if (!planId || !action.container) return;
    const containerNo = action.container.orderContainer.containerNo;
    setIsActionLoading(true);
  try {
    const adjustedTimestamp = fromDateTimeLocalFormat(payload.timestamp);
    const documents = mapPlaceholdersToStrings(payload.attachments);
    const photos = mapPlaceholdersToStrings(payload.photos ?? []);

    const updatePayload = {
      receivedType: 'ADJUSTED_DOCUMENT',
      summary: {
        adjustedDocTimestamp: adjustedTimestamp,
        documents,
        photos,
        notes: payload.notes ?? null,
      },
    } as const;

    const response = await updatePlanContainerDetails(
      planId,
      action.container.id,
      updatePayload,
    );

    updatePlan((plan) => ({
      ...plan,
      containers: plan.containers.map((container) => {
        if (container.id !== action.container?.id) {
          return container;
        }

        return {
          ...container,
          receivedType: 'ADJUSTED_DOCUMENT',
          summary: {
            ...(container.summary ?? {}),
            adjustedDocument: {
              adjustedDocTimestamp: adjustedTimestamp,
              documents,
              photos,
              notes: payload.notes ?? null,
            }
          },
        };
      }),
    }));

    await queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
    if (response.statusCode === 200) {
      toast.success(`Adjusted saved for container ${containerNo}.`);
    }
    closeAction();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to save adjusted document details. Please retry.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (payload: { timestamp: string; notes: string | null }) => {
    if (!planId || !action.container) return;
    if (!canWriteExecution) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    const containerNo = action.container.orderContainer.containerNo;
    setIsActionLoading(true);
    try {
      const rejectedAtIso = fromDateTimeLocalFormat(payload.timestamp);

      const response = await rejectPlanContainer(planId, action.container.id, {
        notes: payload.notes ?? null,
      });
      updatePlan((plan) => ({
        ...plan,
        containers: plan.containers.map((container) =>
          container.id === action.container?.id
            ? {
              ...container,
              status: 'REJECTED',
              rejectedAt: rejectedAtIso,
              completed: true,
              notes: payload.notes,
              rejectDetails: {
                notes: payload.notes,
                rejectedAt: rejectedAtIso,
              },
              deferredAt: null,
              lastActionUser: 'Current Operator',
              lastActionAt: rejectedAtIso,
            }
            : container,
        ),
      }));
      await queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      if (response.statusCode === 200) {
        toast.success(`Container ${containerNo} is rejected.`);
      }
      closeAction();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to reject container. Please retry.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDefer = async (payload: { timestamp: string | null; notes: string }) => {
    if (!planId || !action.container) return;
    if (!canWriteExecution) {
      toast.error('You do not have permission to modify container execution.');
      return;
    }
    const containerNo = action.container.orderContainer.containerNo;
    setIsActionLoading(true);
    try {
      const response = await deferPlanContainer(planId, action.container.id, {
        notes: payload.notes,
      });
      const deferredAtIso = payload.timestamp
        ? fromDateTimeLocalFormat(payload.timestamp)
        : new Date().toISOString();
      updatePlan((plan) => ({
        ...plan,
        containers: plan.containers.map((container) =>
          container.id === action.container?.id
            ? {
              ...container,
              status: 'DEFERRED',
              deferredAt: deferredAtIso,
              notes: payload.notes,
              completed: false,
              rejectDetails: null,
              lastActionUser: 'Current Operator',
              lastActionAt: deferredAtIso,
            }
            : container,
        ),
      }));
      await queryClient.invalidateQueries({ queryKey: planExecutionQueryKey(planId) });
      if (response.statusCode === 200) {
        toast.success(`Container ${containerNo} is deferred.`);
      }
      closeAction();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to defer container. Please retry.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoadingActive || (planId && isLoading && !executionPlan)) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Loading receive container workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!planId || !executionPlan) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="max-w-lg rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            No IN_PROGRESS plan available
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Start a plan from the Receive Plan workspace to access the execution screen.
          </p>
          <button
            type="button"
            onClick={() => navigate('/receive-plan-workspace')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Receive Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <ExecutionHeader
        planCode={executionPlan.code}
        isFetching={isFetching}
        onRefresh={handleRefresh}
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 dark:bg-gray-950 md:px-8 md:py-8">
        <div className="space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                  Plan Schedule
                </div>
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-200">
                    Planned Window
                  </p>
                  <p className="mt-1 text-sm font-medium text-blue-900 dark:text-blue-100">
                    {formatSingleDateTime(executionPlan.plannedStart)} →{' '}
                    {formatSingleDateTime(executionPlan.plannedEnd)}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-blue-900 dark:text-blue-100 md:grid-cols-2">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-200">
                        Actual Start
                      </span>
                      <p className="mt-1 font-semibold">
                        {executionPlan.executionStart
                          ? formatSingleDateTime(executionPlan.executionStart)
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-200">
                        Expected End
                      </span>
                      <p className="mt-1 font-semibold">
                        {calculateExpectedEndTime(executionPlan as ReceivePlan)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <ProgressCard
                summary={summary}
                progressedCount={progressedCount}
                progressPercent={progressPercent}
              />
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Containers ({sortedContainers.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800 dark:text-gray-200">
                  Waiting: <span className="text-gray-900 dark:text-gray-100">{summary?.waiting ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  Deferred: <span className="text-amber-900 dark:text-amber-100">{summary?.deferred ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-green-700 dark:bg-green-900/40 dark:text-green-200">
                  Received: <span className="text-green-900 dark:text-green-100">{summary?.received ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-600 dark:bg-red-900/40 dark:text-red-200">
                  Rejected: <span className="text-red-700 dark:text-red-100">{summary?.rejected ?? 0}</span>
                </span>
              </div>
              <div className="flex-1" />
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                  Problem: <span className="text-amber-900 dark:text-amber-100">{summary?.problem ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  Adjusted: <span className="text-blue-900 dark:text-blue-100">{summary?.adjusted ?? 0}</span>
                </span>
              </div>
            </div>
            {sortedContainers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                No containers are assigned to this plan yet.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedContainers.map((container) =>
                  container.status === 'RECEIVED' ? (
                    <ReceivedContainerRow
                      key={container.id}
                      container={container}
                      onViewReceive={(c) => openAction('view-receive', c)}
                      onViewProblem={(c) => openAction('view-problem', c)}
                      onViewAdjusted={(c) => openAction('view-adjusted', c)}
                    />
                  ) : (
                    <WaitingContainerRow
                      key={container.id}
                      container={container}
                      onAction={openAction}
                    />
                  ),
                )}
              </div>
            )}
            {summary && actionableContainers.length === 0 && summary.total > 0 ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-100">
                All containers are currently processed or awaiting follow-up. Use the plan
                modal to finalize execution when ready.
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <ReceiveModal
        isOpen={action.type === 'receive' || action.type === 'view-receive'}
        onClose={closeAction}
        container={action.container}
        isSubmitting={isActionLoading}
        onSubmit={(payload) =>
          handleReceive('NORMAL', {
            ...payload,
          })
        }
        viewMode={action.type === 'view-receive'}
      />

      <ContainerProblemModal
        variant="problem"
        isOpen={action.type === 'problem' || action.type === 'view-problem'}
        onClose={closeAction}
        container={action.container}
        isSubmitting={isActionLoading}
        onSubmit={handleProblemSave}
        viewMode={action.type === 'view-problem'}
      />

      <ContainerProblemModal
        variant="adjusted"
        isOpen={action.type === 'adjusted' || action.type === 'view-adjusted'}
        onClose={closeAction}
        container={action.container}
        isSubmitting={isActionLoading}
        onSubmit={handleAdjustedSave}
        viewMode={action.type === 'view-adjusted'}
      />

      <DeferModal
        isOpen={action.type === 'defer'}
        onClose={closeAction}
        container={action.container}
        isSubmitting={isActionLoading}
        onSubmit={async ({ timestamp, notes }) => {
          await handleDefer({ timestamp, notes });
        }}
      />

      <RejectModal
        isOpen={action.type === 'reject'}
        onClose={closeAction}
        container={action.container}
        isSubmitting={isActionLoading}
        onSubmit={handleReject}
      />

      {error ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[90%] max-w-lg -translate-x-1/2 rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 shadow-lg dark:border dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
          Failed to refresh plan data. Some information may be stale.
        </div>
      ) : null}
    </div>
  );
};

export default ReceiveContainerExecutionWorkspace;
