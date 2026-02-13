import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PlanList } from './PlanList';
import { PlanDetails } from './PlanDetails';
import { PlanFormModal } from './PlanFormModal';
import { MiniMapWidget } from './MiniMapWidget';
import { ActivePlanModal } from './ActivePlanModal';
import { DonePlanHistory } from './DonePlanHistory';
import { PendingPlanMonitoring } from './PendingPlanMonitoring';
import {
  usePlans,
  useEnrichedPlans,
  useUnplannedContainers,
  useCreatePlan,
  useDeletePlan,
  useChangePlanStatus,
} from '../hooks';
import { inProgressPlanQueryKey, planQueryKeys } from '@/shared/features/plan/query-keys';
import type { EnrichedReceivePlan } from '../hooks/use-plans-query';
import type { PlanFormData, CreatePlanRequest, ReceivePlan } from '@/shared/features/plan/types';
import { fromDateTimeLocalFormat } from '@/shared/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { useAuth } from '@/features/auth/useAuth';


/**
 * ReceivePlanWorkspace - Main page for CFS Receive Plan management
 *
 * Features:
 * - Unplanned container list (virtual plan)
 * - SCHEDULED plans (create, edit, delete, mark doing)
 * - IN_PROGRESS plans (hidden from list, only 1 allowed, shown in minimap)
 * - DONE plans (read-only)
 * - Status transition: SCHEDULED → IN_PROGRESS (with prerequisites validation)
 * - Priority-based sorting
 * - Time overlap validation
 */
