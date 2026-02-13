import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toastAdapter } from '@/shared/services';
import {
  usePackingList,
  useCreatePackingList,
  useSavePackingListDraft,
  useSavePackingListPartial,
  useApprovePackingList,
  usePackingListLines,
  usePersistPackingListLineBatch,
} from '../hooks';
import { getErrorMessage } from '../hooks/use-packing-list-lines';
import type {
  PackingListFormValues,
  PackingListLineCreatePayload,
  PackingListLineFormValues,
  PackingListLineUpdatePayload,
  PackingListListItem,
  PackingListModalMode,
  PackingListStatus,
} from '../types';
import { PackingListLinesTable } from './index';
import {
  PackingListAttachmentsSection,
  PackingListHblDetailsCard,
  PackingListSummaryCards,
} from './PackingListFormModalSections';
import {
  PackingListLineDraft,
  SelectedHblMeta,
  areLineValuesEqual,
  convertFormValuesToPayload,
  formDataToPayload,
  generateClientId,
  isTotalField,
  mapDetailToFormValues,
  mapDetailToMeta,
  mapHblToMeta,
  mapResponseToDraft,
  normalizeLineValues,
  statusStyles,
} from '../helpers/packing-list-form-modal.utils';
import {
  PackingListFormSchema,
  packingListDefaultValues,
  packingListLineDefaultValues,
  PackingListLineFormSchema,
  validateApprove,
  validateDraft,
  validatePartial,
} from '../schemas';
import Button from '@/shared/components/ui/Button';
import {
  FormDateInput,
  FormForwarderSingleSelect,
  FormInput,
  FormSingleSelect,
  FormTextarea,
} from '@/shared/components/forms';
import { useUnsavedChanges } from '@/shared/hooks';
import type { Forwarder } from '@/features/forwarder/types';
import { useAllHBLs } from '@/features/hbl-management/hooks/use-hbls-query';

const DIRECTION_FLOW_OPTIONS = [
  { value: 'IMPORT', label: 'Import' },
  { value: 'EXPORT', label: 'Export' },
];

interface PackingListFormModalProps {
  isOpen: boolean;
  mode: PackingListModalMode;
  packingList: PackingListListItem | null;
  onClose: () => void;
  forwarders: Forwarder[];
  forwardersLoading: boolean;
  canWrite: boolean;
}

