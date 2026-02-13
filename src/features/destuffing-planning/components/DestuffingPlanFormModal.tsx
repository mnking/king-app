import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Loader2, Package, Search, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import {
  FormCheckbox,
  FormInput,
  FormForwarderSingleSelect,
} from '@/shared/components/forms';
import { toDateTimeLocalFormat } from '@/shared/utils';
import {
  createDestuffingPlanSchema,
  destuffingPlanDefaultValues,
  type DestuffingPlanFormData,
} from '../schemas';
import type {
  DestuffingContainerChangeStatus,
  DestuffingHblSelections,
  DestuffingPlan,
  DestuffingPlanModalChangesPayload,
  DestuffingSelectedHbl,
  UnplannedDestuffingContainer,
} from '../types';
import { useUnplannedDestuffingContainers } from '../hooks';
import type { Forwarder } from '@/features/forwarder/types';

interface DestuffingPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: UnplannedDestuffingContainer[];
  isSubmitting?: boolean;
  onSubmit: (data: DestuffingPlanFormData) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialPlan?: DestuffingPlan | null;
  initialHblSelections?: DestuffingHblSelections;
  forwarders: Forwarder[];
  initialForwarderId?: string | null;
  initialForwarderLabel?: string | null;
  forwardersLoading?: boolean;
  refreshKey?: number;
  onSaveChanges?: (
    changes: DestuffingPlanModalChangesPayload,
    nextSelections: DestuffingHblSelections,
  ) => Promise<void>;
  isSavingChanges?: boolean;
  isMutating?: boolean;
  canWrite?: boolean;
}

const buildContainerLabel = (container: UnplannedDestuffingContainer): string =>
  container.containerNo ?? container.sealNumber ?? container.id;

const resolveContainerTypeCode = (
  container: UnplannedDestuffingContainer,
): string | null =>
  container.summary?.typeCode ??
  container.enrichedHbls?.find((hbl) => hbl.containerTypeCode)?.containerTypeCode ??
  null;

const mapContainerHbls = (
  container: UnplannedDestuffingContainer,
): DestuffingSelectedHbl[] =>
  (container.hbls ?? [])
    .map((hbl) => ({
      hblId: hbl.hblId,
      hblCode: hbl.hblNo ?? hbl.hblId,
      packingListNo: hbl.summary?.packingListNo ?? null,
    }))
    .filter((selection) => Boolean(selection.hblId));

const haveSameSelections = (
  current: DestuffingSelectedHbl[] = [],
  next: DestuffingSelectedHbl[] = [],
) => {
  if (current.length !== next.length) {
    return false;
  }
  const nextKeys = new Set(next.map((selection) => selection.hblId));
  return current.every((selection) => nextKeys.has(selection.hblId));
};