export const ReceivePlanWorkspace: React.FC = () => {
  const { can } = useAuth();
  const canWritePlans = can?.('container_receive_plan:write') ?? false;
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'unplanned' | null>('unplanned');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedContainerIds, setPreSelectedContainerIds] = useState<string[]>([]);
  const [selectedUnplannedContainerIds, setSelectedUnplannedContainerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isActivePlanModalOpen, setIsActivePlanModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'workspace' | 'pending' | 'history'>('workspace');
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const {
    data: scheduledPlansData,
    isLoading: isLoadingScheduled,
    refetch: refetchScheduledPlans,
  } = useEnrichedPlans({
    status: 'SCHEDULED',
  });
  const {
    data: inProgressPlansData,
    isLoading: isLoadingInProgress,
    refetch: refetchInProgressPlans,
  } = usePlans({
    status: 'IN_PROGRESS',
  });
  const {
    data: unplannedData,
    isLoading: isLoadingUnplanned,
    refetch: refetchUnplannedContainers,
  } = useUnplannedContainers();

  // Mutations
  const createPlanMutation = useCreatePlan();
  const deletePlanMutation = useDeletePlan();
  const changePlanStatusMutation = useChangePlanStatus();

  // Extract data
  const scheduledPlans = useMemo((): EnrichedReceivePlan[] => {
    if (!scheduledPlansData?.results) return [];
    // Sort by plannedStart ascending
    return [...scheduledPlansData.results].sort(
      (a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime(),
    );
  }, [scheduledPlansData]);

  const unplannedContainers = unplannedData || [];

  // Check if there's an IN_PROGRESS plan (only 1 allowed)
  const inProgressPlan = useMemo(() => {
    if (!inProgressPlansData?.results) return null;
    return inProgressPlansData.results[0] || null;
  }, [inProgressPlansData]);

  const inProgressPlans = useMemo(
    (): ReceivePlan[] => inProgressPlansData?.results ?? [],
    [inProgressPlansData],
  );

  const existingPlansForValidation = useMemo(
    (): ReceivePlan[] => [...scheduledPlans, ...inProgressPlans],
    [scheduledPlans, inProgressPlans],
  );

  const allPlans = useMemo((): EnrichedReceivePlan[] => [...scheduledPlans], [scheduledPlans]);

  // Find currently selected plan
  const selectedPlan = useMemo((): EnrichedReceivePlan | null => {
    if (selectedPlanId === 'unplanned' || selectedPlanId === null) return null;
    return allPlans.find((p) => p.id === selectedPlanId) || null;
  }, [selectedPlanId, allPlans]);

  // Event Handlers
  const handleSelectPlan = (planId: string | 'unplanned') => {
    setSelectedPlanId(planId);
  };

  const handleCreatePlan = useCallback((containerIds: string[] = []) => {
    if (!canWritePlans) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    setPreSelectedContainerIds(containerIds);
    setIsModalOpen(true);
  }, [canWritePlans]);

  const handleToggleUnplannedContainerSelection = useCallback(
    (containerId: string, selected: boolean) => {
      setSelectedUnplannedContainerIds((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(containerId);
        } else {
          next.delete(containerId);
        }
        return next;
      });
    },
    [],
  );

  const handleCreatePlanFromSelection = useCallback(() => {
    if (!canWritePlans) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    handleCreatePlan(Array.from(selectedUnplannedContainerIds));
    setSelectedUnplannedContainerIds(new Set());
  }, [canWritePlans, handleCreatePlan, selectedUnplannedContainerIds]);

  const handleDeletePlan = async (planId: string) => {
    if (!canWritePlans) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    await deletePlanMutation.mutateAsync(planId);
    // After delete, redirect to unplanned view
    setSelectedPlanId('unplanned');
  };

  const handleMarkDoing = async (planId: string) => {
    if (!canWritePlans) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    const plan = scheduledPlans.find((p) => p.id === planId);
    if (!plan) return;

    if (plan.containers.length === 0) {
      toast.error('Cannot start plan execution. Please assign at least one container.');
      return;
    }

    // Validation 1: Check prerequisites
    if (!plan.equipmentBooked || !plan.portNotified) {
      toast.error(
        'Cannot start plan execution. Please ensure equipment is booked and port is notified.',
        { duration: 5000 }
      );
      return;
    }

    // Validation 2: Check if another plan is already IN_PROGRESS
    if (inProgressPlan) {
      toast.error(
        'Another plan is already in progress. Please complete it first.',
        { duration: 5000 }
      );
      return;
    }

    // Change status SCHEDULED → IN_PROGRESS
    await changePlanStatusMutation.mutateAsync({
      id: planId,
      data: { status: 'IN_PROGRESS' },
    });

    // After transitioning to IN_PROGRESS, the plan will disappear from the list
    // Redirect to unplanned view
    setSelectedPlanId('unplanned');
  };

  const handleSavePlan = async (formData: PlanFormData) => {
    if (!canWritePlans) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    // Create new plan
    // Convert datetime-local strings to ISO format (UTC)
    const createData: CreatePlanRequest = {
      plannedStart: fromDateTimeLocalFormat(formData.plannedStart),
      plannedEnd: fromDateTimeLocalFormat(formData.plannedEnd),
      equipmentBooked: formData.equipmentBooked,
      portNotified: formData.portNotified,
      containers: formData.containerIds.map((id) => ({ orderContainerId: id })),
    };
    const newPlan = await createPlanMutation.mutateAsync(createData);

    // Select the newly created plan after a brief delay to allow React Query cache to update
    // This ensures the plan list has been refetched before we try to select it
    setTimeout(() => {
      setSelectedPlanId(newPlan.id);
    }, 100);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPreSelectedContainerIds([]);
  };

  const handleRefreshData = useCallback(async () => {
    await Promise.all([
      refetchScheduledPlans({ throwOnError: false }),
      refetchInProgressPlans({ throwOnError: false }),
      refetchUnplannedContainers({ throwOnError: false }),
      queryClient.refetchQueries({
        queryKey: inProgressPlanQueryKey,
        type: 'active',
      }),
    ]);
  }, [
    queryClient,
    refetchInProgressPlans,
    refetchScheduledPlans,
    refetchUnplannedContainers,
  ]);

  useEffect(() => {
    if (activeSection === 'workspace') {
      void handleRefreshData();
    } else {
      void queryClient.refetchQueries({ queryKey: planQueryKeys.all, type: 'active' });
    }
  }, [activeSection, handleRefreshData, queryClient]);

  // Loading state
  const isLoading = isLoadingScheduled || isLoadingInProgress || isLoadingUnplanned;

  if (isLoading && activeSection === 'workspace') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Loading workspace...</p>
        </div>
      </div>
    );
  }

	  const workspaceContent = (
	    <div className="h-full flex bg-gray-100 dark:bg-gray-900 relative" ref={workspaceRef}>
	      <div className="w-full md:w-[420px] min-w-[360px] max-w-[520px] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">
	        <PlanList
	          scheduledPlans={scheduledPlans}
	          unplannedCount={unplannedContainers.length}
	          selectedUnplannedCount={selectedUnplannedContainerIds.size}
	          selectedPlanId={selectedPlanId}
	          onSelectPlan={handleSelectPlan}
	          onCreatePlan={handleCreatePlanFromSelection}
	          onRefresh={handleRefreshData}
	          canWrite={canWritePlans}
	        />
	      </div>

	      <div className="flex-1 flex flex-col">
	        <PlanDetails
	          selectedPlanId={selectedPlanId}
	          plan={selectedPlan}
	          unplannedContainers={unplannedContainers}
	          selectedUnplannedContainerIds={selectedUnplannedContainerIds}
	          onToggleUnplannedContainerSelection={handleToggleUnplannedContainerSelection}
	          existingPlans={existingPlansForValidation}
	          onDeletePlan={handleDeletePlan}
	          onMarkDoing={handleMarkDoing}
	          onPlanSelectionChange={handleSelectPlan}
	          canWrite={canWritePlans}
	        />
	      </div>

      <PlanFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode="create"
        plan={null}
        preSelectedContainerIds={preSelectedContainerIds}
        availableContainers={unplannedContainers}
        existingPlans={existingPlansForValidation}
        canWrite={canWritePlans}
        onSave={handleSavePlan}
      />

      <ActivePlanModal
        isOpen={isActivePlanModalOpen}
        onClose={() => setIsActivePlanModalOpen(false)}
        planId={inProgressPlan?.id}
        canWrite={canWritePlans}
      />

      <MiniMapWidget
        onOpenModal={() => setIsActivePlanModalOpen(true)}
        containerRef={workspaceRef}
      />
    </div>
  );

  return (
    <Tabs
      value={activeSection}
      onValueChange={(value) => setActiveSection(value as 'workspace' | 'pending' | 'history')}
      className="h-full flex flex-col bg-gray-100 dark:bg-gray-900"
    >
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex flex-col gap-2">
        <TabsList variant="underline" className="bg-transparent border-0 rounded-none shadow-none p-0">
          <TabsTrigger value="workspace" variant="underline">Receive Plans</TabsTrigger>
          <TabsTrigger value="pending" variant="underline">Pending Plans</TabsTrigger>
          <TabsTrigger value="history" variant="underline">Done Plans</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="workspace" className="flex-1 min-h-0 mt-0">
        {workspaceContent}
      </TabsContent>
      <TabsContent value="pending" className="flex-1 min-h-0 mt-0">
        <PendingPlanMonitoring />
      </TabsContent>
      <TabsContent value="history" className="flex-1 min-h-0 mt-0">
        <DonePlanHistory />
      </TabsContent>
    </Tabs>
  );
};
