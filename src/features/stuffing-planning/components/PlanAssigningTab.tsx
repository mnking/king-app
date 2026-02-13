import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { toastAdapter } from '@/shared/services/toast';
import { EntityColumn } from '@/shared/components/EntityTable';
import { ContainerFormModal } from './ContainerFormModal';
import { CargoReceivedBadge } from './PlanAssigningBadges';
import { PlanAssigningSidebar } from './PlanAssigningSidebar';
import { PlanAssigningPackingListsPanel } from './PlanAssigningPackingListsPanel';
import {
  useAssignExportPlanPackingLists,
  useChangeExportPlanContainerStatus,
  useExportPlans,
  useCreateExportPlanContainer,
  useDeleteExportPlanContainer,
  useUpdateExportPlanContainer,
  useContainerTypeList,
} from '../hooks';
import type {
  ExportPlan,
  ExportPlanContainer,
  ExportPlanContainerPayload,
  ExportPlanPackingList,
} from '../types';
import type { ContainerFormValues } from '../schemas';
import { containerStatusOrder } from '../utils';
import { normalizeContainerNumber } from '@/shared/utils/container';
import { containersApi } from '@/services/apiContainers';

interface PlanAssigningTabProps {
  plan: ExportPlan;
}

const UNASSIGNED_KEY = '__unassigned__';
const DUPLICATE_CHECK_PAGE_SIZE = 1000;

const getContainerLabel = (container?: ExportPlanContainer | null) => {
  if (!container) return 'Select container';
  const number = container.containerNumber ?? 'No number';
  const type = container.containerTypeCode ?? 'Unknown type';
  return `${number} (${type})`;
};