export const DestuffingPlanFormModal: React.FC<DestuffingPlanFormModalProps> = ({
  isOpen,
  onClose,
  containers,
  isSubmitting = false,
  onSubmit,
  mode = 'create',
  initialPlan = null,
  initialHblSelections = {},
  forwarders,
  initialForwarderId = null,
  initialForwarderLabel = null,
  forwardersLoading = false,
  refreshKey = 0,
  onSaveChanges,
  isSavingChanges = false,
  isMutating = false,
  canWrite = true,
}) => {
  const isEditMode = mode === 'edit';
  const scheduleLocked = isEditMode;
  const actionDisabled = isSubmitting || isMutating || !canWrite;
  const [containerSearch, setContainerSearch] = useState('');
  const forwarderRef = useRef<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DestuffingPlanFormData>({
    resolver: zodResolver(createDestuffingPlanSchema),
    defaultValues: destuffingPlanDefaultValues,
  });

  const forwarderId = watch('forwarderId');
  const watchedContainerIds = watch('containerIds');
  const selectedContainerIds = useMemo(
    () => watchedContainerIds ?? [],
    [watchedContainerIds],
  );

  const {
    data: forwarderContainers = [],
    isLoading: isLoadingForwarderContainers,
    isError: isForwarderContainersError,
    error: forwarderContainersError,
  } = useUnplannedDestuffingContainers(forwarderId ?? undefined, {
    enabled: isOpen && Boolean(forwarderId),
  });

  const containerPool = useMemo(() => {
    const map = new Map<string, UnplannedDestuffingContainer>();
    forwarderContainers.forEach((container) => map.set(container.id, container));
    containers.forEach((container) => {
      if (!map.has(container.id)) {
        map.set(container.id, container);
      }
    });
    return Array.from(map.values());
  }, [containers, forwarderContainers]);

  const containerMap = useMemo(() => {
    const map = new Map<string, UnplannedDestuffingContainer>();
    containerPool.forEach((container) => map.set(container.id, container));
    return map;
  }, [containerPool]);

  const containerHblSelections = useMemo(
    () =>
      containerPool.reduce<DestuffingHblSelections>((acc, container) => {
        acc[container.id] = mapContainerHbls(container);
        return acc;
      }, {}),
    [containerPool],
  );

  const selectedContainerIdSet = useMemo(
    () => new Set(selectedContainerIds),
    [selectedContainerIds],
  );

  const filterContainers = useCallback(
    (items: UnplannedDestuffingContainer[]) => {
      const query = containerSearch.trim().toLowerCase();
      if (!query) {
        return items;
      }

      return items.filter((container) => {
        const haystack = [
          container.containerNo,
          container.sealNumber,
          container.mblNumber,
          container.bookingOrder?.code,
          container.bookingOrder?.agentCode,
          ...(container.hbls?.map((hbl) => hbl.hblNo) ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    },
    [containerSearch],
  );

  const filteredContainers = useMemo(
    () => filterContainers(containerPool),
    [filterContainers, containerPool],
  );

  const containerError =
    typeof errors.containerIds?.message === 'string'
      ? errors.containerIds?.message
      : errors.containerIds?.root?.message;

  const hblSelectionErrors =
    (errors.hblSelections as Record<string, { message?: string }> | undefined) ??
    undefined;

  const toLocalDateTimeInputValue = (iso?: string | null) => {
    if (!iso) {
      return '';
    }
    try {
      return toDateTimeLocalFormat(iso);
    } catch {
      return '';
    }
  };

  const buildSelectionMap = useCallback(
    (containerIds: string[]) =>
      containerIds.reduce<DestuffingHblSelections>((acc, containerId) => {
        const selections = containerHblSelections[containerId] ?? [];
        acc[containerId] = selections;
        return acc;
      }, {}),
    [containerHblSelections],
  );

  useEffect(() => {
    if (!isOpen) {
      setContainerSearch('');
      forwarderRef.current = null;
      return;
    }

    const startValue = toLocalDateTimeInputValue(initialPlan?.plannedStart ?? null);
    const endValue = toLocalDateTimeInputValue(initialPlan?.plannedEnd ?? null);
    const initialContainerIds = containers.map((container) => container.id);
    const initialSelections = initialContainerIds.reduce<DestuffingHblSelections>(
      (acc, containerId) => {
        const container = containers.find((item) => item.id === containerId);
        if (container) {
          acc[containerId] = mapContainerHbls(container);
        }
        return acc;
      },
      {},
    );

    reset({
      planType: 'DESTUFFING',
      forwarderId: initialForwarderId ?? '',
      plannedStart: startValue,
      plannedStartTime: '',
      plannedEnd: endValue,
      plannedEndTime: '',
      equipmentBooked: initialPlan?.equipmentBooked ?? false,
      approvedAppointment:
        initialPlan?.approvedAppointment ?? initialPlan?.appointmentConfirmed ?? false,
      containerIds: initialContainerIds,
      hblSelections: initialSelections,
    });

    forwarderRef.current = initialForwarderId ?? null;
  }, [
    containers,
    initialForwarderId,
    initialPlan,
    isOpen,
    refreshKey,
    reset,
  ]);

  useEffect(() => {
    if (!isOpen || isEditMode) return;
    if (!forwarderRef.current) {
      forwarderRef.current = forwarderId ?? null;
      return;
    }

    if (forwarderRef.current !== forwarderId) {
      setContainerSearch('');
      setValue('containerIds', [], { shouldValidate: true });
      setValue('hblSelections', {}, { shouldValidate: true });
      forwarderRef.current = forwarderId ?? null;
    }
  }, [forwarderId, isEditMode, isOpen, setValue]);

  const updateContainerSelection = useCallback(
    (nextIds: string[]) => {
      setValue('containerIds', nextIds, { shouldValidate: true });
      setValue('hblSelections', buildSelectionMap(nextIds), { shouldValidate: true });
    },
    [buildSelectionMap, setValue],
  );

  const handleSelectContainer = useCallback(
    (containerId: string, nextSelected: boolean) => {
      if (actionDisabled) return;

      const current = new Set(selectedContainerIds);
      if (nextSelected) {
        current.add(containerId);
      } else {
        current.delete(containerId);
      }

      updateContainerSelection(Array.from(current));
    },
    [actionDisabled, selectedContainerIds, updateContainerSelection],
  );

  const containerStatusMap = useMemo(() => {
    if (!isEditMode) return {};

    const statusMap: Record<string, DestuffingContainerChangeStatus> = {};
    containerPool.forEach((container) => {
      const isSelected = selectedContainerIdSet.has(container.id);
      const hasExistingAssignment = Boolean(container.planContainerId);
      const originalSelections = initialHblSelections?.[container.id] ?? [];
      const fullSelections = containerHblSelections[container.id] ?? [];
      let status: DestuffingContainerChangeStatus = 'unchanged';

      if (isSelected) {
        if (!hasExistingAssignment) {
          status = 'add';
        } else if (!haveSameSelections(originalSelections, fullSelections)) {
          status = 'update';
        }
      } else if (hasExistingAssignment) {
        status = 'remove';
      }

      if (status !== 'unchanged') {
        statusMap[container.id] = status;
      }
    });
    return statusMap;
  }, [
    containerHblSelections,
    containerPool,
    initialHblSelections,
    isEditMode,
    selectedContainerIdSet,
  ]);

  const changeSummary = useMemo<DestuffingPlanModalChangesPayload>(() => {
    return containerPool.reduce<DestuffingPlanModalChangesPayload>(
      (acc, container) => {
        const status = containerStatusMap[container.id];
        if (!status) return acc;
        const selections = containerHblSelections[container.id] ?? [];
        const hblIds = selections.map((selection) => selection.hblId);
        if (status === 'add') {
          acc.additions.push({
            orderContainerId: container.id,
            planContainerId: container.planContainerId ?? null,
            label: buildContainerLabel(container),
            hblIds,
          });
        } else if (status === 'update') {
          acc.updates.push({
            orderContainerId: container.id,
            planContainerId: container.planContainerId ?? null,
            label: buildContainerLabel(container),
            hblIds,
          });
        } else if (status === 'remove' && container.planContainerId) {
          acc.removals.push({
            planContainerId: container.planContainerId,
            orderContainerId: container.id,
            label: buildContainerLabel(container),
          });
        }
        return acc;
      },
      { additions: [], updates: [], removals: [] },
    );
  }, [containerHblSelections, containerPool, containerStatusMap]);

  const hasPendingChanges =
    changeSummary.additions.length +
    changeSummary.updates.length +
    changeSummary.removals.length >
    0;

  const hasAnySelected = selectedContainerIds.length > 0;

  const handleSaveChangesClick = async () => {
    if (!onSaveChanges || !hasPendingChanges || !hasAnySelected) {
      return;
    }
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    const normalizedSelections = buildSelectionMap(selectedContainerIds);
    await onSaveChanges(changeSummary, normalizedSelections);
  };

  const onFormSubmit = async (data: DestuffingPlanFormData) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    const containerIds = data.containerIds.filter((id) => containerMap.has(id));
    await onSubmit({
      ...data,
      containerIds,
      hblSelections: buildSelectionMap(containerIds),
    });
  };

  const renderContainerRow = (container: UnplannedDestuffingContainer) => {
    const isSelected = selectedContainerIdSet.has(container.id);
    const containerType = resolveContainerTypeCode(container);
    const selections = containerHblSelections[container.id] ?? [];
    const hblCount = selections.length;
    const canToggle = !actionDisabled && (hblCount > 0 || isSelected);
    const containerStatus: DestuffingContainerChangeStatus =
      containerStatusMap[container.id] ?? 'unchanged';
    const effectiveStatus: DestuffingContainerChangeStatus = isEditMode
      ? containerStatus
      : isSelected
        ? 'add'
        : 'unchanged';
    const highlightClasses =
      effectiveStatus === 'add'
        ? 'border-blue-300 bg-blue-50/40 dark:border-blue-700/70 dark:bg-blue-900/20'
        : effectiveStatus === 'update'
          ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700/70 dark:bg-amber-900/20'
          : effectiveStatus === 'remove'
            ? 'border-red-300 bg-red-50/60 dark:border-red-700/70 dark:bg-red-900/25'
            : 'border-gray-200 dark:border-gray-800';
    const containerSelectionError = hblSelectionErrors?.[container.id]?.message;

    return (
      <div
        key={container.id}
        className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition ${highlightClasses}`}
      >
        <div
          className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
            }`}
          onClick={() => {
            if (!canToggle) return;
            handleSelectContainer(container.id, !isSelected);
          }}
        >
          <div className="flex flex-1 items-start gap-3">
            <span
              className={`mt-1 h-2.5 w-2.5 rounded-full ${effectiveStatus === 'add'
                ? 'bg-blue-500'
                : effectiveStatus === 'update'
                  ? 'bg-amber-500'
                  : effectiveStatus === 'remove'
                    ? 'bg-red-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {container.containerNo ?? '-'}
                </p>
                {isEditMode ? (
                  containerStatus !== 'unchanged' && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${containerStatus === 'add'
                        ? 'bg-blue-100 text-blue-700'
                        : containerStatus === 'update'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {containerStatus === 'add'
                        ? 'New'
                        : containerStatus === 'update'
                          ? 'Updated'
                          : 'Remove'}
                    </span>
                  )
                ) : isSelected ? (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {containerType ?? '-'} - Seal: {container.sealNumber ?? '-'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                <p>MBL: {container.mblNumber ?? '-'}</p>
                <p>HBLs: {hblCount}</p>
                <p>Customs: {container.customsStatus ?? '-'}</p>
                <p>Cargo Release: {container.cargoReleaseStatus ?? '-'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 md:flex-col md:items-end">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                HBLs
              </p>
              {hblCount > 0 ? (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {isSelected ? `All ${hblCount} included` : `${hblCount} available`}
                </p>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-300">No HBLs</p>
              )}
            </div>
            <label
              className={`inline-flex items-center gap-2 text-xs font-medium ${canToggle ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                }`}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!canToggle}
                onChange={(event) =>
                  handleSelectContainer(container.id, event.target.checked)
                }
                onClick={(event) => event.stopPropagation()}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed dark:border-gray-600"
              />
              <span>{isSelected ? 'Included' : 'Include'}</span>
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          {hblCount === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              No HBLs available for this container.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selections.map((selection) => (
                <span
                  key={`${container.id}-${selection.hblId}`}
                  className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-200"
                >
                  {selection.hblCode}
                  {selection.packingListNo ? ` - ${selection.packingListNo}` : ''}
                </span>
              ))}
            </div>
          )}
          {isSelected && hblCount > 0 ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              All HBLs in this container will be included in the destuffing plan.
            </p>
          ) : null}
          {containerSelectionError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">
              {containerSelectionError}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  const selectedCount = selectedContainerIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isEditMode ? 'Edit Destuffing Plan' : 'Create Destuffing Plan'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Select containers to destuff. All HBLs in a selected container are
                automatically included.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close destuffing plan modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 min-h-0 flex-col text-gray-900 dark:text-gray-100"
        >
          <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-6">
            <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Schedule
              </h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Planned Start (Local time)
                  </p>
                  <div className="mt-2">
                    <FormInput
                      name="plannedStart"
                      control={control}
                      type="datetime-local"
                      valueMode="string"
                      label="Date & Time"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Planned End (Local time)
                  </p>
                  <div className="mt-2">
                    <FormInput
                      name="plannedEnd"
                      control={control}
                      type="datetime-local"
                      valueMode="string"
                      label="Date & Time"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Forwarder
                  </p>
                  <div className="mt-2">
                    <FormForwarderSingleSelect<DestuffingPlanFormData>
                      name="forwarderId"
                      control={control}
                      placeholder="Select a forwarder..."
                      disabled={actionDisabled || isEditMode}
                      forwarders={forwarders}
                      forwardersLoading={forwardersLoading}
                      required
                    />
                    {isEditMode && initialForwarderLabel ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Forwarder locked to{' '}
                        <span className="font-semibold text-gray-700">
                          {initialForwarderLabel}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Prerequisites
                  </p>
                  <div className="mt-2 space-y-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-3">
                    <FormCheckbox
                      name="equipmentBooked"
                      control={control}
                      label="Equipment booked"
                      disabled={scheduleLocked || actionDisabled}
                    />
                    <FormCheckbox
                      name="approvedAppointment"
                      control={control}
                      label="Appointment confirmed"
                      disabled={scheduleLocked || actionDisabled}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    Containers
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select containers to add to the plan. All HBLs for a selected
                    container are included automatically.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Package className="h-4 w-4" />
                    {selectedCount} selected
                  </span>
                  <div className="relative w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                      placeholder="Search containers..."
                      value={containerSearch}
                      onChange={(event) => setContainerSearch(event.target.value)}
                      disabled={actionDisabled || (!forwarderId && !isEditMode)}
                    />
                  </div>
                </div>
              </div>

              {!forwarderId && !isEditMode ? (
                <div className="mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                  Select a forwarder to view available containers.
                </div>
              ) : isLoadingForwarderContainers ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-300" />
                  Loading containers...
                </div>
              ) : isForwarderContainersError ? (
                <div className="mt-6 rounded-xl border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
                  {forwarderContainersError?.message ?? 'Failed to load containers.'}
                </div>
              ) : containerPool.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                  No containers available for this forwarder.
                </div>
              ) : filteredContainers.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                  No containers match your search.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredContainers.map((container) => renderContainerRow(container))}
                </div>
              )}

              {containerError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{containerError}</p>
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  type="button"
                  onClick={onClose}
                  disabled={isSavingChanges}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    void handleSaveChangesClick();
                  }}
                  disabled={
                    isSavingChanges ||
                    actionDisabled ||
                    !hasPendingChanges ||
                    !hasAnySelected
                  }
                >
                  {isSavingChanges ? 'Saving...' : 'Save changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !forwarderId || !hasAnySelected}
                >
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
