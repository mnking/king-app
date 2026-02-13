import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import {
  FormCheckbox,
  FormInput,
  FormForwarderSingleSelect,
} from '@/shared/components/forms';
import {
  CARGO_RELEASE_STATUS,
  CUSTOMS_STATUS,
  type CargoReleaseStatus,
  type CustomsStatus,
} from '@/shared/constants/container-status';
import { toDateTimeLocalFormat } from '@/shared/utils';
import { HblSelectorCheckboxList } from './HblSelectorCheckboxList';
import {
  createDestuffingPlanSchema,
  destuffingPlanDefaultValues,
  type DestuffingPlanFormData,
} from '../../schemas';
import type {
  DestuffingContainerChangeStatus,
  DestuffingHblSelections,
  DestuffingPlan,
  DestuffingPlanModalChangesPayload,
  DestuffingSelectedHbl,
  PartialDestuffingContainer,
  UnplannedDestuffingContainer,
} from '../../types';
import { usePlannedDestuffingHblIds, useUnplannedDestuffingContainers } from '../../hooks';
import { usePartialDestuffingContainers } from '../hooks/use-partial-destuffing-containers';
import { filterPartialContainersByPlannedHbls } from '../utils/partial-container-utils';
import type { BookingOrderHBL } from '@/features/booking-orders/types';
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

type ForwarderContainerMap = Record<string, UnplannedDestuffingContainer>;

const buildContainerMap = (
  containers: UnplannedDestuffingContainer[],
): ForwarderContainerMap =>
  containers.reduce<ForwarderContainerMap>((acc, container) => {
    acc[container.id] = container;
    return acc;
  }, {});

const createEmptyHblSelectionMap = (
  containers: UnplannedDestuffingContainer[],
): DestuffingHblSelections =>
  containers.reduce<DestuffingHblSelections>((acc, container) => {
    acc[container.id] = [];
    return acc;
  }, {});

const buildContainerLabel = (container: UnplannedDestuffingContainer): string =>
  container.containerNo ?? container.sealNumber ?? container.id;

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

type HblDiff = {
  hblId: string;
  status: 'add' | 'remove';
};

interface CheckContainerHblEntry {
  orderContainerId: string;
  planContainerId?: string | null;
  label: string;
  status: DestuffingContainerChangeStatus;
  original: DestuffingSelectedHbl[];
  current: DestuffingSelectedHbl[];
  diff: HblDiff[];
}

const computeContainerStatus = (
  hasExistingAssignment: boolean,
  original: DestuffingSelectedHbl[],
  current: DestuffingSelectedHbl[],
): DestuffingContainerChangeStatus => {
  if (!hasExistingAssignment) {
    return current.length ? 'add' : 'unchanged';
  }
  if (!current.length && original.length) {
    return 'remove';
  }
  const selectionsChanged = !haveSameSelections(original, current);
  if (!selectionsChanged) {
    return 'unchanged';
  }
  return 'update';
};

const buildDiffEntries = (
  original: DestuffingSelectedHbl[],
  current: DestuffingSelectedHbl[],
): HblDiff[] => {
  const diff: HblDiff[] = [];
  const originalIds = new Set(original.map((selection) => selection.hblId));
  const currentIds = new Set(current.map((selection) => selection.hblId));

  currentIds.forEach((hblId) => {
    if (!originalIds.has(hblId)) {
      diff.push({ hblId, status: 'add' });
    }
  });

  originalIds.forEach((hblId) => {
    if (!currentIds.has(hblId)) {
      diff.push({ hblId, status: 'remove' });
    }
  });

  return diff;
};

const resolveContainerTypeCode = (
  container: UnplannedDestuffingContainer,
): string | null => {
  return (
    container.summary?.typeCode ??
    container.enrichedHbls?.find((hbl) => hbl.containerTypeCode)?.containerTypeCode ??
    null
  );
};

type PartialContainerHbl = {
  id?: string | null;
  orderContainerId?: string | null;
  hblId?: string | null;
  hblNo?: string | null;
  summary?: Record<string, unknown> | null;
};