export const PlanAssigningTab: React.FC<PlanAssigningTabProps> = ({ plan }) => {
  const [selectedContainerKey, setSelectedContainerKey] = useState<string>(
    UNASSIGNED_KEY,
  );
  const [assignTargetContainerId, setAssignTargetContainerId] = useState<string | null>(null);
  const [selectedPackingListIds, setSelectedPackingListIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isContainerModalOpen, setContainerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);

  const createContainerMutation = useCreateExportPlanContainer();
  const updateContainerMutation = useUpdateExportPlanContainer();
  const deleteContainerMutation = useDeleteExportPlanContainer();
  const changeContainerStatusMutation = useChangeExportPlanContainerStatus();
  const assignPackingListsMutation = useAssignExportPlanPackingLists();

  const { data: allPlansResponse } = useExportPlans({
    page: 1,
    itemsPerPage: DUPLICATE_CHECK_PAGE_SIZE,
    status: 'all',
    orderBy: 'createdAt',
    orderDir: 'desc',
  });

  const { data: containerTypesResponse } = useContainerTypeList();
  const containerTypeOptions = useMemo(
    () =>
      (containerTypesResponse?.results ?? []).map((type) => ({
        value: type.code,
        label: `${type.code} - ${type.size}`,
      })),
    [containerTypesResponse?.results],
  );

  const sortedContainers = useMemo(() => {
    const containers = plan.containers ?? [];
    return [...containers].sort((a, b) => {
      const orderDiff =
        (containerStatusOrder[a.status] ?? 0) -
        (containerStatusOrder[b.status] ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.containerNumber ?? '').localeCompare(b.containerNumber ?? '');
    });
  }, [plan.containers]);

  const packingLists = useMemo(() => plan.packingLists ?? [], [plan.packingLists]);
  const containerById = useMemo(
    () => new Map(sortedContainers.map((container) => [container.id, container])),
    [sortedContainers],
  );
  const activeContainer = useMemo(() => {
    if (!activeContainerId) return null;
    return containerById.get(activeContainerId) ?? null;
  }, [activeContainerId, containerById]);

  useEffect(() => {
    if (!isContainerModalOpen || modalMode !== 'edit') return;
    if (activeContainerId && !activeContainer) {
      setActiveContainerId(null);
      setContainerModalOpen(false);
    }
  }, [activeContainer, activeContainerId, isContainerModalOpen, modalMode]);

  const containerNumberOwners = useMemo(() => {
    const owners = new Map<string, Array<{ planId: string; planLabel: string; containerId: string }>>();
    const plans = allPlansResponse?.results ?? [];
    plans
      .filter((planItem) => planItem.status !== 'DONE')
      .forEach((planItem) => {
        const planLabel = planItem.code ?? planItem.id;
        (planItem.containers ?? []).forEach((planContainer) => {
          if (!planContainer.containerNumber) return;
          const normalized = normalizeContainerNumber(planContainer.containerNumber);
          if (!normalized) return;
          const entries = owners.get(normalized);
          const nextEntry = {
            planId: planItem.id,
            planLabel,
            containerId: planContainer.id,
          };
          if (entries) {
            entries.push(nextEntry);
          } else {
            owners.set(normalized, [nextEntry]);
          }
        });
      });
    return owners;
  }, [allPlansResponse?.results]);

  const isDuplicateCheckReady = Boolean(allPlansResponse);

  const getDuplicatePlanLabels = useCallback(
    (containerNumber: string | null | undefined, currentContainerId?: string | null) => {
      if (!containerNumber) return [];
      const normalized = normalizeContainerNumber(containerNumber);
      const owners = containerNumberOwners.get(normalized) ?? [];
      const filteredOwners = currentContainerId
        ? owners.filter((owner) => owner.containerId !== currentContainerId)
        : owners;
      if (filteredOwners.length === 0) return [];
      return Array.from(
        new Set(filteredOwners.map((owner) => owner.planLabel)),
      );
    },
    [containerNumberOwners],
  );

  const unassignedPackingLists = useMemo(
    () => packingLists.filter((packingList) => !packingList.planContainerId),
    [packingLists],
  );

  const selectedContainer = useMemo(() => {
    if (selectedContainerKey === UNASSIGNED_KEY) return null;
    return (
      sortedContainers.find((container) => container.id === selectedContainerKey) ?? null
    );
  }, [selectedContainerKey, sortedContainers]);

  const selectedContainerCycleQuery = useQuery({
    queryKey: ['containers', 'byNumber', selectedContainer?.containerNumber ?? null, 'cycle'],
    queryFn: async () => {
      if (!selectedContainer?.containerNumber) {
        throw new Error('Container number is required');
      }
      const response = await containersApi.getByNumber(selectedContainer.containerNumber, {
        cycle: true,
      });
      return response.data;
    },
    enabled: Boolean(selectedContainer?.containerNumber) && selectedContainer?.status === 'SPECIFIED',
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const filteredPackingLists = useMemo(() => {
    if (selectedContainerKey === UNASSIGNED_KEY) {
      return unassignedPackingLists;
    }
    return packingLists.filter(
      (packingList) => packingList.planContainerId === selectedContainerKey,
    );
  }, [packingLists, selectedContainerKey, unassignedPackingLists]);

  useEffect(() => {
    if (selectedContainerKey !== UNASSIGNED_KEY) return;
    if (assignTargetContainerId) return;
    const eligible = sortedContainers.find(
      (container) => containerStatusOrder[container.status] < containerStatusOrder.CONFIRMED,
    );
    setAssignTargetContainerId(eligible?.id ?? null);
  }, [assignTargetContainerId, selectedContainerKey, sortedContainers]);

  useEffect(() => {
    setSelectedPackingListIds(new Set());
    setSelectedContainerKey((prev) => {
      if (prev === UNASSIGNED_KEY) return UNASSIGNED_KEY;
      const exists = sortedContainers.some((container) => container.id === prev);
      return exists ? prev : UNASSIGNED_KEY;
    });
    setAssignTargetContainerId((prev) => {
      if (prev && sortedContainers.some((container) => container.id === prev)) return prev;
      const eligible = sortedContainers.find(
        (container) => containerStatusOrder[container.status] < containerStatusOrder.CONFIRMED,
      );
      return eligible?.id ?? null;
    });
  }, [plan.id, sortedContainers]);

  useEffect(() => {
    setSelectedPackingListIds(new Set());
  }, [selectedContainerKey]);

  const togglePackingListSelection = useCallback(
    (packingList: ExportPlanPackingList) => {
      const isSelectionDisabled =
        selectedContainerKey !== UNASSIGNED_KEY &&
        Boolean(selectedContainer) &&
        containerStatusOrder[selectedContainer.status] >= containerStatusOrder.IN_PROGRESS;
      if (isSelectionDisabled) return;

      const selectionId = packingList.packingListId;
      if (!selectionId) return;
      setSelectedPackingListIds((prev) => {
        const next = new Set(prev);
        if (next.has(selectionId)) {
          next.delete(selectionId);
        } else {
          next.add(selectionId);
        }
        return next;
      });
    },
    [selectedContainer, selectedContainerKey, setSelectedPackingListIds],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const isSelectionDisabled =
        selectedContainerKey !== UNASSIGNED_KEY &&
        Boolean(selectedContainer) &&
        containerStatusOrder[selectedContainer.status] >= containerStatusOrder.IN_PROGRESS;
      if (isSelectionDisabled) return;

      if (!checked) {
        setSelectedPackingListIds(new Set());
        return;
      }
      const next = new Set<string>();
      filteredPackingLists.forEach((packingList) => {
        const selectionId = packingList.packingListId;
        if (selectionId) next.add(selectionId);
      });
      setSelectedPackingListIds(next);
    },
    [filteredPackingLists, selectedContainer, selectedContainerKey, setSelectedPackingListIds],
  );

  const handleAssign = async () => {
    if (selectedContainerKey !== UNASSIGNED_KEY) {
      toast.error('Select the unassigned packing list group to assign.');
      return;
    }
    if (selectedPackingListIds.size === 0) {
      toast.error('Please select packing lists to assign.');
      return;
    }
    if (!assignTargetContainerId) {
      toast.error('Please select a target container.');
      return;
    }

    const targetContainer = sortedContainers.find(
      (container) => container.id === assignTargetContainerId,
    );
    if (!targetContainer) {
      toast.error('Target container not found.');
      return;
    }
    if (containerStatusOrder[targetContainer.status] >= containerStatusOrder.CONFIRMED) {
      toast.error('Only containers before CONFIRMED can receive assignments.');
      return;
    }

    const assignments = Array.from(selectedPackingListIds).map((packingListId) => ({
      packingListId,
      planContainerId: assignTargetContainerId,
    }));

    try {
      await assignPackingListsMutation.mutateAsync({
        planId: plan.id,
        payload: { assignments },
      });
      setSelectedPackingListIds(new Set());
    } catch {
      // toast handled in hook
    }
  };

  const handleUnassign = async () => {
    if (selectedContainerKey === UNASSIGNED_KEY) {
      toast.error('Select a container to unassign packing lists.');
      return;
    }
    if (selectedPackingListIds.size === 0) {
      toast.error('Please select packing lists to unassign.');
      return;
    }
    const container = sortedContainers.find(
      (item) => item.id === selectedContainerKey,
    );
    if (!container) {
      toast.error('Container not found.');
      return;
    }
    if (containerStatusOrder[container.status] >= containerStatusOrder.CONFIRMED) {
      toast.error('Only containers before CONFIRMED can unassign packing lists.');
      return;
    }

    const assignments = Array.from(selectedPackingListIds).map((packingListId) => ({
      packingListId,
      planContainerId: null,
    }));

    try {
      await assignPackingListsMutation.mutateAsync({
        planId: plan.id,
        payload: { assignments },
      });
      setSelectedPackingListIds(new Set());
    } catch {
      // toast handled in hook
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setActiveContainerId(null);
    setContainerModalOpen(true);
  };

  const openEditModal = (container: ExportPlanContainer) => {
    setModalMode('edit');
    setActiveContainerId(container.id);
    setContainerModalOpen(true);
  };

  const handleSaveContainer = async (values: ContainerFormValues) => {
    const payload: ExportPlanContainerPayload = {
      containerNumber: values.containerNumber ?? null,
      containerTypeCode: values.containerTypeCode,
      estimatedStuffingAt: values.estimatedStuffingAt ?? null,
      estimatedMoveAt: values.estimatedMoveAt ?? null,
      equipmentBooked: values.equipmentBooked ?? false,
      appointmentBooked: values.appointmentBooked ?? false,
      notes: values.notes ?? null,
    };
    try {
      if (modalMode === 'create') {
        await createContainerMutation.mutateAsync({
          planId: plan.id,
          payload,
        });
        setContainerModalOpen(false);
        return;
      }

      if (!activeContainerId) return;
      await updateContainerMutation.mutateAsync({
        planId: plan.id,
        containerId: activeContainerId,
        payload,
      });
      setContainerModalOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const handleDeleteContainer = async (container: ExportPlanContainer) => {
    const canDelete =
      container.assignedPackingListCount === 0 &&
      (container.status === 'CREATED' || container.status === 'SPECIFIED');

    if (!canDelete) {
      toast.error('Only empty containers in CREATED or SPECIFIED status can be deleted.');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      'Delete container? This action cannot be undone.',
      { intent: 'danger' },
    );

    if (!confirmed) return;

    try {
      await deleteContainerMutation.mutateAsync({
        planId: plan.id,
        containerId: container.id,
      });
    } catch {
      // toast handled in hook
    }
  };

  const getConfirmMissingRequirements = (
    container: ExportPlanContainer,
    options?: {
      containerPositionStatusState?: 'idle' | 'loading' | 'success' | 'error';
      containerPositionStatus?: string | null;
    },
  ) => {
    const missing: string[] = [];
    if ((container.assignedPackingListCount ?? 0) < 1) {
      missing.push('Assign at least 1 packing list');
    }
    if (!container.containerNumber) {
      missing.push('Cannot verify container position status');
    } else if (
      options?.containerPositionStatusState === 'loading' ||
      options?.containerPositionStatusState === 'error' ||
      options?.containerPositionStatusState === 'idle'
    ) {
      missing.push('Cannot verify container position status');
    } else if (
      options?.containerPositionStatusState === 'success' &&
      options?.containerPositionStatus !== 'IN_CFS'
    ) {
      missing.push('Container position status must be IN_CFS');
    }
    if (!container.equipmentBooked) {
      missing.push('Equipment booked');
    }
    if (!container.appointmentBooked) {
      missing.push('Appointment scheduled');
    }
    if (!container.estimatedStuffingAt) {
      missing.push('Estimated stuffing time');
    }
    if (!container.estimatedMoveAt) {
      missing.push('Estimated move time');
    }
    return missing;
  };

  const handleToggleConfirmContainer = async (
    container: ExportPlanContainer,
    nextChecked: boolean,
  ) => {
    if (nextChecked) {
      if (container.status !== 'SPECIFIED') return;
      try {
        await changeContainerStatusMutation.mutateAsync({
          planId: plan.id,
          containerId: container.id,
          payload: { status: 'CONFIRMED' },
        });
      } catch {
        // toast handled in hook
      }
      return;
    }

    if (container.status !== 'CONFIRMED') return;
    const containerLabel = container.containerNumber ?? container.containerTypeCode;
    const confirmed = await toastAdapter.confirm(
      `Unconfirm ${containerLabel ? `container ${containerLabel}` : 'this container'}?`,
      { intent: 'danger' },
    );
    if (!confirmed) return;

    try {
      await changeContainerStatusMutation.mutateAsync({
        planId: plan.id,
        containerId: container.id,
        payload: { status: 'SPECIFIED' },
      });
    } catch {
      // toast handled in hook
    }
  };

  const handleStartStuffing = async (container: ExportPlanContainer) => {
    if (container.status !== 'CONFIRMED') return;

    const label = container.containerNumber ?? container.containerTypeCode;
    const confirmed = await toastAdapter.confirm(
      `Start stuffing for ${label ? `container ${label}` : 'this container'}? This will be unchangeable.`,
      { intent: 'danger' },
    );
    if (!confirmed) return;

    try {
      await changeContainerStatusMutation.mutateAsync({
        planId: plan.id,
        containerId: container.id,
        payload: { status: 'IN_PROGRESS' },
      });
    } catch {
      // toast handled in hook
    }
  };

  const selectedCount = selectedPackingListIds.size;
  const selectableCount = filteredPackingLists.filter((packingList) => packingList.packingListId).length;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;
  const isSomeSelected = selectedCount > 0 && !allSelected;
  const isSelectedContainerActionLocked =
    selectedContainerKey !== UNASSIGNED_KEY &&
    Boolean(selectedContainer) &&
    containerStatusOrder[selectedContainer.status] >= containerStatusOrder.IN_PROGRESS;
  const canAssignTargets = sortedContainers.some(
    (container) => containerStatusOrder[container.status] < containerStatusOrder.CONFIRMED,
  );
  const planHasUnassigned = unassignedPackingLists.length > 0;
  const canUnassignFromSelected =
    selectedContainerKey !== UNASSIGNED_KEY &&
    Boolean(selectedContainer) &&
    containerStatusOrder[selectedContainer.status] < containerStatusOrder.CONFIRMED;
  const selectedContainerMissingRequirements =
    selectedContainer && selectedContainer.status === 'SPECIFIED'
      ? getConfirmMissingRequirements(selectedContainer, {
          containerPositionStatusState: selectedContainerCycleQuery.isLoading
            ? 'loading'
            : selectedContainerCycleQuery.isError
              ? 'error'
              : selectedContainerCycleQuery.isSuccess
                ? 'success'
                : 'idle',
          containerPositionStatus:
            selectedContainerCycleQuery.data?.currentCycle?.containerStatus ?? null,
        })
      : [];
  const canConfirmSelectedContainer =
    selectedContainer?.status === 'SPECIFIED' &&
    selectedContainerMissingRequirements.length === 0;
  const isSelectedContainerConfirmable =
    selectedContainer?.status === 'SPECIFIED' || selectedContainer?.status === 'CONFIRMED';
  const isSelectedContainerConfirmToggleDisabled = !selectedContainer
    ? true
    : changeContainerStatusMutation.isPending ||
      !isSelectedContainerConfirmable ||
      (selectedContainer.status === 'SPECIFIED' && !canConfirmSelectedContainer);
  const canDeleteSelectedContainer =
    Boolean(selectedContainer) &&
    selectedContainer.assignedPackingListCount === 0 &&
    (selectedContainer.status === 'CREATED' || selectedContainer.status === 'SPECIFIED');
  const activePackingListLabel =
    selectedContainerKey === UNASSIGNED_KEY
      ? 'Unassigned PLs'
      : getContainerLabel(selectedContainer);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isSomeSelected;
  }, [isSomeSelected]);

  const packingListColumns = useMemo<EntityColumn<ExportPlanPackingList>[]>(
    () => [
      {
        key: 'select',
        label: (
          <div className="flex items-center justify-center">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={(event) => handleSelectAll(event.target.checked)}
              disabled={selectableCount === 0 || isSelectedContainerActionLocked}
              className="h-4 w-4 accent-blue-600"
              aria-label="Select all packing lists"
              aria-checked={isSomeSelected ? 'mixed' : allSelected}
            />
          </div>
        ),
        render: (packingList) => {
          const selectionId = packingList.packingListId;
          const selected = selectionId ? selectedPackingListIds.has(selectionId) : false;
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => togglePackingListSelection(packingList)}
                disabled={!selectionId || isSelectedContainerActionLocked}
                className="h-4 w-4 accent-blue-600"
              />
            </div>
          );
        },
      },
      {
        key: 'packingListNumber',
        label: 'Packing List',
        render: (packingList) => (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {packingList.packingListNumber ?? '-'}
          </span>
        ),
      },
      {
        key: 'customsDeclarationNumber',
        label: 'Export Customs Declaration',
        render: (packingList) => (
          <span className="text-sm text-gray-500">
            {packingList.customsDeclarationNumber ?? '-'}
          </span>
        ),
      },
      {
        key: 'shipper',
        label: 'Shipper',
        render: (packingList) => (
          <span className="text-sm text-gray-500">
            {packingList.shipper ?? '-'}
          </span>
        ),
      },
      {
        key: 'consignee',
        label: 'Consignee',
        render: (packingList) => (
          <span className="text-sm text-gray-500">
            {packingList.consignee ?? '-'}
          </span>
        ),
      },
      {
        key: 'assignedContainer',
        label: 'Assigned Container',
        render: (packingList) => {
          const container = packingList.planContainerId
            ? containerById.get(packingList.planContainerId)
            : undefined;
          return (
            <span className="text-sm text-gray-500">
              {container?.containerNumber ||
                container?.containerTypeCode ||
                'Unassigned'}
            </span>
          );
        },
      },
      {
        key: 'cargoReceived',
        label: 'Cargo Received',
        render: (packingList) => (
          <CargoReceivedBadge packingListId={packingList.packingListId} />
        ),
      },
    ],
    [
      allSelected,
      containerById,
      handleSelectAll,
      isSelectedContainerActionLocked,
      isSomeSelected,
      selectableCount,
      selectedPackingListIds,
      togglePackingListSelection,
    ],
  );

  const isActiveContainerNumberLocked =
    modalMode === 'edit' && (!activeContainer || activeContainer.status === 'CONFIRMED');

  return (
    <div className="flex flex-col gap-4 lg:items-start xl:grid xl:grid-cols-[4fr_8fr]">
      <PlanAssigningSidebar
        unassignedKey={UNASSIGNED_KEY}
        selectedContainerKey={selectedContainerKey}
        onSelectContainerKey={setSelectedContainerKey}
        unassignedPackingListsCount={unassignedPackingLists.length}
        totalPackingListsCount={packingLists.length}
        planHasUnassigned={planHasUnassigned}
        sortedContainers={sortedContainers}
        onAddContainer={openCreateModal}
      />

      <PlanAssigningPackingListsPanel
        unassignedKey={UNASSIGNED_KEY}
        selectedContainerKey={selectedContainerKey}
        activePackingListLabel={activePackingListLabel}
        selectedContainer={selectedContainer}
        filteredPackingLists={filteredPackingLists}
        packingListColumns={packingListColumns}
        assignTargetContainerId={assignTargetContainerId}
        onChangeAssignTargetContainerId={setAssignTargetContainerId}
        canAssignTargets={canAssignTargets}
        sortedContainers={sortedContainers}
        selectedCount={selectedCount}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        isAssignPending={assignPackingListsMutation.isPending}
        canUnassignFromSelected={canUnassignFromSelected}
        isSelectedContainerConfirmToggleDisabled={isSelectedContainerConfirmToggleDisabled}
        canConfirmSelectedContainer={canConfirmSelectedContainer}
        selectedContainerMissingRequirements={selectedContainerMissingRequirements}
        onToggleConfirmContainer={handleToggleConfirmContainer}
        onStartStuffing={handleStartStuffing}
        isStartStuffingPending={changeContainerStatusMutation.isPending}
        areSelectedContainerActionsDisabled={isSelectedContainerActionLocked}
        onEditSelectedContainer={() => {
          if (!selectedContainer) return;
          if (isSelectedContainerActionLocked) {
            toast.error('Container cannot be modified once stuffing has started.');
            return;
          }
          openEditModal(selectedContainer);
        }}
        onDeleteSelectedContainer={() => {
          if (!selectedContainer) return;
          if (isSelectedContainerActionLocked) {
            toast.error('Container cannot be modified once stuffing has started.');
            return;
          }
          void handleDeleteContainer(selectedContainer);
        }}
        isDeletePending={deleteContainerMutation.isPending}
        canDeleteSelectedContainer={canDeleteSelectedContainer}
      />

      <ContainerFormModal
        isOpen={isContainerModalOpen}
        mode={modalMode}
        container={activeContainer}
        containerTypeOptions={containerTypeOptions}
        isContainerNumberLocked={isActiveContainerNumberLocked}
        isSaving={createContainerMutation.isPending || updateContainerMutation.isPending}
        isDuplicateCheckReady={isDuplicateCheckReady}
        getDuplicatePlanLabels={getDuplicatePlanLabels}
        onClose={() => setContainerModalOpen(false)}
        onSubmit={handleSaveContainer}
      />
    </div>
  );
};

export default PlanAssigningTab;
