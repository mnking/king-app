import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calendar,
  Check,
  ClipboardList,
  Package,
  Package2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { fromDateTimeLocalFormat } from '@/shared/utils';
import { assignContainer, getPlanById, unassignContainer } from '@/services/apiCFSPlanning';
import { formatDateTimeRange } from '@/shared/utils/date-format';
import { UnplannedContainersList } from './UnplannedContainersList';
import { DestuffingPlanDetails } from './DestuffingPlanDetails';
import { ForwarderFilterDropdown } from './ForwarderFilterDropdown';
import { DestuffingPlanFormModal } from './DestuffingPlanFormModal';
import {
  useCreateDestuffingPlan,
  useDestuffingPlans,
  useUnplannedDestuffingContainers,
  useDeleteDestuffingPlan,
  useDestuffingPlanStatusMutation,
  useInProgressDestuffingPlans,
  unplannedDestuffingQueryKeys,
} from '../hooks';
import { shareSameForwarder } from '../utils/forwarder-utils';
import {
  mapPlanContainersToUnplanned,
  extractPlanHblSelections,
  getPlanForwarderLabel,
  normalizeDestuffingPlan,
} from '../utils/plan-transformers';
import { clearBookingOrderCache, getCachedBookingOrderById } from '../utils/booking-order-cache';
import {
  buildCargoReleaseNotAllowedMessage,
  buildDestuffingNotAllowedMessage,
  getCargoReleaseBlockedContainerLabels,
  getBlockedDestuffingContainerLabels,
} from '../utils/destuffing-start-guard';
import { MiniMapWidget } from './MiniMapWidget';
import { InProgressPlanModal } from './InProgressPlanModal';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import type { Forwarder } from '@/features/forwarder/types';
import type {
  DestuffingHblSelections,
  DestuffingPlan,
  DestuffingPlanModalChangesPayload,
  UnplannedDestuffingContainer,
} from '../types';
import type { DestuffingPlanFormData } from '../schemas';
import { DestuffingDonePlansPanel } from './DestuffingDonePlansPanel';
import { PendingDestuffingPlansMonitoring } from './PendingDestuffingPlansMonitoring';
import {
  createDefaultDonePlansTabState,
  type DonePlansTabState,
} from './DestuffingDonePlansState';
import { useAuth } from '@/features/auth/useAuth';