const PackingListFormModal: React.FC<PackingListFormModalProps> = ({
  isOpen,
  mode,
  packingList,
  onClose,
  forwarders,
  forwardersLoading,
  canWrite,
}) => {
  const packingListId = packingList?.id ?? null;
  const isExisting = Boolean(packingListId);
  const isCreateMode = !isExisting;

  const {
    data: detailData,
    isLoading: detailLoading,
    isFetching: detailFetching,
  } = usePackingList(packingListId ?? '', {
    enabled: isOpen && isExisting,
  });

  const createMutation = useCreatePackingList();
  const saveDraftMutation = useSavePackingListDraft();
  const savePartialMutation = useSavePackingListPartial();
  const approveMutation = useApprovePackingList();
  const persistLineBatchMutation = usePersistPackingListLineBatch();

  // Line management state
  const [lineDrafts, setLineDrafts] = useState<PackingListLineDraft[]>([]);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [allowLineResync, setAllowLineResync] = useState(true);
  const [lineDraftsInitialized, setLineDraftsInitialized] = useState(isCreateMode);
  const initialLineSnapshotRef = useRef<Record<string, PackingListLineFormValues>>({});
  const autoTotalsUpdateRef = useRef(false);
  const manualTotalsRef = useRef({
    numberOfPackages: false,
    weight: false,
    volume: false,
  });

  const methods = useForm<PackingListFormValues>({
    resolver: zodResolver(PackingListFormSchema),
    defaultValues: packingListDefaultValues,
  });

  const {
    control,
    reset,
    getValues,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { isDirty, errors },
  } = methods;

  const {
    data: linesData,
    isLoading: linesLoading,
    refetch: refetchLines,
  } = usePackingListLines(packingListId ?? '', 1, 100, {
    enabled: isOpen && !!packingListId,
  });

  useEffect(() => {
    if (!isOpen || !packingListId || !linesData?.results) {
      return;
    }
    if (!allowLineResync) {
      return;
    }

    const snapshot: Record<string, PackingListLineFormValues> = {};
    const drafts = linesData.results.map((line) => {
      const draft = mapResponseToDraft(line);
      if (draft.persistedId) {
        snapshot[draft.persistedId] = normalizeLineValues(draft);
      }
      return { ...draft, isDirty: false };
    });

    initialLineSnapshotRef.current = snapshot;
    setLineDrafts(drafts);
    setDeletedLineIds([]);
    setLineError(null);
    setExpandedLineId(null);
    setLineDraftsInitialized(true);
    setAllowLineResync(false);
  }, [allowLineResync, isOpen, linesData?.results, packingListId]);

  const lineTotals = useMemo(() => {
    const toNumber = (value: number | null | undefined) =>
      typeof value === 'number' && !Number.isNaN(value) ? value : 0;

    return lineDrafts.reduce(
      (totals, line) => ({
        numberOfPackages: totals.numberOfPackages + toNumber(line.numberOfPackages),
        weight: totals.weight + toNumber(line.grossWeightKg),
        volume: totals.volume + toNumber(line.volumeM3),
      }),
      { numberOfPackages: 0, weight: 0, volume: 0 },
    );
  }, [lineDrafts]);

  useEffect(() => {
    if (!isOpen || !lineDraftsInitialized) {
      return;
    }

    autoTotalsUpdateRef.current = true;
    try {
      if (!manualTotalsRef.current.numberOfPackages) {
        setValue('numberOfPackages', lineTotals.numberOfPackages, {
          shouldDirty: false,
        });
      }
      if (!manualTotalsRef.current.weight) {
        setValue('weight', lineTotals.weight, { shouldDirty: false });
      }
      if (!manualTotalsRef.current.volume) {
        setValue('volume', lineTotals.volume, { shouldDirty: false });
      }
    } finally {
      autoTotalsUpdateRef.current = false;
    }
  }, [isOpen, lineDraftsInitialized, lineTotals, setValue]);

  useEffect(() => {
    const pureLines = lineDrafts.map(({ clientId: _clientId, persistedId: _persistedId, isDirty: _isDirty, ...values }) =>
      normalizeLineValues(values),
    );
    setValue('cargoLines', pureLines, { shouldDirty: false });
  }, [lineDrafts, setValue]);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (!name) return;
      if (isTotalField(name) && !autoTotalsUpdateRef.current) {
        manualTotalsRef.current[name] = true;
      }

      if (name === 'numberOfPackages') {
        const rawValue = values?.numberOfPackages;
        if (typeof rawValue === 'number') {
          const normalized = rawValue < 0 ? 0 : Math.round(rawValue);
          if (normalized !== rawValue) {
            setValue('numberOfPackages', normalized, { shouldDirty: true });
          }
        }
      }

      if (name === 'weight' || name === 'volume') {
        const rawValue = values?.[name];
        if (typeof rawValue === 'number' && rawValue < 0) {
          setValue(name, 0, { shouldDirty: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setValue, watch]);

  const [hblMeta, setHblMeta] = useState<SelectedHblMeta | null>(null);
  const hblQueryParams = useMemo(
    () => ({
      status: 'approved',
      hasPackingList: false,
    }),
    [],
  );

  const {
    data: availableHbls = [],
    isLoading: isLoadingHbls,
    isFetching: isFetchingHbls,
    refetch: refetchHbls,
  } = useAllHBLs(hblQueryParams);
  const hblsLoading = isLoadingHbls || isFetchingHbls;

  const currentStatus: PackingListStatus =
    detailData?.status ?? packingList?.status ?? 'DRAFT';
  const isReadOnly =
    !canWrite ||
    mode === 'view' ||
    currentStatus === 'APPROVED' ||
    currentStatus === 'DONE';
  const canSaveDraft =
    canWrite && !isReadOnly && (!isExisting || currentStatus === 'DRAFT');
  const canSavePartial =
    canWrite &&
    !isReadOnly &&
    isExisting &&
    (currentStatus === 'DRAFT' || currentStatus === 'PARTIAL');
  const canApprove =
    canWrite && mode === 'view' && !!packingListId;
  const canModifyLines =
    canWrite &&
    !isReadOnly &&
    (isCreateMode ||
      currentStatus === 'DRAFT' ||
      currentStatus === 'PARTIAL');

  const isMutating =
    createMutation.isPending ||
    saveDraftMutation.isPending ||
    savePartialMutation.isPending ||
    approveMutation.isPending ||
    persistLineBatchMutation.isPending;

  const hasUnsavedLineChanges = useMemo(
    () =>
      deletedLineIds.length > 0 ||
      lineDrafts.some((line) => !line.persistedId || line.isDirty),
    [deletedLineIds, lineDrafts],
  );

  const { handleClose } = useUnsavedChanges({
    isDirty: isDirty || hasUnsavedLineChanges,
    isSubmitting: isMutating,
    isReadOnly,
    onClose,
    reset: () => reset(packingListDefaultValues),
  });

  const selectedHblId = watch('hblId');
  const effectiveHblId =
    selectedHblId ??
    detailData?.hblData?.id ??
    packingList?.hblData?.id ??
    null;
  const documentOwnerId = packingListId ?? effectiveHblId ?? undefined;
  const documentMetadataBase = useMemo(() => {
    const metadata: Record<string, string> = {
      context: 'packing-list',
    };
    if (packingListId) {
      metadata.packingListId = packingListId;
    }
    if (effectiveHblId) {
      metadata.hblId = effectiveHblId;
    }
    return metadata;
  }, [packingListId, effectiveHblId]);
  const workDocumentMetadata = useMemo(
    () => ({ ...documentMetadataBase, variant: 'work' as const }),
    [documentMetadataBase],
  );
  const officialDocumentMetadata = useMemo(
    () => ({ ...documentMetadataBase, variant: 'official' as const }),
    [documentMetadataBase],
  );

  const workPackingListFile = watch('workPackingListFile');
  const officialPackingListFile = watch('officialPackingListFile');

  const baseHblOptions = useMemo(
    () =>
      availableHbls.map((hbl) => ({
        value: hbl.id,
        label: `${hbl.code} • ${hbl.consignee}`,
      })),
    [availableHbls],
  );

  const persistedHblOption = useMemo(() => {
    const hblData = detailData?.hblData;
    if (!hblData?.id || !hblData?.hblCode) {
      return undefined;
    }
    return {
      value: hblData.id,
      label: `${hblData.hblCode} • ${hblData.consignee ?? 'N/A'}`,
    };
  }, [detailData]);

  const hblOptions = useMemo(() => {
    if (!persistedHblOption) {
      return baseHblOptions;
    }
    const exists = baseHblOptions.some(
      (option) => option.value === persistedHblOption.value,
    );
    return exists ? baseHblOptions : [persistedHblOption, ...baseHblOptions];
  }, [baseHblOptions, persistedHblOption]);

  const forwardersWithPersisted = useMemo(() => {
    const id = detailData?.forwarderId ?? packingList?.forwarderId;
    if (!id) return forwarders;

    const exists = forwarders.some((f) => f.id === id);
    if (exists) return forwarders;

    const name =
      detailData?.hblData?.forwarderName ||
      packingList?.hblData?.forwarderName ||
      `Forwarder ${id.slice(0, 8)}`;
    const persistedForwarder = { id, name } as Forwarder;

    return [persistedForwarder, ...forwarders];
  }, [forwarders, detailData, packingList]);

  useEffect(() => {
    setFormError(null);
    setLineError(null);
    clearErrors();

    if (!isOpen) {
      reset(packingListDefaultValues);
      setHblMeta(null);
      setLineDrafts([]);
      setDeletedLineIds([]);
      setAllowLineResync(true);
      setLineDraftsInitialized(isCreateMode);
      initialLineSnapshotRef.current = {};
      manualTotalsRef.current = {
        numberOfPackages: false,
        weight: false,
        volume: false,
      };
      return;
    }

    if (!isExisting) {
      reset(packingListDefaultValues);
      setHblMeta(null);
      setLineDrafts([]);
      setDeletedLineIds([]);
      setLineError(null);
      setFormError(null);
      clearErrors();
      setAllowLineResync(true);
      setLineDraftsInitialized(true);
      initialLineSnapshotRef.current = {};
      manualTotalsRef.current = {
        numberOfPackages: false,
        weight: false,
        volume: false,
      };
      return;
    }

    if (detailLoading) {
      return;
    }

    if (detailData) {
      reset(mapDetailToFormValues(detailData, packingList?.directionFlow ?? null));
      setHblMeta(mapDetailToMeta(detailData, forwarders));
    }
  }, [
    clearErrors,
    isOpen,
    isExisting,
    detailLoading,
    detailData,
    reset,
    isCreateMode,
    packingList,
    forwarders,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedHblId) {
      if (!isExisting) {
        setHblMeta(null);
      }
      return;
    }

    const matchingHbl = availableHbls.find((hbl) => hbl.id === selectedHblId);
    if (matchingHbl) {
      const meta = mapHblToMeta(matchingHbl, forwarders);
      setHblMeta(meta);
      if (meta.forwarderId) {
        setValue('forwarderId', meta.forwarderId, { shouldDirty: true });
      }
    }
  }, [
    isOpen,
    selectedHblId,
    availableHbls,
    forwarders,
    setValue,
    isExisting,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    void refetchHbls();
  }, [isOpen, mode, refetchHbls]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isCreateMode) {
      return;
    }
    setLineDraftsInitialized(true);
  }, [isOpen, isCreateMode]);

  const applyFieldErrors = (
    fieldErrors?: Record<keyof PackingListFormValues | '_root', string>,
  ) => {
    clearErrors();
    setFormError(null);
    if (!fieldErrors) return;

    Object.entries(fieldErrors).forEach(([key, message]) => {
      if (!message) return;
      if (key === '_root') {
        setFormError(message);
      } else {
        setError(key as keyof PackingListFormValues, {
          type: 'manual',
          message,
        });
      }
    });
  };

  const validateLineDrafts = () => {
    setLineError(null);
    for (let index = 0; index < lineDrafts.length; index += 1) {
      const draft = lineDrafts[index];
      const { clientId, persistedId: _persistedId, ...values } = draft;
      const normalizedValues = normalizeLineValues(values);
      const result = PackingListLineFormSchema.safeParse(normalizedValues);
      if (!result.success) {
        const issue = result.error.issues[0];
        setLineError(
          issue?.message
            ? `Fix errors in package line ${index + 1}: ${issue.message}`
            : `Fix errors in package line ${index + 1}`,
        );
        setExpandedLineId(clientId);
        return false;
      }
    }
    return true;
  };

  const buildLineDiffs = () => {
    const toCreate: PackingListLineCreatePayload[] = [];
    const toUpdate: Array<{ lineId: string; payload: PackingListLineUpdatePayload }> = [];
    const snapshot = initialLineSnapshotRef.current;

    lineDrafts.forEach((line) => {
      if (!line.persistedId) {
        toCreate.push(convertFormValuesToPayload(line));
        return;
      }

      if (!line.isDirty) {
        return;
      }

      const baseline = snapshot[line.persistedId];
      if (baseline && areLineValuesEqual(line, baseline)) {
        return;
      }

      toUpdate.push({
        lineId: line.persistedId,
        payload: convertFormValuesToPayload(line),
      });
    });

    return {
      toCreate,
      toUpdate,
      toDelete: deletedLineIds,
    };
  };

  const persistLineChangesIfNeeded = async () => {
    if (!canWrite) return false;
    if (!packingListId) {
      return false;
    }
    const diffs = buildLineDiffs();
    const hasChanges =
      diffs.toCreate.length > 0 ||
      diffs.toUpdate.length > 0 ||
      diffs.toDelete.length > 0;
    if (!hasChanges) {
      return false;
    }

    await persistLineBatchMutation.mutateAsync({
      packingListId,
      ...diffs,
    });
    setAllowLineResync(true);
    await refetchLines();
    return true;
  };

  const showLinePersistenceError = (error: unknown) => {
    const message =
      getErrorMessage(error) || 'Failed to save line changes. Please try again.';
    setFormError(message);
    toast.error(message);
  };

  const closeAndReset = () => {
    reset(packingListDefaultValues);
    setHblMeta(null);
    setLineDrafts([]);
    setExpandedLineId(null);
    setFormError(null);
    setLineError(null);
    setDeletedLineIds([]);
    setAllowLineResync(true);
    setLineDraftsInitialized(isCreateMode);
    initialLineSnapshotRef.current = {};
    manualTotalsRef.current = {
      numberOfPackages: false,
      weight: false,
      volume: false,
    };
    onClose();
  };

  const handleSaveDraft = async () => {
    setFormError(null);
    const values = getValues();
    const validation = validateDraft(values);
    if (!validation.valid || !validation.data) {
      applyFieldErrors(validation.fieldErrors);
      return;
    }

    if (!validateLineDrafts()) {
      return;
    }

    setFormError(null);
    setLineError(null);

    // Convert unsaved lines to payload format (create mode only)
    const linesPayload = isCreateMode
      ? lineDrafts.map(convertFormValuesToPayload)
      : undefined;
    const payload = formDataToPayload(
      validation.data,
      linesPayload && linesPayload.length > 0 ? linesPayload : undefined,
    );

    if (!canWrite) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }

    if (!packingListId) {
      try {
        await createMutation.mutateAsync(payload);
        closeAndReset();
      } catch (error) {
        console.error('Failed to save draft', error);
        setFormError(getErrorMessage(error));
      }
      return;
    }

    try {
      await saveDraftMutation.mutateAsync({
        id: packingListId,
        payload,
      });
    } catch (error) {
      console.error('Failed to save draft', error);
      setFormError(getErrorMessage(error));
      return;
    }

    try {
      await persistLineChangesIfNeeded();
      closeAndReset();
    } catch (error) {
      console.error('Failed to persist line changes', error);
      showLinePersistenceError(error);
    }
  };

  const handleSavePartial = async () => {
    setFormError(null);
    if (!packingListId) {
      setFormError('Cannot save as partial without a packing list ID.');
      return;
    }
    if (!canWrite) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }

    const values = getValues();

    const hasLines = lineDrafts.length > 0;
    if (!hasLines) {
      setLineError('At least one package line is required to save as partial.');
      return;
    }

    const validation = validatePartial(values);
    if (!validation.valid || !validation.data) {
      applyFieldErrors(validation.fieldErrors);
      return;
    }

    if (!validateLineDrafts()) {
      return;
    }

    setFormError(null);
    setLineError(null);

    const hasPersistedLines = lineDrafts.some((line) => Boolean(line.persistedId));
    if (!hasPersistedLines) {
      try {
        await persistLineChangesIfNeeded();
      } catch (error) {
        console.error('Failed to persist line changes before save as partial', error);
        showLinePersistenceError(error);
        return;
      }
    }

    const payload = formDataToPayload(validation.data);

    try {
      await savePartialMutation.mutateAsync({
        id: packingListId,
        payload,
      });
    } catch (error) {
      console.error('Failed to save as partial', error);
      setFormError(getErrorMessage(error));
      return;
    }

    try {
      await persistLineChangesIfNeeded();
      closeAndReset();
    } catch (error) {
      console.error('Failed to persist line changes', error);
      showLinePersistenceError(error);
    }
  };

  const handleApprove = async () => {
    setFormError(null);
    if (!packingListId) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    const values = getValues();
    const validation = validateApprove(values);
    if (!validation.valid || !validation.data) {
      applyFieldErrors(validation.fieldErrors);
      return;
    }

    if (!validateLineDrafts()) {
      return;
    }

    try {
      await persistLineChangesIfNeeded();
    } catch (error) {
      console.error('Failed to persist line changes', error);
      showLinePersistenceError(error);
      return;
    }

    try {
      await approveMutation.mutateAsync(packingListId);
      closeAndReset();
    } catch (error) {
      console.error('Failed to approve packing list', error);
      setFormError(getErrorMessage(error));
    }
  };

  const handleAddLine = () => {
    if (!canModifyLines) {
      return;
    }

    const newLine: PackingListLineDraft = {
      ...packingListLineDefaultValues,
      clientId: generateClientId(),
      persistedId: undefined,
      isDirty: true,
    };
    setLineDrafts((prev) => [newLine, ...prev]);
    setExpandedLineId(newLine.clientId);
    setLineError(null);
    setFormError(null);
    setAllowLineResync(false);
  };

  const handleUpdateLine = (
    clientId: string,
    field: keyof PackingListLineFormValues,
    value: PackingListLineFormValues[typeof field],
  ) => {
    setLineDrafts((prev) =>
      prev.map((line) => {
        if (line.clientId !== clientId) {
          return line;
        }

        const updatedLine: PackingListLineDraft = {
          ...line,
          [field]: value,
        };
        if (updatedLine.persistedId) {
          const baseline = initialLineSnapshotRef.current[updatedLine.persistedId];
          updatedLine.isDirty = baseline
            ? !areLineValuesEqual(updatedLine, baseline)
            : true;
        } else {
          updatedLine.isDirty = true;
        }
        return updatedLine;
      }),
    );
    setLineError(null);
    setFormError(null);
    setAllowLineResync(false);
  };

  const handleDeleteLine = async (clientId: string) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    const confirmed = await toastAdapter.confirm('Remove this cargo line?', {
      intent: 'danger',
    });
    if (!confirmed) {
      return;
    }
    const target = lineDrafts.find((line) => line.clientId === clientId);
    setLineDrafts((prev) => prev.filter((line) => line.clientId !== clientId));
    setExpandedLineId((current) => (current === clientId ? null : current));
    if (target?.persistedId) {
      setDeletedLineIds((prev) =>
        prev.includes(target.persistedId!) ? prev : [...prev, target.persistedId!],
      );
    }
    setLineError(null);
    setFormError(null);
    setAllowLineResync(false);
  };

  if (!isOpen) {
    return null;
  }

  const statusConfig = statusStyles[currentStatus];
  const isDetailLoading = isExisting && (detailLoading || detailFetching);
  const isLinesLoading = Boolean(packingListId) && linesLoading;
  const hasValidationErrors = Object.keys(errors).length > 0;
  const globalErrorMessage =
    formError ||
    lineError ||
    (hasValidationErrors
      ? 'Please fix the errors above before submitting.'
      : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/80">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'view'
                ? 'Cargo list Details'
                : mode === 'edit'
                  ? 'Edit Cargo list'
                  : 'Create Cargo list'}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleClose()}
              className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <FormProvider {...methods}>
          <form
            className="relative max-h-[75vh] overflow-y-auto px-6 py-6"
            onSubmit={(event) => event.preventDefault()}
          >
            {isDetailLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 dark:bg-gray-900/80">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}

            <PackingListHblDetailsCard hblMeta={hblMeta} />

            <div className="grid gap-4 md:grid-cols-3">
              <FormSingleSelect<PackingListFormValues>
                name="hblId"
                control={control}
                label="HBL Number"
                options={hblOptions}
                placeholder={
                  hblsLoading ? 'Loading HBLs...' : 'Select an HBL'
                }
                disabled={isReadOnly || currentStatus !== 'DRAFT'}
              />
              <FormInput<PackingListFormValues>
                name="packingListNumber"
                control={control}
                label="Cargo list Number"
                placeholder="Enter packing list number"
                disabled={isReadOnly}
              />
              <FormInput<PackingListFormValues>
                name="mbl"
                control={control}
                label="MBL Number"
                placeholder="Enter MBL number"
                disabled={isReadOnly}
              />
              <FormSingleSelect<PackingListFormValues>
                name="directionFlow"
                control={control}
                label="Direction Flow"
                options={DIRECTION_FLOW_OPTIONS}
                placeholder="Select direction flow"
                disabled={isReadOnly}
                className="md:row-start-2 md:col-start-1"
              />
              <FormForwarderSingleSelect<PackingListFormValues>
                name="forwarderId"
                control={control}
                label="Forwarder"
                placeholder="Select forwarder"
                disabled={isReadOnly}
                forwarders={forwardersWithPersisted}
                forwardersLoading={forwardersLoading}
                className="md:row-start-2 md:col-start-2 md:col-span-2"
              />
              <div className="md:col-span-4 grid gap-4 md:grid-cols-5">
                <FormDateInput<PackingListFormValues>
                  name="eta"
                  control={control}
                  label="ETA"
                  disabled={isReadOnly}
                />
                <FormDateInput<PackingListFormValues>
                  name="ata"
                  control={control}
                  label="ATA"
                  disabled={isReadOnly}
                />
                <FormInput<PackingListFormValues>
                  name="numberOfPackages"
                  control={control}
                  label="Package Count (Total)"
                  type="number"
                  placeholder="Enter or calculate total packages"
                  disabled={isReadOnly}
                  min={0}
                  step={1}
                />
                <FormInput<PackingListFormValues>
                  name="weight"
                  control={control}
                  label="Weight (kg)"
                  type="number"
                  step="0.01"
                  placeholder="Enter or calculate weight"
                  disabled={isReadOnly}
                  min={0}
                />
                <FormInput<PackingListFormValues>
                  name="volume"
                  control={control}
                  label="Volume (m³)"
                  type="number"
                  step="0.001"
                  placeholder="Enter or calculate volume"
                  disabled={isReadOnly}
                  min={0}
                />
              </div>
              <FormTextarea<PackingListFormValues>
                name="note"
                control={control}
                label="Note"
                placeholder="Enter notes"
                disabled={isReadOnly}
                className="md:col-span-4"
              />
              <PackingListAttachmentsSection
                documentOwnerId={documentOwnerId}
                workDocumentMetadata={workDocumentMetadata}
                officialDocumentMetadata={officialDocumentMetadata}
                workPackingListFile={workPackingListFile}
                officialPackingListFile={officialPackingListFile}
                isReadOnly={isReadOnly}
                onWorkUploadSuccess={(document) => {
                  setValue(
                    'workPackingListFile',
                    {
                      id: document.id,
                      name: document.name,
                      mimeType: document.fileType || 'application/pdf',
                    },
                    { shouldDirty: true },
                  );
                }}
                onWorkRemove={() =>
                  setValue('workPackingListFile', null, { shouldDirty: true })
                }
                onOfficialUploadSuccess={(document) => {
                  setValue(
                    'officialPackingListFile',
                    {
                      id: document.id,
                      name: document.name,
                      mimeType: document.fileType || 'application/pdf',
                    },
                    { shouldDirty: true },
                  );
                }}
                onOfficialRemove={() =>
                  setValue('officialPackingListFile', null, { shouldDirty: true })
                }
              />
            </div>

            {/* Summary Statistics */}
            <PackingListSummaryCards lineTotals={lineTotals} />

            {/* Package Lines Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <PackingListLinesTable
                lines={lineDrafts}
                loading={isLinesLoading}
                packingListStatus={currentStatus}
                isEditable={canModifyLines}
                inlineEditable={canModifyLines}
                onAdd={handleAddLine}
                onDelete={handleDeleteLine}
                onLineChange={canModifyLines ? handleUpdateLine : undefined}
                expandedLineId={expandedLineId}
                onExpandedChange={setExpandedLineId}
                hasUnsavedChanges={hasUnsavedLineChanges}
              />
            </div>
          </form>
        </FormProvider>

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between dark:border-gray-700 dark:bg-gray-800/80">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'create'
              ? 'Fill in details then choose Save Draft or Save Partial to persist.'
              : isReadOnly
                ? 'This packing list is read-only.'
                : 'Update fields then choose the desired action.'}
          </div>
          <div className="flex flex-col-reverse gap-3 md:flex-row">
            {canSaveDraft && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveDraft()}
                loading={createMutation.isPending || saveDraftMutation.isPending}
              >
                Save Draft
              </Button>
            )}
            {canSavePartial && (
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSavePartial()}
                loading={savePartialMutation.isPending}
              >
                Save as Partial
              </Button>
            )}
            {canApprove && (
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleApprove()}
                loading={approveMutation.isPending}
              >
                Approve
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleClose()}
              disabled={isMutating}
            >
              Close
            </Button>
          </div>
        </div>
        {globalErrorMessage && (
          <div
            className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 whitespace-pre-wrap break-words dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
            role="alert"
            aria-live="polite"
          >
            {globalErrorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingListFormModal;