const mapPartialHbls = (
  hbls: PartialContainerHbl[] | null | undefined,
  orderContainerId: string,
): BookingOrderHBL[] =>
  (hbls ?? [])
    .map((hbl) => {
      if (!hbl?.hblId) return null;
      return {
        id: hbl.id ?? hbl.hblId,
        orderContainerId,
        hblId: hbl.hblId,
        hblNo: hbl.hblNo ?? hbl.hblId,
        summary: (hbl.summary ?? null) as BookingOrderHBL['summary'],
      };
    })
    .filter((hbl): hbl is BookingOrderHBL => Boolean(hbl));

const mapPartialContainerToUnplanned = (
  container: PartialDestuffingContainer,
  forwarderId?: string | null,
): UnplannedDestuffingContainer | null => {
  const orderContainer = container.orderContainer;
  if (!orderContainer) {
    return null;
  }

  const orderContainerId = container.orderContainerId ?? orderContainer.id ?? null;
  if (!orderContainerId) {
    return null;
  }

  const hbls = mapPartialHbls(orderContainer.hbls ?? container.hbls ?? [], orderContainerId);
  if (hbls.length === 0) {
    return null;
  }

  return {
    id: orderContainerId,
    orderId: orderContainer.orderId ?? '',
    orderCode: orderContainer.bookingNumber ?? null,
    containerId: orderContainer.containerId ?? '',
    containerNo: orderContainer.containerNo ?? orderContainer.containerNumber ?? '—',
    sealNumber: container.latestSealNumber ?? orderContainer.sealNumber ?? null,
    yardFreeFrom: orderContainer.yardFreeFrom ?? null,
    yardFreeTo: orderContainer.yardFreeTo ?? null,
    extractFrom: orderContainer.extractFrom ?? null,
    extractTo: orderContainer.extractTo ?? null,
    isPriority: Boolean(orderContainer.isPriority),
    mblNumber: orderContainer.mblNumber ?? null,
    customsStatus:
      (orderContainer.customsStatus ?? CUSTOMS_STATUS.PENDING_APPROVAL) as CustomsStatus,
    cargoReleaseStatus:
      (orderContainer.cargoReleaseStatus ??
        CARGO_RELEASE_STATUS.NOT_REQUESTED) as CargoReleaseStatus,
    summary: orderContainer.summary ?? null,
    hbls,
    forwarderId: forwarderId ?? null,
    forwarderName: orderContainer.forwarderName ?? null,
  };
};