const BooleanChip: React.FC<{ value?: boolean; label: string; trueText?: string; falseText?: string }> = ({
  value,
  label,
  trueText = 'Yes',
  falseText = 'No',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${value
        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      }`}
  >
    {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    {label} {value ? trueText : falseText}
  </span>
);

const resolveContainerForwarderId = (
  container: UnplannedDestuffingContainer,
): string | null =>
  container.forwarderId ??
  container.bookingOrder?.agentId ??
  null;

type PlanForwarderMetadata = {
  agentId: string | null;
  agentCode: string | null;
};

export const DestuffingPlanWorkspace: React.FC = () => {
  const { can } = useAuth();
  const canWriteDestuff = can?.('destuff_plan:write') ?? false;
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'unplanned' | 'plan'>('unplanned');
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'unplanned'>('unplanned');
  const [forwarderFilter, setForwarderFilter] = useState<string | null>(null);
  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [pendingContainers, setPendingContainers] = useState<
    UnplannedDestuffingContainer[]
  >([]);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPlan, setEditingPlan] = useState<DestuffingPlan | null>(null);
  const [initialHblSelections, setInitialHblSelections] =
    useState<DestuffingHblSelections>({});
  const [initialForwarderId, setInitialForwarderId] = useState<string | null>(null);
  const [initialForwarderLabel, setInitialForwarderLabel] = useState<string | null>(null);
  const [planForwarders, setPlanForwarders] = useState<Record<string, PlanForwarderMetadata>>({});
  const planForwarderRequests = useRef<Record<string, Promise<PlanForwarderMetadata>>>(
    {},
  );
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [statusChangingPlanId, setStatusChangingPlanId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalMutating, setIsModalMutating] = useState(false);
  const [activeInProgressPlanId, setActiveInProgressPlanId] = useState<string | null>(null);
  const [planModalRefreshKey, setPlanModalRefreshKey] = useState(0);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'plans' | 'pending' | 'done'>('plans');
  const [donePlansTabState, setDonePlansTabState] = useState<DonePlansTabState>(
    createDefaultDonePlansTabState,
  );
  const workspaceWrapperRef = useRef<HTMLDivElement>(null);

  const {
    data: unplannedContainers,
    isLoading: isLoadingUnplanned,
    isError: isUnplannedError,
    error: unplannedError,
    refetch: refetchUnplannedContainers,
  } = useUnplannedDestuffingContainers(forwarderFilter ?? undefined);

  const {
    data: scheduledPlansResponse,
    isLoading: isLoadingPlans,
    isError: isPlanError,
    error: planError,
    refetch: refetchScheduledPlans,
  } = useDestuffingPlans({ status: 'SCHEDULED' });

  const {
    data: inProgressPlansData,
    isLoading: isLoadingInProgress,
    refetch: refetchInProgressPlans,
  } = useInProgressDestuffingPlans();
  const inProgressPlans = useMemo(() => inProgressPlansData ?? [], [inProgressPlansData]);
  const activeInProgressPlans = useMemo(
    () => inProgressPlans.filter((plan) => plan.status === 'IN_PROGRESS'),
    [inProgressPlans],
  );

  const {
    data: forwardersData,
    isLoading: isLoadingForwarders,
    isError: isForwardersError,
    error: forwardersError,
  } = useForwarders({ status: 'Active', itemsPerPage: 100 });

  const forwarders: Forwarder[] = useMemo(
    () => forwardersData?.results ?? [],
    [forwardersData],
  );

  const resolveForwarderDisplay = useCallback(
    (
      metadata?: PlanForwarderMetadata,
      plan?: DestuffingPlan | null,
    ): string | null => {
      if (metadata) {
        const matchById = metadata.agentId
          ? forwarders.find((forwarder) => forwarder.id === metadata.agentId)
          : undefined;
        const matchByCode =
          !matchById && metadata.agentCode
            ? forwarders.find((forwarder) => forwarder.code === metadata.agentCode)
            : undefined;
        const match = matchById ?? matchByCode;
        if (match) {
          return `${match.name} (${match.code})`;
        }
        if (metadata.agentCode) {
          return metadata.agentCode;
        }
      }
      return plan ? getPlanForwarderLabel(plan) : null;
    },
    [forwarders],
  );

  const getPlanForwarderDisplay = (plan: DestuffingPlan): string | null =>
    resolveForwarderDisplay(planForwarders[plan.id], plan);

  const resolvePlanForwarder = useCallback(
    async (plan: DestuffingPlan): Promise<PlanForwarderMetadata> => {
      const cached = planForwarders[plan.id];
      if (cached) {
        return cached;
      }

      if (planForwarderRequests.current[plan.id]) {
        return planForwarderRequests.current[plan.id];
      }

      const baseMetadata: PlanForwarderMetadata = {
        agentId: plan.forwarderId ?? plan.forwarder?.id ?? null,
        agentCode: plan.forwarder?.code ?? null,
      };

      const fetchPromise: Promise<PlanForwarderMetadata> = (async () => {
        if (baseMetadata.agentId || baseMetadata.agentCode) {
          return baseMetadata;
        }

        const firstContainer = plan.containers?.[0];
        const containerBookingOrder = firstContainer?.orderContainer?.bookingOrder;
        if (containerBookingOrder?.agentId || containerBookingOrder?.agentCode) {
          return {
            agentId: containerBookingOrder.agentId ?? baseMetadata.agentId ?? null,
            agentCode: containerBookingOrder.agentCode ?? baseMetadata.agentCode ?? null,
          };
        }

        const orderId = firstContainer?.orderContainer?.orderId;
        if (!orderId) {
          return baseMetadata;
        }

        const bookingOrder = await getCachedBookingOrderById(orderId);
        return {
          agentId: bookingOrder?.agentId ?? baseMetadata.agentId ?? null,
          agentCode: bookingOrder?.agentCode ?? baseMetadata.agentCode ?? null,
        };
      })();

      planForwarderRequests.current[plan.id] = fetchPromise;

      const metadata = await fetchPromise;

      setPlanForwarders((prev) => {
        if (prev[plan.id]) {
          return prev;
        }
        return { ...prev, [plan.id]: metadata };
      });

      delete planForwarderRequests.current[plan.id];

      return metadata;
    },
    [planForwarders],
  );

  const refreshWorkspaceData = useCallback(async () => {
    clearBookingOrderCache();
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: unplannedDestuffingQueryKeys.all,
        refetchType: 'active',
      }),
      refetchScheduledPlans({ throwOnError: false }),
      refetchInProgressPlans({ throwOnError: false }),
    ]);
  }, [queryClient, refetchInProgressPlans, refetchScheduledPlans]);

  const refreshEditingPlanState = useCallback(
    async (
      planId: string,
      fallback?: {
        selections?: DestuffingHblSelections;
        containers?: UnplannedDestuffingContainer[];
      },
    ) => {
      const latestPlanResponse = await getPlanById(planId);
      const latestPlan = normalizeDestuffingPlan(latestPlanResponse.data as DestuffingPlan);
      setEditingPlan(latestPlan);
      const mappedContainers = mapPlanContainersToUnplanned(latestPlan);
      const extractedSelections = extractPlanHblSelections(latestPlan);
      const hasSelections = Object.values(extractedSelections).some(
        (selection) => selection.length > 0,
      );

      setPendingContainers(
        mappedContainers.length
          ? mappedContainers
          : fallback?.containers ?? mappedContainers,
      );
      setInitialHblSelections(
        hasSelections ? extractedSelections : fallback?.selections ?? extractedSelections,
      );
      const metadata = await resolvePlanForwarder(latestPlan);
      setInitialForwarderId(
        metadata.agentId ?? latestPlan.forwarderId ?? latestPlan.forwarder?.id ?? null,
      );
      setInitialForwarderLabel(resolveForwarderDisplay(metadata, latestPlan));
      setPlanModalRefreshKey((prev) => prev + 1);
    },
    [resolvePlanForwarder, resolveForwarderDisplay],
  );

  const {
    mutateAsync: createDestuffingPlan,
    isPending: isCreatingPlan,
  } = useCreateDestuffingPlan();
  const deleteDestuffingPlan = useDeleteDestuffingPlan();
  const changePlanStatus = useDestuffingPlanStatusMutation();

  const runModalMutation = useCallback(
    async (mutation: () => Promise<void>) => {
      setIsModalMutating(true);
      try {
        await mutation();
      } finally {
        setIsModalMutating(false);
      }
    },
    [],
  );

  const scheduledPlans = useMemo(() => {
    if (!scheduledPlansResponse?.results) return [];
    return [...scheduledPlansResponse.results].sort(
      (a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime(),
    );
  }, [scheduledPlansResponse]);

  const isInProgressModalOpen = Boolean(activeInProgressPlanId);

  useEffect(() => {
    if (!activeInProgressPlanId) return;
    if (!activeInProgressPlans.some((plan) => plan.id === activeInProgressPlanId)) {
      setActiveInProgressPlanId(null);
    }
  }, [activeInProgressPlanId, activeInProgressPlans]);

  useEffect(() => {
    if (!scheduledPlans.length) return;
    scheduledPlans.forEach((plan) => {
      if (!planForwarders[plan.id]) {
        void resolvePlanForwarder(plan);
      }
    });
  }, [scheduledPlans, planForwarders, resolvePlanForwarder]);

  useEffect(() => {
    if (!activeInProgressPlans.length) return;
    activeInProgressPlans.forEach((plan) => {
      if (!planForwarders[plan.id]) {
        void resolvePlanForwarder(plan);
      }
    });
  }, [activeInProgressPlans, planForwarders, resolvePlanForwarder]);

  const handleMiniMapPlanClick = useCallback((planId: string) => {
    setActiveInProgressPlanId(planId);
  }, []);

  const handleInProgressStatusChange = useCallback(
    async (plan: DestuffingPlan, nextStatus: 'SCHEDULED' | 'DONE' | 'PENDING') => {
      try {
        await changePlanStatus.mutateAsync({
          id: plan.id,
          data: { status: nextStatus },
        });
        setActiveInProgressPlanId(null);
        await refreshWorkspaceData();
      } catch {
        // Toast handled in hook
      }
    },
    [changePlanStatus, refreshWorkspaceData],
  );

  const handleSavePlanChanges = useCallback(
    async (changes: DestuffingPlanModalChangesPayload, nextSelections: DestuffingHblSelections) => {
      if (!editingPlan) return;
      const hasChanges =
        changes.additions.length || changes.updates.length || changes.removals.length;
      if (!hasChanges) {
        return;
      }

      type MutationResult = {
        label: string;
        type: 'add' | 'update' | 'remove';
        status: 'fulfilled' | 'rejected';
        error?: string;
      };

      console.log('[DestuffingPlanWorkspace] Saving container changes', {
        planId: editingPlan.id,
        additions: changes.additions.length,
        updates: changes.updates.length,
        removals: changes.removals.length,
      });

      await runModalMutation(async () => {
        const results: MutationResult[] = [];

        if (changes.additions.length) {
          const payload = changes.additions.map((entry) => ({
            orderContainerId: entry.orderContainerId,
            hblIds: entry.hblIds.length ? entry.hblIds : undefined,
          }));
          try {
            await assignContainer(editingPlan.id, payload);
            changes.additions.forEach((entry) =>
              results.push({ label: entry.label, type: 'add', status: 'fulfilled' }),
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to add container.';
            changes.additions.forEach((entry) =>
              results.push({
                label: entry.label,
                type: 'add',
                status: 'rejected',
                error: message,
              }),
            );
          }
        }

        // Updates: remove existing assignment then re-add with new HBLs
        for (const entry of changes.updates) {
          const planContainerId = entry.planContainerId ?? entry.orderContainerId;
          try {
            await unassignContainer(editingPlan.id, planContainerId);
            results.push({
              label: entry.label,
              type: 'update',
              status: 'fulfilled',
            });
          } catch (error) {
            results.push({
              label: entry.label,
              type: 'update',
              status: 'rejected',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to remove container before reassigning.',
            });
            // Skip reassign if removal failed
            continue;
          }

          try {
            await assignContainer(editingPlan.id, [
              {
                orderContainerId: entry.orderContainerId,
                hblIds: entry.hblIds.length ? entry.hblIds : undefined,
              },
            ]);
            results.push({
              label: entry.label,
              type: 'add',
              status: 'fulfilled',
            });
          } catch (error) {
            results.push({
              label: entry.label,
              type: 'add',
              status: 'rejected',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to reassign container.',
            });
          }
        }

        const removalResults = await Promise.all(
          changes.removals.map((entry) =>
            unassignContainer(editingPlan.id, entry.planContainerId)
              .then(() => ({
                label: entry.label,
                type: 'remove' as const,
                status: 'fulfilled' as const,
              }))
              .catch((error) => ({
                label: entry.label,
                type: 'remove' as const,
                status: 'rejected' as const,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Failed to remove container.',
              })),
          ),
        );
        results.push(...removalResults);

        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failures = results.filter((result) => result.status === 'rejected');

        if (successCount) {
          toast.success(`Saved ${successCount} change${successCount > 1 ? 's' : ''}.`);
        }
        if (failures.length) {
          const message = failures
            .map((failure) => `• ${failure.label}: ${failure.error ?? 'Unknown error'}`)
            .join('\n');
          toast.error(`Failed to apply ${failures.length} change(s):\n${message}`);
        }

        await refreshWorkspaceData();
        await refreshEditingPlanState(editingPlan.id, {
          selections: nextSelections,
        });

        const forwarderKey =
          initialForwarderId ??
          editingPlan.forwarderId ??
          editingPlan.forwarder?.id ??
          null;
        if (forwarderKey) {
          queryClient.invalidateQueries({
            queryKey: unplannedDestuffingQueryKeys.list({ forwarderId: forwarderKey }),
          });
        }
      });
    },
    [
      editingPlan,
      initialForwarderId,
      queryClient,
      refreshEditingPlanState,
      refreshWorkspaceData,
      runModalMutation,
    ],
  );

  const handleOpenCreatePlanModal = (preselected: UnplannedDestuffingContainer[] = []) => {
    if (!canWriteDestuff) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    if (preselected.length && !shareSameForwarder(preselected)) {
      toast.error('Selected containers must belong to the same forwarder.');
      return;
    }

    const forwarderId = preselected.length
      ? resolveContainerForwarderId(preselected[0])
      : forwarderFilter ?? null;

    setPendingContainers(preselected);
    setInitialForwarderId(forwarderId);
    setInitialForwarderLabel(preselected[0]?.forwarderName ?? null);
    setModalMode('create');
    setEditingPlan(null);
    setInitialHblSelections({});
    setPlanModalOpen(true);
  };

  const handlePlanModalClose = () => {
    setPlanModalOpen(false);
    setPendingContainers([]);
    setEditingPlan(null);
    setInitialHblSelections({});
    setModalMode('create');
    setInitialForwarderId(null);
    setInitialForwarderLabel(null);
    setIsModalMutating(false);
  };

  const handleCloseInProgressModal = () => {
    setActiveInProgressPlanId(null);
  };

  const handleSavePlan = async (formData: DestuffingPlanFormData) => {
    if (!canWriteDestuff) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    if (modalMode === 'edit') {
      return;
    }

    try {
      await createDestuffingPlan({
        planData: {
          planType: 'DESTUFFING',
          plannedStart: fromDateTimeLocalFormat(formData.plannedStart),
          plannedEnd: fromDateTimeLocalFormat(formData.plannedEnd),
          equipmentBooked: formData.equipmentBooked,
          approvedAppointment: formData.approvedAppointment,
        },
        hblSelections: formData.containerIds
          .map((id) => ({
            orderContainerId: id,
            hblIds: (formData.hblSelections?.[id] ?? []).map((hbl) => hbl.hblId),
          }))
          .filter((selection) => selection.hblIds.length > 0),
      });

      await refreshWorkspaceData();
      setPlanModalOpen(false);
      setPendingContainers([]);
      setEditingPlan(null);
      setInitialHblSelections({});
      setModalMode('create');
      setInitialForwarderId(null);
      setInitialForwarderLabel(null);
    } catch {
      // Errors handled by mutation hooks
    }
  };

  const handleSelectUnplanned = () => {
    setActiveSection('unplanned');
    setSelectedPlanId('unplanned');
    void refetchUnplannedContainers();
  };

  const handleSelectPlan = (planId: string) => {
    setActiveSection('plan');
    setSelectedPlanId(planId);
  };

  const handlePlanCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    planId: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectPlan(planId);
    }
  };

  const handlePlanSelectionChange = (planId: string | 'unplanned') => {
    if (planId === 'unplanned') {
      handleSelectUnplanned();
      return;
    }
    setActiveSection('plan');
    setSelectedPlanId(planId);
  };

  const handleManageContainersClick = (plan: DestuffingPlan) => {
    if (!canWriteDestuff) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    void (async () => {
      try {
        await refreshEditingPlanState(plan.id, {
          selections: extractPlanHblSelections(plan),
          containers: mapPlanContainersToUnplanned(plan),
        });
        setModalMode('edit');
        setPlanModalOpen(true);
      } catch (error) {
        console.error('Failed to load plan details', error);
        toast.error('Unable to load plan details. Please try again.');
      }
    })();
  };

  const handleDeletePlanRequest = async (plan: DestuffingPlan) => {
    if (!canWriteDestuff) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    try {
      setDeletingPlanId(plan.id);
      await deleteDestuffingPlan.mutateAsync(plan.id);
      await refreshWorkspaceData();
      if (selectedPlanId === plan.id) {
        setSelectedPlanId('unplanned');
        setActiveSection('unplanned');
      }
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleStartExecution = async (plan: DestuffingPlan) => {
    if (!canWriteDestuff) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    if (!plan.equipmentBooked || !(plan.approvedAppointment ?? plan.appointmentConfirmed)) {
      toast.error('Equipment booking and appointment confirmation are required.');
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

    try {
      setStatusChangingPlanId(plan.id);
      await changePlanStatus.mutateAsync({
        id: plan.id,
        data: { status: 'IN_PROGRESS' },
      });
      setSelectedPlanId('unplanned');
      setActiveSection('unplanned');
    } finally {
      setStatusChangingPlanId(null);
    }
  };

  const handleCancelDoing = useCallback(
    (plan: DestuffingPlan) => handleInProgressStatusChange(plan, 'SCHEDULED'),
    [handleInProgressStatusChange],
  );

  const handleMarkPlanDone = useCallback(
    (plan: DestuffingPlan) => handleInProgressStatusChange(plan, 'DONE'),
    [handleInProgressStatusChange],
  );

  const handleMarkPlanPending = useCallback(
    (plan: DestuffingPlan) => handleInProgressStatusChange(plan, 'PENDING'),
    [handleInProgressStatusChange],
  );

  const handleRefreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshWorkspaceData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (
      selectedPlanId !== 'unplanned' &&
      !scheduledPlans.some((plan) => plan.id === selectedPlanId)
    ) {
      setSelectedPlanId('unplanned');
      setActiveSection('unplanned');
    }
  }, [scheduledPlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    if (selectedPlanId === 'unplanned') return null;
    return scheduledPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  }, [selectedPlanId, scheduledPlans]);

  const formatPlanWindow = (plan: DestuffingPlan) => {
    if (!plan.plannedStart || !plan.plannedEnd) return 'Schedule TBD';
    return formatDateTimeRange(plan.plannedStart, plan.plannedEnd);
  };

  const unplannedCount = unplannedContainers?.length ?? 0;

  const renderRightPane = () => {
    if (activeSection === 'unplanned') {
      return (
        <>
          {isUnplannedError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  Unable to load unplanned containers.{' '}
                  {unplannedError?.message ?? 'Please try again shortly.'}
                </div>
              </div>
            </div>
          )}

          <UnplannedContainersList
            containers={unplannedContainers ?? []}
            isLoading={isLoadingUnplanned}
            error={
              isUnplannedError
                ? unplannedError?.message ?? 'Failed to load unplanned containers.'
                : null
            }
            filterSlot={
              <ForwarderFilterDropdown
                value={forwarderFilter}
                onChange={setForwarderFilter}
                forwarders={forwarders}
                isLoading={isLoadingForwarders}
                errorMessage={
                  isForwardersError ? forwardersError?.message ?? 'Failed to load forwarders.' : undefined
                }
              />
            }
          />
        </>
      );
    }

    return (
      <DestuffingPlanDetails
        plan={selectedPlan}
        selectedPlanId={selectedPlanId}
        onPlanSelectionChange={handlePlanSelectionChange}
        onDeletePlan={handleDeletePlanRequest}
        onMarkDoing={handleStartExecution}
        onManageContainers={handleManageContainersClick}
        isDeletingPlan={selectedPlan ? deletingPlanId === selectedPlan.id : false}
        isStatusChanging={selectedPlan ? statusChangingPlanId === selectedPlan.id : false}
        forwarderLabel={selectedPlan ? getPlanForwarderDisplay(selectedPlan) : null}
        canWrite={canWriteDestuff}
      />
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-gray-100 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
        <div className="flex items-center justify-between gap-4">
          <nav className="flex gap-8 -mb-px" aria-label="Destuffing workspace tabs">
            <button
              type="button"
              aria-pressed={activeWorkspaceTab === 'plans'}
              onClick={() => setActiveWorkspaceTab('plans')}
              className={`
                relative py-4 px-1
                text-sm font-medium
                transition-colors duration-200
                focus:outline-none
                ${activeWorkspaceTab === 'plans'
                  ? 'text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              Destuff Plans
            </button>
            <button
              type="button"
              aria-pressed={activeWorkspaceTab === 'pending'}
              onClick={() => setActiveWorkspaceTab('pending')}
              className={`
                relative py-4 px-1
                text-sm font-medium
                transition-colors duration-200
                focus:outline-none
                ${activeWorkspaceTab === 'pending'
                  ? 'text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              Pending Plans
            </button>
            <button
              type="button"
              aria-pressed={activeWorkspaceTab === 'done'}
              onClick={() => setActiveWorkspaceTab('done')}
              className={`
                relative py-4 px-1
                text-sm font-medium
                transition-colors duration-200
                focus:outline-none
                ${activeWorkspaceTab === 'done'
                  ? 'text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              Done Plans
            </button>
          </nav>
        </div>
      </header>

      <main
        className={
          activeWorkspaceTab === 'plans' ? 'flex-1 min-h-0 text-gray-900 dark:text-gray-100' : 'hidden'
        }
      >
        <div className="flex h-full min-h-0 relative" ref={workspaceWrapperRef}>
          <aside className="w-full md:w-[420px] min-w-[360px] max-w-[520px] border-r border-gray-200 dark:border-gray-800 flex flex-col relative bg-white dark:bg-gray-900 min-h-0">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Destuffing Plan</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Coordinate container destuff operations</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <button
                type="button"
                onClick={handleSelectUnplanned}
                className={`flex w-full items-start gap-3 border-b border-gray-200 px-4 py-3 text-left ${activeSection === 'unplanned'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-500'
                    : 'border-l-4 border-l-transparent hover:bg-orange-50 dark:hover:bg-gray-800'
                  }`}
              >
                <ClipboardList className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unplanned Containers</p>
                    <span className="inline-flex items-center rounded-full bg-orange-200 dark:bg-orange-900/40 px-2 py-0.5 text-xs font-semibold text-orange-900 dark:text-orange-200">
                      {isLoadingUnplanned ? '…' : unplannedCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Containers awaiting destuffing plans.</p>
                </div>
              </button>
            </div>

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Scheduled Plans
                </p>

                <Button
                  onClick={() => handleOpenCreatePlanModal()}
                  variant="primary"
                  className="ml-4"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900 pb-32">
                {isPlanError ? (
                  <div className="mx-4 rounded-lg border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-3 text-xs text-red-700 dark:text-red-200">
                    Unable to load scheduled plans. {planError?.message ?? 'Please try again.'}
                  </div>
                ) : isLoadingPlans ? (
                  <div className="space-y-2 px-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`plan-skeleton-${index}`}
                        className="h-16 rounded bg-gray-100 dark:bg-gray-800"
                      />
                    ))}
                  </div>
                ) : scheduledPlans.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-700 dark:text-gray-300">
                    <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-300">No plans created yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Select containers in Create Plan to get started
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {scheduledPlans.map((plan) => {
                      const planForwarderLabel = getPlanForwarderDisplay(plan);
                      const isActive =
                        activeSection === 'plan' &&
                        selectedPlanId !== 'unplanned' &&
                        selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectPlan(plan.id)}
                          onKeyDown={(event) => handlePlanCardKeyDown(event, plan.id)}
                          className={`w-full border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-left transition ${isActive
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                              : 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <Package2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {plan.code}
                                </p>
                                <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-200">
                                  {plan.containers?.length ?? 0}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {formatPlanWindow(plan)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {planForwarderLabel ?? 'Forwarder TBD'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <BooleanChip
                                  label="Equipment"
                                  value={plan.equipmentBooked}
                                  trueText="Booked"
                                  falseText="Pending"
                                />
                                <BooleanChip
                                  label="Appointment"
                                  value={plan.approvedAppointment ?? plan.appointmentConfirmed}
                                  trueText="Confirmed"
                                  falseText="Pending"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <MiniMapWidget
              plans={activeInProgressPlans}
              isLoading={isLoadingInProgress}
              onSelectPlan={handleMiniMapPlanClick}
              className="absolute bottom-5 left-5 pointer-events-auto"
              containerRef={workspaceWrapperRef}
            />
          </aside>

          <section className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            <div className="flex w-full flex-col gap-4 p-6">{renderRightPane()}</div>
          </section>
        </div>
      </main>
      <section
        className={`flex-1 min-h-0 w-full ${activeWorkspaceTab === 'pending' ? 'flex' : 'hidden'}`}
        aria-hidden={activeWorkspaceTab !== 'pending'}
      >
        <PendingDestuffingPlansMonitoring />
      </section>
      <section
        className={`flex-1 min-h-0 w-full ${activeWorkspaceTab === 'done' ? 'flex' : 'hidden'}`}
        aria-hidden={activeWorkspaceTab !== 'done'}
      >
        <DestuffingDonePlansPanel
          state={donePlansTabState}
          onStateChange={setDonePlansTabState}
          isActive={activeWorkspaceTab === 'done'}
        />
      </section>

      <DestuffingPlanFormModal
        isOpen={isPlanModalOpen}
        onClose={handlePlanModalClose}
        containers={pendingContainers}
        isSubmitting={modalMode === 'edit' ? isModalMutating : isCreatingPlan}
        onSubmit={handleSavePlan}
        mode={modalMode}
        initialPlan={editingPlan}
        initialHblSelections={initialHblSelections}
        forwarders={forwarders}
        initialForwarderId={initialForwarderId}
        initialForwarderLabel={initialForwarderLabel}
        forwardersLoading={isLoadingForwarders}
        refreshKey={planModalRefreshKey}
        onSaveChanges={modalMode === 'edit' ? handleSavePlanChanges : undefined}
        isSavingChanges={isModalMutating}
        isMutating={isModalMutating}
        canWrite={canWriteDestuff}
      />
      <InProgressPlanModal
        planId={activeInProgressPlanId ?? undefined}
        isOpen={isInProgressModalOpen}
        onClose={handleCloseInProgressModal}
        onCancelPlan={handleCancelDoing}
        onMarkDone={handleMarkPlanDone}
        onMarkPending={handleMarkPlanPending}
        isProcessing={changePlanStatus.isPending}
      />
    </div>
  );
};
