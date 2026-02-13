import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import ContainerRow from './ContainerRow';
import { containerDefaultValues } from '../schemas/cargo-property-schemas';
import { Plus, Package, ChevronsUpDown } from 'lucide-react';
import type { BookingOrderCreateForm } from '../types';
import type { Forwarder } from '@/features/forwarder/types';
import ContainerPlanModal, { type ContainerPlanData } from './ContainerPlanModal';
import { useUpdateBookingOrderPlan } from '../hooks';
import { containersApi } from '@/services/apiContainers';
import { getLocalTodayAsUtcMidnight } from '@/shared/utils/dateTimeUtils';

interface ContainerTableProps {
  isReadOnly?: boolean;
  formMode?: 'create' | 'edit' | 'view';
  onLoadingStateChange?: (isAnyLoading: boolean) => void;
  forwarders?: Forwarder[];
  onUpdatePlan?: (index: number) => void;
  orderId?: string | null;
  orderStatus?: string | null;
}

export const ContainerTable: React.FC<ContainerTableProps> = ({
  isReadOnly = false,
  formMode = 'create',
  onLoadingStateChange,
  forwarders,
  onUpdatePlan,
  orderId,
  orderStatus,
}) => {
  const {
    control,
    formState: { errors },
    watch,
    setValue,
    setError,
    clearErrors,
  } = useFormContext<BookingOrderCreateForm>();
  const containers = watch('containers');
  const bookingEta = watch('eta');
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [loadingStates, setLoadingStates] = useState<Map<number, boolean>>(new Map());
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planContainerIndex, setPlanContainerIndex] = useState<number | null>(null);
  const [planModalCanEdit, setPlanModalCanEdit] = useState(true);
  const [planActionDisabled, setPlanActionDisabled] = useState<Set<number>>(new Set());
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(null);
  const prevPairsRef = React.useRef<string[]>([]);
  const prevContainerCountRef = React.useRef<number>(containers?.length ?? 0);
  const updateOrderMutation = useUpdateBookingOrderPlan();
  const isOrderDone = orderStatus === 'DONE';
  const duplicatePairMessage = 'Container number and seal number combination must be unique';

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'containers',
  });

  const containerPairKey = (containers || [])
    .map((container: any) => `${container?.containerNo ?? ''}|${container?.sealNumber ?? ''}`)
    .join('||');

  useEffect(() => {
    const list = containers || [];
    const currentPairs = list.map(
      (container: any) => `${container?.containerNo ?? ''}|${container?.sealNumber ?? ''}`,
    );
    const previousPairs = prevPairsRef.current;
    let changedIndex: number | null = null;

    if (previousPairs.length === 0) {
      prevPairsRef.current = currentPairs;
      return;
    }

    const maxLength = Math.max(previousPairs.length, currentPairs.length);
    for (let i = 0; i < maxLength; i += 1) {
      if (previousPairs[i] !== currentPairs[i]) {
        changedIndex = i;
        break;
      }
    }

    prevPairsRef.current = currentPairs;

    if (changedIndex != null) {
      setLastEditedIndex(changedIndex);
    }
  }, [containerPairKey, containers]);

  const duplicateContainerIndexes = useMemo(() => {
    const indexMap = new Map<string, number[]>();

    const pairs = containerPairKey ? containerPairKey.split('||') : [];

    pairs.forEach((pair, index) => {
      const [containerNo, sealNumber] = pair.split('|');
      if (!containerNo || !sealNumber) return;

      const key = pair;
      const indexes = indexMap.get(key) ?? [];
      indexes.push(index);
      indexMap.set(key, indexes);
    });

    const duplicates = new Set<number>();
    indexMap.forEach((indexes) => {
      if (indexes.length > 1) {
        indexes.forEach((idx) => duplicates.add(idx));
      }
    });

    return duplicates;
  }, [containerPairKey]);

  const activeDuplicateIndex = useMemo(() => {
    if (lastEditedIndex == null) return null;
    return duplicateContainerIndexes.has(lastEditedIndex) ? lastEditedIndex : null;
  }, [duplicateContainerIndexes, lastEditedIndex]);

  const resetDerivedFields = useCallback(() => {
    setValue('agentId', '', { shouldDirty: true });
    setValue('agentCode', undefined, { shouldDirty: true });
    setValue('vesselCode', '', { shouldDirty: true });
    setValue('voyage', '', { shouldDirty: true });
    setValue('eta', getLocalTodayAsUtcMidnight(), { shouldDirty: true });
    setValue('pol' as any, null, { shouldDirty: true });
    setValue('pod' as any, null, { shouldDirty: true });
    clearErrors(['containers', 'agentId', 'agentCode', 'vesselCode', 'voyage', 'eta', 'pol', 'pod'] as any);

    setExpandedIndexes(new Set());
    setLastAddedIndex(null);
    setLastEditedIndex(null);
    setLoadingStates(new Map());
    setPlanModalOpen(false);
    setPlanContainerIndex(null);
    setPlanModalCanEdit(true);
    setPlanActionDisabled(new Set());
    prevPairsRef.current = [];
  }, [clearErrors, setValue]);

  useEffect(() => {
    if (isReadOnly) return;
    const pairs = containerPairKey ? containerPairKey.split('||') : [];

    pairs.forEach((_, index) => {
      const basePath = `containers.${index}`;
      const shouldHaveError = activeDuplicateIndex === index;
      const containerError = errors?.containers?.[index]?.containerNo;
      const sealError = errors?.containers?.[index]?.sealNumber;

      if (shouldHaveError) {
        if (!(containerError?.type === 'manual' && containerError?.message === duplicatePairMessage)) {
          setError(`${basePath}.containerNo` as any, {
            type: 'manual',
            message: duplicatePairMessage,
          });
        }
        if (!(sealError?.type === 'manual' && sealError?.message === duplicatePairMessage)) {
          setError(`${basePath}.sealNumber` as any, {
            type: 'manual',
            message: duplicatePairMessage,
          });
        }
        return;
      }

      if (containerError?.type === 'manual' && containerError?.message === duplicatePairMessage) {
        clearErrors(`${basePath}.containerNo` as any);
      }
      if (sealError?.type === 'manual' && sealError?.message === duplicatePairMessage) {
        clearErrors(`${basePath}.sealNumber` as any);
      }
    });
  }, [
    activeDuplicateIndex,
    containerPairKey,
    errors?.containers,
    clearErrors,
    duplicatePairMessage,
    isReadOnly,
    setError,
  ]);

  useEffect(() => {
    if (isReadOnly) return;
    const currentCount = containers?.length ?? 0;
    const previousCount = prevContainerCountRef.current;

    if (previousCount > 0 && currentCount === 0) {
      resetDerivedFields();
    }

    prevContainerCountRef.current = currentCount;
  }, [containers?.length, isReadOnly, resetDerivedFields]);

  const handleAddContainer = () => {
    if (isReadOnly) return;

    const newIndex = fields.length;
    append(containerDefaultValues as any);

    // Expand the newly added container
    setExpandedIndexes(prev => new Set(prev).add(newIndex));

    // Mark as last added for auto-focus
    setLastAddedIndex(newIndex);

    // Auto-scroll to the new container after a short delay
    setTimeout(() => {
      const containerElements = document.querySelectorAll('[data-container-row]');
      const lastContainer = containerElements[containerElements.length - 1];
      if (lastContainer) {
        lastContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    // Clear last added after focus has been set
    setTimeout(() => {
      setLastAddedIndex(null);
    }, 500);
  };

  // Auto-expand containers with validation errors
  useEffect(() => {
    if (errors.containers && Array.isArray(errors.containers)) {
      const indexesWithErrors = errors.containers
        .map((error, index) => (error ? index : -1))
        .filter(index => index !== -1);

      if (indexesWithErrors.length > 0) {
        setExpandedIndexes(prev => {
          const newSet = new Set(prev);
          indexesWithErrors.forEach(index => newSet.add(index));
          return newSet;
        });
      }
    }
  }, [errors.containers]);

  const handleToggleExpand = (index: number) => {
    setExpandedIndexes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleContainerLoadingStateChange = useCallback((index: number, isLoading: boolean) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(index, isLoading);
      return newMap;
    });
  }, []);

  // Notify parent when any container is loading HBLs
  useEffect(() => {
    if (onLoadingStateChange) {
      const isAnyLoading = Array.from(loadingStates.values()).some(loading => loading);
      onLoadingStateChange(isAnyLoading);
    }
  }, [loadingStates, onLoadingStateChange]);

  const activeContainer = useMemo(() => {
    const list = containers || [];
    return planContainerIndex != null ? list[planContainerIndex] : null;
  }, [containers, planContainerIndex]);

  const planCheckKeys = useMemo(
    () =>
      (containers || []).map(
        (container: any) => `${container?.containerNo ?? ''}|${container?.sealNumber ?? ''}`,
      ),
    [containers],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchPlanEditability = async () => {
      const list = containers || [];
      if (list.length === 0) {
        setPlanActionDisabled(new Set());
        return;
      }

      const results = await Promise.all(
        list.map(async (container: any) => {
          if (!container?.containerNo) {
            return false;
          }
          try {
            const response = await containersApi.getByNumber(container.containerNo, { cycle: true });
            const currentCycle = (response?.data as any)?.currentCycle;
            const currentCycleSeal = currentCycle?.sealNumber;
            const hasActiveCycle = Boolean(currentCycle);
            return (
              hasActiveCycle &&
              Boolean(currentCycleSeal) &&
              Boolean(container?.sealNumber) &&
              currentCycleSeal === container.sealNumber
            );
          } catch {
            return false;
          }
        }),
      );

      if (cancelled) return;
      setPlanActionDisabled(() => {
        const next = new Set<number>();
        results.forEach((canEdit, index) => {
          if (!canEdit) next.add(index);
        });
        return next;
      });
    };

    void fetchPlanEditability();
    return () => {
      cancelled = true;
    };
  }, [containers, planCheckKeys]);

  useEffect(() => {
    if (planContainerIndex == null) return;
    setPlanModalCanEdit(!planActionDisabled.has(planContainerIndex) && !isOrderDone);
  }, [planActionDisabled, planContainerIndex, isOrderDone]);

  const handleOpenPlanModal = (index: number) => {
    setPlanContainerIndex(index);
    setPlanModalCanEdit(!planActionDisabled.has(index) && !isOrderDone);
    setPlanModalOpen(true);
    onUpdatePlan?.(index);
  };

  const handleClosePlanModal = () => {
    setPlanModalOpen(false);
    setPlanContainerIndex(null);
  };

  const handleSavePlan = async (payload: ContainerPlanData) => {
    if (planContainerIndex == null) return;
    const basePath = `containers.${planContainerIndex}`;
    const list = containers || [];

    const applyPlanToContainer = (container: any) => {
      const next = { ...container };
      if (payload.eta !== undefined) next.eta = payload.eta ?? null;
      if (payload.cargoReleaseStatus) next.cargoReleaseStatus = payload.cargoReleaseStatus;
      if (payload.extractFrom !== undefined) next.extractFrom = payload.extractFrom ?? null;
      if (payload.extractTo !== undefined) next.extractTo = payload.extractTo ?? null;
      if (payload.containerFile !== undefined) next.containerFile = payload.containerFile ?? null;
      return next;
    };

    const updatedContainers = list.map((container: any, idx: number) =>
      idx === planContainerIndex ? applyPlanToContainer(container) : container,
    );

    if (payload.eta !== undefined) {
      setValue(`${basePath}.eta` as any, payload.eta, { shouldDirty: true });
      setValue('eta', payload.eta ?? '', { shouldDirty: true });
    }
    if (payload.cargoReleaseStatus) {
      setValue(`${basePath}.cargoReleaseStatus`, payload.cargoReleaseStatus, { shouldDirty: true });
    }
    if (payload.extractFrom !== undefined) {
      setValue(`${basePath}.extractFrom`, payload.extractFrom, { shouldDirty: true });
    }
    if (payload.extractTo !== undefined) {
      setValue(`${basePath}.extractTo`, payload.extractTo, { shouldDirty: true });
    }
    setValue('containers', updatedContainers as any, { shouldDirty: true });
    setValue(`${basePath}.containerFile`, payload.containerFile ?? null, { shouldDirty: true });

    if (orderId) {
      const sanitizedContainers = updatedContainers.map((container: any) => ({
        id: container.id,
        containerId: container.containerId,
        isPriority: container.isPriority,
        customsStatus: container.customsStatus,
        customsClearedAt: container.customsClearedAt ?? null,
        cargoReleaseStatus: container.cargoReleaseStatus,
        cargoReleasedAt: container.cargoReleasedAt ?? null,
        extractFrom: container.extractFrom ?? null,
        extractTo: container.extractTo ?? null,
        containerFile: container.containerFile ?? null,
      }));

      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: {
          eta: payload.eta ?? bookingEta ?? undefined,
          containers: sanitizedContainers,
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Containers
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fields.length === 0
              ? 'No containers added yet'
              : `${fields.length} container${fields.length > 1 ? 's' : ''} added`}
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddContainer}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Container
          </button>
        )}
      </div>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-1">
            No containers added yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click "Add Container" to start adding containers to this booking order.
          </p>
          {!isReadOnly && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Draft orders can be saved without containers.
            </p>
          )}
        </div>
      )}

      {/* Container Table */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[auto_1.5fr_0.8fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <ChevronsUpDown className="w-4 h-4 text-gray-400 dark:text-gray-600" />
              #
            </div>
            <div>Container No</div>
            <div>Type</div>
            <div>Seal</div>
            <div>MBL</div>
            <div className="text-center">Priority</div>
            <div className="text-center">Cargo Release</div>
            <div>Yard Free</div>
            <div className="text-center">HBLs</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Container Rows */}
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} data-container-row>
                <ContainerRow
                  index={index}
                  formMode={formMode}
                  onRemove={remove}
                  canRemove={fields.length > 0}
                  isReadOnly={isReadOnly}
                  isExpanded={expandedIndexes.has(index)}
                  onToggleExpand={() => handleToggleExpand(index)}
                  shouldAutoFocus={index === lastAddedIndex}
                  onLoadingStateChange={handleContainerLoadingStateChange}
                  forwarders={forwarders}
                  onUpdatePlan={handleOpenPlanModal}
                  isPlanUpdateDisabled={planActionDisabled.has(index) || isOrderDone}
                  isDuplicatePair={duplicateContainerIndexes.has(index)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <ContainerPlanModal
        isOpen={planModalOpen}
        onClose={handleClosePlanModal}
        container={
          activeContainer
            ? {
                containerId: activeContainer.containerId,
                containerNo: activeContainer.containerNo,
                eta: (activeContainer as any).eta,
                cargoReleaseStatus: activeContainer.cargoReleaseStatus,
                extractFrom: activeContainer.extractFrom,
                extractTo: activeContainer.extractTo,
                containerFile: (activeContainer as any).containerFile ?? null,
              }
            : null
        }
        bookingEta={bookingEta}
        canEdit={planModalCanEdit}
        onSave={handleSavePlan}
      />
    </div>
  );
};

export default ContainerTable;