const mergePartialWithSelected = (
  selected: UnplannedDestuffingContainer,
  partial: UnplannedDestuffingContainer,
): UnplannedDestuffingContainer => ({
  ...selected,
  ...partial,
  planContainerId: selected.planContainerId ?? partial.planContainerId,
  planId: selected.planId ?? partial.planId,
  bypassStorageFlag: selected.bypassStorageFlag ?? partial.bypassStorageFlag,
  forwarderId: selected.forwarderId ?? partial.forwarderId,
  forwarderName: selected.forwarderName ?? partial.forwarderName,
  hbls: partial.hbls ?? selected.hbls,
});

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
  const [containerSearch, setContainerSearch] = useState('');
  const [selectedContainerMap, setSelectedContainerMap] = useState<ForwarderContainerMap>({});
  const [checkContainerHbls, setCheckContainerHbls] = useState<
    Record<string, CheckContainerHblEntry>
  >({});
  const forwarderRef = useRef<string | null>(null);
  const scheduleLocked = isEditMode;
  const actionDisabled = isSubmitting || isMutating || !canWrite;

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
  const selectedContainerIds = watch('containerIds');
  const hblSelections = watch('hblSelections');

  const {
    data: forwarderContainers = [],
    isLoading: isLoadingForwarderContainers,
    isError: isForwarderContainersError,
    error: forwarderContainersError,
  } = useUnplannedDestuffingContainers(forwarderId ?? undefined, {
    enabled: isOpen && Boolean(forwarderId),
  });

  const {
    data: partialContainersData = [],
    isLoading: isLoadingPartialContainers,
    isError: isPartialContainersError,
    error: partialContainersError,
  } = usePartialDestuffingContainers(forwarderId ?? undefined, {
    enabled: isOpen && Boolean(forwarderId),
  });
  const { data: plannedHblIds = [] } = usePlannedDestuffingHblIds();
  const plannedHblIdSet = useMemo(() => new Set(plannedHblIds), [plannedHblIds]);
  const initialPlanHblIdSet = useMemo(() => {
    if (!isEditMode) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    Object.values(initialHblSelections ?? {}).forEach((selections) => {
      selections?.forEach((selection) => {
        if (selection?.hblId) {
          ids.add(selection.hblId);
        }
      });
    });
    return ids;
  }, [initialHblSelections, isEditMode]);
  const plannedHblIdFilterSet = useMemo(() => {
    if (!isEditMode) {
      return plannedHblIdSet;
    }
    const next = new Set(plannedHblIdSet);
    initialPlanHblIdSet.forEach((hblId) => {
      next.delete(hblId);
    });
    return next;
  }, [initialPlanHblIdSet, isEditMode, plannedHblIdSet]);

  const selectedContainers = useMemo(
    () => Object.values(selectedContainerMap),
    [selectedContainerMap],
  );

  const plannedFilteredPartialContainers = useMemo(
    () =>
      filterPartialContainersByPlannedHbls(partialContainersData ?? [], plannedHblIdFilterSet),
    [partialContainersData, plannedHblIdFilterSet],
  );

  const partialContainers = useMemo(
    () =>
      plannedFilteredPartialContainers
        .map((container) => mapPartialContainerToUnplanned(container, forwarderId))
        .filter((container): container is UnplannedDestuffingContainer => Boolean(container)),
    [plannedFilteredPartialContainers, forwarderId],
  );

  const partialContainerIds = useMemo(
    () => new Set(partialContainers.map((container) => container.id)),
    [partialContainers],
  );

  const partialContainerPool = useMemo(() => {
    const merged = new Map<string, UnplannedDestuffingContainer>();
    partialContainers.forEach((container) => merged.set(container.id, container));
    selectedContainers.forEach((container) => {
      if (partialContainerIds.has(container.id)) {
        const partial = merged.get(container.id);
        merged.set(
          container.id,
          partial ? mergePartialWithSelected(container, partial) : container,
        );
      }
    });
    return Array.from(merged.values());
  }, [partialContainerIds, partialContainers, selectedContainers]);

  const unplannedContainerPool = useMemo(() => {
    const merged = new Map<string, UnplannedDestuffingContainer>();
    forwarderContainers.forEach((container) => merged.set(container.id, container));
    selectedContainers.forEach((container) => {
      if (!partialContainerIds.has(container.id)) {
        merged.set(container.id, container);
      }
    });
    return Array.from(merged.values());
  }, [forwarderContainers, partialContainerIds, selectedContainers]);

  const filterContainers = useCallback(
    (containers: UnplannedDestuffingContainer[]) => {
      const query = containerSearch.trim().toLowerCase();
      if (!query) {
        return containers;
      }

      return containers.filter((container) => {
        const haystack = [
          container.containerNo,
          container.sealNumber,
          container.mblNumber,
          container.bookingOrder?.code,
          container.bookingOrder?.agentCode,
          ...(container.hbls?.map((hbl) => `${hbl.hblNo} ${hbl.packingListNo ?? ''}`) ??
            []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    },
    [containerSearch],
  );

  const filteredPartialContainers = useMemo(
    () => filterContainers(partialContainerPool),
    [filterContainers, partialContainerPool],
  );

  const filteredUnplannedContainers = useMemo(
    () => filterContainers(unplannedContainerPool),
    [filterContainers, unplannedContainerPool],
  );

  const containerError =
    typeof errors.containerIds?.message === 'string'
      ? errors.containerIds?.message
      : errors.containerIds?.root?.message;

  const hblSelectionErrors =
    (errors.hblSelections as Record<string, { message?: string }> | undefined) ?? undefined;

  const splitDateTime = (iso?: string | null) => {
    if (!iso) {
      return { date: '', time: '' };
    }
    const local = toDateTimeLocalFormat(iso);
    const [date, time = '00:00'] = local.split('T');
    return { date, time };
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedContainerMap({});
      setContainerSearch('');
      setCheckContainerHbls({});
      forwarderRef.current = null;
      return;
    }

    const startParts = splitDateTime(initialPlan?.plannedStart ?? null);
    const endParts = splitDateTime(initialPlan?.plannedEnd ?? null);
    const initialContainerIds = containers.map((container) => container.id);
    const initialSelectionMap =
      Object.keys(initialHblSelections ?? {}).length > 0
        ? initialHblSelections
        : createEmptyHblSelectionMap(containers);

    reset({
      planType: 'DESTUFFING',
      forwarderId: initialForwarderId ?? '',
      plannedStart: startParts.date,
      plannedStartTime: startParts.time,
      plannedEnd: endParts.date,
      plannedEndTime: endParts.time,
      equipmentBooked: initialPlan?.equipmentBooked ?? false,
      approvedAppointment:
        initialPlan?.approvedAppointment ?? initialPlan?.appointmentConfirmed ?? false,
      containerIds: initialContainerIds,
      hblSelections: initialSelectionMap,
    });

    setSelectedContainerMap(buildContainerMap(containers));
    forwarderRef.current = initialForwarderId ?? null;

    if (isEditMode) {
      const nextEntries = containers.reduce<Record<string, CheckContainerHblEntry>>(
        (acc, container) => {
          const entrySelections = initialSelectionMap[container.id] ?? [];
          acc[container.id] = {
            orderContainerId: container.id,
            planContainerId: container.planContainerId ?? null,
            label: buildContainerLabel(container),
            status: 'unchanged',
            original: entrySelections,
            current: entrySelections,
            diff: [],
          };
          return acc;
        },
        {},
      );
      setCheckContainerHbls(nextEntries);
    } else {
      setCheckContainerHbls({});
    }
  }, [
    containers,
    initialForwarderId,
    initialHblSelections,
    initialPlan,
    isOpen,
    isEditMode,
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
      setSelectedContainerMap({});
      setValue('containerIds', [], { shouldValidate: true });
      setValue('hblSelections', {}, { shouldValidate: true });
      forwarderRef.current = forwarderId ?? null;
    }
  }, [forwarderId, isEditMode, isOpen, setValue]);

  const updateHblSelectionState = useCallback(
    (containerId: string, selections: DestuffingSelectedHbl[]) => {
      const nextSelections = { ...(hblSelections ?? {}) };
      nextSelections[containerId] = selections;
      setValue('hblSelections', nextSelections, { shouldValidate: true });
    },
    [hblSelections, setValue],
  );

  const updateContainerChangeEntry = useCallback(
    (container: UnplannedDestuffingContainer, selections: DestuffingSelectedHbl[]) => {
      if (!isEditMode) return;
      setCheckContainerHbls((prev) => {
        const orderContainerId = container.id;
        const existing = prev[orderContainerId];
        const original =
          existing?.original ?? initialHblSelections?.[orderContainerId] ?? [];
        const status = computeContainerStatus(
          Boolean(container.planContainerId),
          original,
          selections,
        );
        if (status === 'unchanged') {
          const next = { ...prev };
          delete next[orderContainerId];
          return next;
        }
        return {
          ...prev,
          [orderContainerId]: {
            orderContainerId,
            planContainerId: container.planContainerId ?? null,
            label: buildContainerLabel(container),
            status,
            original,
            current: selections,
            diff: buildDiffEntries(original, selections),
          },
        };
      });
    },
    [initialHblSelections, isEditMode],
  );

  const applyHblSelections = useCallback(
    (container: UnplannedDestuffingContainer, selections: DestuffingSelectedHbl[]) => {
      updateHblSelectionState(container.id, selections);
      updateContainerChangeEntry(container, selections);
    },
    [updateContainerChangeEntry, updateHblSelectionState],
  );

  const handleHblSelectionChange = useCallback(
    (container: UnplannedDestuffingContainer, selections: DestuffingSelectedHbl[]) => {
      if (actionDisabled) return;

      const currentIds = selectedContainerIds ?? [];
      const nextSelections = [...selections];
      const shouldInclude = nextSelections.length > 0;

      setSelectedContainerMap((prev) => {
        const exists = Boolean(prev[container.id]);
        if (shouldInclude) {
          if (exists) {
            return prev;
          }
          return { ...prev, [container.id]: container };
        }
        if (isEditMode) {
          return prev;
        }
        if (!exists) {
          return prev;
        }
        const next = { ...prev };
        delete next[container.id];
        return next;
      });

      if (!isEditMode) {
        if (shouldInclude && !currentIds.includes(container.id)) {
          setValue('containerIds', [...currentIds, container.id], { shouldValidate: true });
        }

        if (!shouldInclude && currentIds.includes(container.id)) {
          setValue(
            'containerIds',
            currentIds.filter((id) => id !== container.id),
            { shouldValidate: true },
          );
        }
      }

      applyHblSelections(container, shouldInclude ? nextSelections : []);
    },
    [
      actionDisabled,
      applyHblSelections,
      isEditMode,
      selectedContainerIds,
      setSelectedContainerMap,
      setValue,
    ],
  );

  const selectedCount = useMemo(() => {
    return Object.values(hblSelections ?? {}).filter(
      (selections) => Array.isArray(selections) && selections.length > 0,
    ).length;
  }, [hblSelections]);

  const totalHblSelections = useMemo(() => {
    return Object.values(hblSelections ?? {}).reduce(
      (count, selections) => count + (selections?.length ?? 0),
      0,
    );
  }, [hblSelections]);

  const pendingChangeEntries = useMemo(
    () => Object.values(checkContainerHbls),
    [checkContainerHbls],
  );

  const changeSummary = useMemo<DestuffingPlanModalChangesPayload>(() => {
    return pendingChangeEntries.reduce<DestuffingPlanModalChangesPayload>(
      (acc, entry) => {
        const hblIds = entry.current.map((selection) => selection.hblId);
        if (entry.status === 'add') {
          acc.additions.push({
            orderContainerId: entry.orderContainerId,
            planContainerId: entry.planContainerId ?? null,
            label: entry.label,
            hblIds,
          });
        } else if (entry.status === 'update') {
          acc.updates.push({
            orderContainerId: entry.orderContainerId,
            planContainerId: entry.planContainerId ?? null,
            label: entry.label,
            hblIds,
          });
        } else if (entry.status === 'remove' && entry.planContainerId) {
          acc.removals.push({
            planContainerId: entry.planContainerId,
            orderContainerId: entry.orderContainerId,
            label: entry.label,
          });
        }
        return acc;
      },
      { additions: [], updates: [], removals: [] },
    );
  }, [pendingChangeEntries]);

  const hasPendingChanges =
    changeSummary.additions.length +
    changeSummary.updates.length +
    changeSummary.removals.length >
    0;

  const hasAnyHblSelected = totalHblSelections > 0;

  const handleSaveChangesClick = async () => {
    if (!onSaveChanges || !hasPendingChanges || !hasAnyHblSelected) {
      return;
    }
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    const normalizedSelections = { ...(hblSelections ?? {}) };
    await onSaveChanges(changeSummary, normalizedSelections);
  };

  const onFormSubmit = async (data: DestuffingPlanFormData) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    await onSubmit({
      ...data,
      containerIds: data.containerIds.filter((id) => selectedContainerMap[id]),
    });
  };

  const renderContainerRow = (container: UnplannedDestuffingContainer) => {
    const isSelected =
      isEditMode || Boolean((hblSelections?.[container.id] ?? []).length > 0);
    const totalHbls = container.hbls?.length ?? 0;
    const selectedHblCount = hblSelections?.[container.id]?.length ?? 0;
    const containerType = resolveContainerTypeCode(container);
    const changeEntry = checkContainerHbls[container.id];
    const containerStatus: DestuffingContainerChangeStatus = changeEntry?.status ?? 'unchanged';
    const effectiveStatus: DestuffingContainerChangeStatus = isEditMode
      ? containerStatus
      : selectedHblCount > 0
        ? 'add'
        : 'unchanged';
    const highlightClasses =
      effectiveStatus === 'add'
        ? 'border-blue-400 bg-blue-50/30'
        : effectiveStatus === 'update'
          ? 'border-amber-400 bg-amber-50/40'
          : effectiveStatus === 'remove'
            ? 'border-red-300 bg-red-50/60'
            : 'border-gray-200';

    return (
      <div
        key={container.id}
        className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition ${highlightClasses}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <span
              className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${effectiveStatus === 'add'
                  ? 'bg-blue-100 text-blue-700'
                  : effectiveStatus === 'update'
                    ? 'bg-amber-100 text-amber-700'
                    : effectiveStatus === 'remove'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              aria-hidden="true"
            >
              ●
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {container.containerNo ?? '—'}
                </p>
                {isEditMode ? (
                  containerStatus !== 'unchanged' && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${containerStatus === 'add'
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
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {isSelected ? 'New' : 'Not selected'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {containerType ?? '—'} • Seal: {container.sealNumber ?? '—'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                <p>MBL: {container.mblNumber ?? '—'}</p>
                <p>HBLs: {totalHbls}</p>
                <p>Customs: {container.customsStatus ?? '—'}</p>
                <p>Cargo Release: {container.cargoReleaseStatus ?? '—'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 md:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              HBLs to Destuff
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {selectedHblCount} / {totalHbls} selected
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          {totalHbls === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">No HBLs available for this container.</p>
          ) : (
            <HblSelectorCheckboxList
              hbls={container.hbls ?? []}
              selectedHbls={hblSelections?.[container.id] ?? []}
              onSelectionChange={(selections) => {
                handleHblSelectionChange(container, selections);
              }}
              disabled={actionDisabled}
              error={hblSelectionErrors?.[container.id]?.message}
            />
          )}
          {isEditMode && changeEntry?.diff.length ? (
            <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
              {changeEntry.diff.map((diff) => (
                <li key={`${container.id}-${diff.hblId}`}>
                  {diff.status === 'add' ? 'Adding' : 'Removing'} HBL {diff.hblId.slice(0, 8)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">
              {isEditMode ? 'Edit Destuffing Plan' : 'Create Destuffing Plan'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose a forwarder, scheduling window, and select the containers & HBLs to
              destuff.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close destuffing plan modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 min-h-0 flex-col text-gray-900 dark:text-gray-100">
          <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-6">
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Schedule</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Planned Start (UTC)
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <FormInput
                      name="plannedStart"
                      control={control}
                      type="date"
                      label="Date"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                    <FormInput
                      name="plannedStartTime"
                      control={control}
                      type="time"
                      label="Time"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Planned End (UTC)
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <FormInput
                      name="plannedEnd"
                      control={control}
                      type="date"
                      label="Date"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                    <FormInput
                      name="plannedEndTime"
                      control={control}
                      type="time"
                      label="Time"
                      required
                      disabled={scheduleLocked || actionDisabled}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Forwarder
                  </p>
                  <div className="mt-2">
                    <FormForwarderSingleSelect<DestuffingPlanFormData>
                      name="forwarderId"
                      control={control}
                      placeholder="Select a forwarder…"
                      disabled={actionDisabled || isEditMode}
                      forwarders={forwarders}
                      forwardersLoading={forwardersLoading}
                      required
                    />
                    {isEditMode && initialForwarderLabel ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Forwarder locked to <span className="font-semibold text-gray-700">{initialForwarderLabel}</span>
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

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Containers in Plan</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Filter by forwarder, then select containers and choose which HBLs to
                    destuff.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {selectedCount} selected
                  </span>
                  <div className="relative w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
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
              ) : (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Partial Containers
                    </p>
                    {isLoadingPartialContainers ? (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-300" />
                        Loading partial containers…
                      </div>
                    ) : isPartialContainersError ? (
                      <div className="mt-3 rounded-xl border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
                        {partialContainersError?.message ?? 'Failed to load partial containers.'}
                      </div>
                    ) : partialContainerPool.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                        No partial containers found for this forwarder.
                      </div>
                    ) : filteredPartialContainers.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                        No partial containers match your search.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-4">
                        {filteredPartialContainers.map((container) => renderContainerRow(container))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Unplanned Containers
                    </p>
                    {isLoadingForwarderContainers ? (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-300" />
                        Loading unplanned containers…
                      </div>
                    ) : isForwarderContainersError ? (
                      <div className="mt-3 rounded-xl border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
                        {forwarderContainersError?.message ?? 'Failed to load containers.'}
                      </div>
                    ) : unplannedContainerPool.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                        No unplanned containers found for this forwarder.
                      </div>
                    ) : filteredUnplannedContainers.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
                        No unplanned containers match your search.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-4">
                        {filteredUnplannedContainers.map((container) => renderContainerRow(container))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {containerError && (
                <p className="mt-4 text-sm text-red-600">{containerError}</p>
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
                    !hasAnyHblSelected
                  }
                >
                  {isSavingChanges ? 'Saving…' : 'Save changes'}
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
                  disabled={isSubmitting || !forwarderId || !hasAnyHblSelected}
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
