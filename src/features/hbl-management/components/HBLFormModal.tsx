import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Save, X } from 'lucide-react';
import {
  HBLUpdateSchema,
  HBLApprovalSchema,
  getHblDefaultValues,
  HblCargoLineFormSchema,
  hblCargoLineDefaultValues,
} from '../schemas';
import type {
  HouseBill,
  HBLCreateForm,
  HBLUpdateForm,
  HblPackingListLinePayload,
  HblPackingListLineFormValues,
  HblPackingListLineResponseDto,
} from '../types';
import {
  areLineValuesEqual,
  convertFormValuesToPayload,
  generateClientId,
  mapResponseToDraft,
  normalizeLineValues,
  type HblPackingListLineDraft,
} from '../helpers/hbl-cargo-lines.utils';
import {
  FormInput,
  FormDateInput,
  FormForwarderSingleSelect,
  FormTextarea,
} from '@/shared/components/forms';
import { ContainerNumberPicker } from '@/features/containers/components/ContainerNumberPicker';
import Button from '@/shared/components/ui/Button';
import { toastAdapter } from '@/shared/services/toast';
import toast from 'react-hot-toast';
import { DocumentUploader } from '@/features/document-service/components/DocumentUploader';
import { useDocumentDownload } from '@/features/document-service';
import type { Document } from '@/features/document-service/types';
import { packingListsApi } from '@/services/apiPackingLists';
import { HBLCargoLinesTable } from './HBLCargoLinesTable';
import { HBLCargoSummaryCards } from './HBLFormModalSections';

type HblFormValues = Omit<HBLCreateForm, 'shippingDetail' | 'packingListLines'> & {
  eta?: string;
};

type HblStatusChip = 'draft' | 'approved' | 'done';

const hblStatusStyles: Record<HblStatusChip, { label: string; className: string }> =
{
  draft: {
    label: 'Draft',
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
  done: {
    label: 'Done',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  },
};

const resolveHblStatus = (status?: HouseBill['status']): HblStatusChip => {
  if (status === 'approved') return 'approved';
  if (status === 'done') return 'done';
  return 'draft';
};

const buildHblFormValues = (houseBill?: HouseBill | null): HblFormValues => {
  if (!houseBill) {
    // getHblDefaultValues returns a fresh instance each call to avoid shared references
    return getHblDefaultValues();
  }

  return {
    code: houseBill.code || '',
    receivedAt: houseBill.receivedAt || '',
    mbl: houseBill.mbl || '',
    eta: houseBill.shippingDetail?.eta || houseBill.eta || '',
    document: houseBill.document || null,
    issuerId: houseBill.issuerId || '',
    shipper: houseBill.shipper || '',
    consignee: houseBill.consignee || '',
    notifyParty: houseBill.notifyParty || '',
    vesselName: houseBill.vesselName || '',
    voyageNumber: houseBill.voyageNumber || '',
    pol: houseBill.pol || '',
    pod: houseBill.pod || '',
    containers: houseBill.containers?.map(container => ({ ...container })) || [],
  };
};

interface HBLFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  hbl?: HouseBill | null;
  onSave: (
    data: HBLCreateForm | (HBLUpdateForm & { id: string }),
  ) => Promise<void>;
  onApprove?: (id: string) => Promise<void>;
  canWrite?: boolean;
}

export const HBLFormModal: React.FC<HBLFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  hbl,
  onSave,
  onApprove,
  canWrite = true,
}) => {
  const isEdit = mode === 'edit';
  const isView = mode === 'view' || !canWrite;
  const isApproved = hbl?.status === 'approved';
  const isReadOnly = isView || isApproved;
  const isViewMode = mode === 'view';
  const packingListStatus = hbl?.packingList?.status?.toUpperCase() ?? null;
  const canModifyLines =
    !isReadOnly && (!packingListStatus || ['DRAFT', 'PARTIAL'].includes(packingListStatus));
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const statusConfig = hblStatusStyles[resolveHblStatus(hbl?.status)];

  const schema = useMemo(
    () => (isReadOnly ? HBLUpdateSchema.partial() : HBLApprovalSchema),
    [isReadOnly],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HblFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildHblFormValues(isEdit || isView ? hbl : null),
  });

  const packingListId = hbl?.packingList?.id ?? hbl?.packingListId ?? null;
  const [lineDrafts, setLineDrafts] = useState<HblPackingListLineDraft[]>([]);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [allowLineResync, setAllowLineResync] = useState(true);
  const [lineDraftsInitialized, setLineDraftsInitialized] = useState(false);
  const initialLineSnapshotRef = useRef<Record<string, HblPackingListLineFormValues>>({});

  const {
    data: linesData,
    isLoading: isLinesLoading,
    refetch: refetchLines,
  } = useQuery({
    queryKey: ['hbl', 'packing-list-lines', packingListId],
    queryFn: async () => {
      if (!packingListId) {
        return { results: [], total: 0 };
      }
      const response = await packingListsApi.lines.getAll(packingListId, 1, 100);
      return response.data;
    },
    enabled: isOpen && !!packingListId,
  });

  useEffect(() => {
    if (!isOpen) {
      setLineDrafts([]);
      setDeletedLineIds([]);
      setExpandedLineId(null);
      setLineError(null);
      setAllowLineResync(true);
      setLineDraftsInitialized(false);
      initialLineSnapshotRef.current = {};
      return;
    }

    if (!packingListId) {
      setLineDrafts([]);
      setDeletedLineIds([]);
      setExpandedLineId(null);
      setLineError(null);
      setAllowLineResync(true);
      setLineDraftsInitialized(true);
      initialLineSnapshotRef.current = {};
    }
  }, [isOpen, packingListId]);

  useEffect(() => {
    if (isOpen && packingListId) {
      setAllowLineResync(true);
    }
  }, [isOpen, packingListId]);

  useEffect(() => {
    if (!isOpen || !packingListId || !linesData?.results) {
      return;
    }
    if (!allowLineResync) {
      return;
    }

    const snapshot: Record<string, HblPackingListLineFormValues> = {};
    const drafts = (linesData.results as HblPackingListLineResponseDto[]).map((line) => {
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

  const hasUnsavedLineChanges = useMemo(
    () =>
      deletedLineIds.length > 0 ||
      lineDrafts.some((line) => !line.persistedId || line.isDirty),
    [deletedLineIds, lineDrafts],
  );

  // Document upload hooks
  const documentDownload = useDocumentDownload();
  const documentFile = watch('document');

  const documentOwnerId = hbl?.id ?? undefined;
  const documentMetadata = useMemo(() => ({
    context: 'hbl',
    ...(hbl?.id && { hblId: hbl.id }),
  }), [hbl?.id]);

  const hasValidationErrors = Object.keys(errors).length > 0;
  const containerFieldErrors = errors.containers as unknown as Array<Record<string, any>> | undefined;
  const containerNumberError = containerFieldErrors?.[0]?.containerNumber?.message as string | undefined;
  const globalErrorMessage =
    formErrorMessage ||
    lineError ||
    (hasValidationErrors
      ? 'Please fix the errors above before submitting.'
      : null);

  const handleInvalidSubmit = () => {
    setFormErrorMessage(null);
    setLineError(null);
  };

  const validateLineDrafts = () => {
    setLineError(null);
    for (let index = 0; index < lineDrafts.length; index += 1) {
      const draft = lineDrafts[index];
      const { clientId: _clientId, persistedId: _persistedId, isDirty: _isDirty, ...values } = draft;
      const normalizedValues = normalizeLineValues(values);
      const result = HblCargoLineFormSchema.safeParse(normalizedValues);
      if (!result.success) {
        const issue = result.error.issues[0];
        setLineError(
          issue?.message
            ? `Fix errors in cargo line ${index + 1}: ${issue.message}`
            : `Fix errors in cargo line ${index + 1}`,
        );
        setExpandedLineId(draft.clientId);
        return false;
      }
    }
    return true;
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  };

  const buildLineDiffs = () => {
    const toCreate: HblPackingListLinePayload[] = [];
    const toUpdate: Array<{ lineId: string; payload: HblPackingListLinePayload }> =
      [];
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

    for (const lineId of diffs.toDelete) {
      try {
        await packingListsApi.lines.delete(lineId);
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    }

    for (const { lineId, payload } of diffs.toUpdate) {
      try {
        await packingListsApi.lines.update(lineId, payload);
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    }

    for (const payload of diffs.toCreate) {
      try {
        await packingListsApi.lines.create(packingListId, payload);
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    }

    setAllowLineResync(true);
    await refetchLines();
    return true;
  };

  const handleAddLine = () => {
    if (!canModifyLines) {
      return;
    }

    const newLine: HblPackingListLineDraft = {
      ...hblCargoLineDefaultValues,
      clientId: generateClientId(),
      persistedId: undefined,
      isDirty: true,
    };
    setLineDrafts((prev) => [newLine, ...prev]);
    setExpandedLineId(newLine.clientId);
    setLineError(null);
    setAllowLineResync(false);
  };

  const handleUpdateLine = (
    clientId: string,
    field: keyof HblPackingListLineFormValues,
    value: HblPackingListLineFormValues[typeof field],
  ) => {
    setLineDrafts((prev) =>
      prev.map((line) => {
        if (line.clientId !== clientId) {
          return line;
        }

        const updatedLine: HblPackingListLineDraft = {
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
    setAllowLineResync(false);
  };

  const handleDeleteLine = async (clientId: string) => {
    if (!canModifyLines) {
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
    setAllowLineResync(false);
  };

  // Reset form when modal opens/closes or mode/hbl changes
  useEffect(() => {
    if (isOpen) {
      const initialValues = buildHblFormValues((isEdit || isView) && hbl ? hbl : null);
      reset(initialValues);
      setFormErrorMessage(null);
    }
  }, [isOpen, isEdit, isView, hbl, reset]);

  const onSubmit = async (data: HblFormValues) => {
    try {
      setFormErrorMessage(null);
      if (!validateLineDrafts()) {
        return;
      }
      const {
        eta,
        shipper,
        consignee,
        notifyParty,
        vesselName,
        voyageNumber,
        pol,
        pod,
        mbl,
        directionFlow,
        ...rest
      } = data;
      // Remove containerId from containers array (backend doesn't expect it)
      const shouldIncludeCreateLines = lineDraftsInitialized && lineDrafts.length > 0;
      const shouldSyncEditLines = lineDraftsInitialized && hasUnsavedLineChanges;
      const shippingDetail = eta
        ? {
            eta,
            shipper,
            consignee,
            notifyParty,
            vesselName,
            voyageNumber,
            pol,
            pod,
            mbl,
            directionFlow,
          }
        : undefined;

      const cleanedData = {
        ...rest,
        containers:
          rest.containers?.map(({ containerId: _containerId, ...container }) => container) || [],
        ...(isEdit || isView
          ? shippingDetail
            ? {}
            : {
                shipper,
                consignee,
                notifyParty,
                vesselName,
                voyageNumber,
                pol,
                pod,
                mbl,
                directionFlow,
              }
          : {
              shipper,
              consignee,
              notifyParty,
              vesselName,
              voyageNumber,
              pol,
              pod,
              mbl,
              directionFlow,
            }),
        shippingDetail,
        packingListLines: shouldIncludeCreateLines
          ? lineDrafts.map(convertFormValuesToPayload)
          : undefined,
      };

      if ((isEdit || isView) && hbl) {
        const { packingListLines: _packingListLines, ...updatePayload } = cleanedData;
        await onSave({ ...updatePayload, id: hbl.id } as HBLUpdateForm & { id: string });
        if (shouldSyncEditLines) {
          if (!packingListId) {
            setFormErrorMessage(
              'HBL header saved, but cargo line changes could not be synced because packing list is missing.',
            );
            return;
          }
          await persistLineChangesIfNeeded();
        }
      } else {
        await onSave(cleanedData as HBLCreateForm);
      }
      onClose();
    } catch (error) {
      console.error('Error saving HBL:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Failed to save HBL. Please try again.';
      setFormErrorMessage(message);
      if (typeof message === 'string' && message.toLowerCase().includes('container')) {
        setError('containers.0.containerNumber', {
          type: 'server',
          message,
        });
      }
    }
  };

  const handleApprove = async () => {
    if (!hbl || !onApprove) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }

    const formData = watch();
    const result = HBLApprovalSchema.safeParse(formData);

    if (!result.success) {
      const errorMessages = result.error.errors.map(e => `• ${e.message}`).join('\n');
      toastAdapter.error(`Cannot approve HBL. Please fix the following:\n\n${errorMessages}`);
      return;
    }
    if (!validateLineDrafts()) {
      return;
    }

    try {
      await onApprove(hbl.id);
      toast.success('HBL approved successfully');
      onClose();
    } catch (error: any) {
      toastAdapter.error(error?.message || 'Failed to approve HBL. Please try again.');
    }
  };

  const handleClose = async () => {
    if (!isReadOnly && (isDirty || hasUnsavedLineChanges)) {
      const confirmed = await toastAdapter.confirm(
        'You have unsaved changes. Close without saving?',
        { intent: 'danger' }
      );
      if (!confirmed) {
        return;
      }
    }
    reset(buildHblFormValues());
    setFormErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative flex w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white text-left shadow-2xl transition-all dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/80">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create'
                ? 'Create New HBL'
                : mode === 'view' || isApproved
                  ? 'View HBL'
                  : 'Edit HBL'}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="max-h-[75vh] flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {/* Section 1: Bill Info */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white border-b pb-2">
                Bill Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormInput
                  name="code"
                  control={control}
                  label="HBL No"
                  placeholder="HBL123456"
                  disabled={isReadOnly}
                  required
                />
                <FormInput
                  name="mbl"
                  control={control}
                  label="MBL No"
                  placeholder="MBL123456"
                  disabled={isReadOnly}
                  required
                />
                <FormDateInput
                  name="receivedAt"
                  control={control}
                  label="Received Date"
                  disabled={isReadOnly}
                  required
                />
              </div>
              <FormForwarderSingleSelect
                name="issuerId"
                control={control}
                label="Issuer (Forwarder)"
                disabled={isReadOnly}
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  HBL Document Reference
                </label>
                {!documentFile ? (
                  !isReadOnly && (
                    <DocumentUploader
                      ownerId={documentOwnerId}
                      description="HBL document attachment"
                      metadata={documentMetadata}
                      onSuccess={(document: Document) => {
                        setValue('document', {
                          id: document.id,
                          name: document.name,
                          mimeType: document.fileType || 'application/pdf',
                        }, { shouldDirty: true });
                      }}
                    />
                  )
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {documentFile?.name}
                    </div>
                    {documentFile?.id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          documentDownload.mutate({
                            documentId: documentFile.id,
                            fileName: documentFile.name ?? undefined,
                            openInNewTab: true,
                          })
                        }
                        disabled={documentDownload.isPending}
                      >
                        Download
                      </Button>
                    )}
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue('document', null, { shouldDirty: true })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Voyage/Ports */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white border-b pb-2">
                Voyage & Ports
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormInput
                  name="vesselName"
                  control={control}
                  label="Vessel Name"
                  placeholder="MSC FORTUNE"
                  disabled={isReadOnly}
                  required
                />
                <FormInput
                  name="voyageNumber"
                  control={control}
                  label="Voyage Number"
                  placeholder="V123"
                  disabled={isReadOnly}
                  required
                />
                <FormDateInput
                  name="eta"
                  control={control}
                  label="ETA"
                  disabled={isReadOnly}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  name="pol"
                  control={control}
                  label="Port of Loading (POL)"
                  placeholder="VNSGN (UN/LOCODE)"
                  hint="Recommended UN/LOCODE (e.g., VNSGN). Free text is accepted."
                  disabled={isReadOnly}
                />
                <FormInput
                  name="pod"
                  control={control}
                  label="Port of Discharge (POD)"
                  placeholder="USNYC (UN/LOCODE)"
                  hint="Recommended UN/LOCODE (e.g., USNYC). Free text is accepted."
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Section 3: Containers */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white border-b pb-2">
                Container Information
              </h4>
              {!isReadOnly && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Note: HBL supports only 1 container
                </div>
              )}

              <Controller
                name="containers"
                control={control}
                render={({ field }) => {
                  const currentContainers =
                    Array.isArray(field.value) && field.value.length > 0
                      ? field.value
                      : [
                          {
                            containerId: null,
                            containerNumber: '',
                            containerTypeCode: null,
                            sealNumber: '',
                          },
                        ];
                  const currentSeal = currentContainers[0]?.sealNumber ?? '';

                  return (
                    <div className="space-y-4">
                    <ContainerNumberPicker
                      value={{
                        id: currentContainers[0]?.containerId ?? null,
                        number: currentContainers[0]?.containerNumber ?? '',
                        typeCode: currentContainers[0]?.containerTypeCode ?? null,
                      }}
                      onChange={(containerValue) => {
                        if (containerValue.number) {
                          field.onChange([
                            {
                              containerId: containerValue.id,
                              containerNumber: containerValue.number,
                              containerTypeCode: containerValue.typeCode,
                              sealNumber: currentSeal,
                            },
                          ]);
                        } else {
                          field.onChange([
                            {
                              ...currentContainers[0],
                              containerId: null,
                              containerNumber: '',
                              containerTypeCode: null,
                              sealNumber: currentSeal,
                            },
                          ]);
                        }
                      }}
                      onResolved={({ value }) => {
                        field.onChange([
                          {
                            containerId: value.id,
                            containerNumber: value.number,
                            containerTypeCode: value.typeCode,
                            sealNumber: currentSeal,
                          },
                        ]);
                      }}
                      disabled={isReadOnly}
                      required={!isReadOnly}
                      error={containerNumberError}
                    />

                    {/* Seal field: Always visible, independent of container selection */}
                    <Controller
                      name="containers.0.sealNumber"
                      control={control}
                      render={({ field: sealField }) => (
                        <FormInput
                          name="containers.0.sealNumber"
                          control={control}
                          label="Seal Number" // TODO(i18n): translate to hbl.form.sealNumber
                          placeholder="SEAL001234" // TODO(i18n): translate to hbl.form.sealNumberPlaceholder
                          disabled={isReadOnly}
                          value={sealField.value || ''}
                          required={!isReadOnly}
                          onChange={(e) => {
                            const sealValue = e.target.value;
                            field.onChange([
                              {
                                ...currentContainers[0],
                                sealNumber: sealValue,
                              },
                            ]);
                          }}
                        />
                      )}
                    />
                  </div>
                  );
                }}
              />
            </div>

            {/* Section 4: Contact Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white border-b pb-2">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormTextarea
                  name="shipper"
                  control={control}
                  label="Shipper"
                  placeholder="ABC Trading Co."
                  disabled={isReadOnly}
                  rows={3}
                />
                <FormTextarea
                  name="consignee"
                  control={control}
                  label="Consignee"
                  placeholder="XYZ Logistics Ltd."
                  disabled={isReadOnly}
                  required
                  rows={3}
                />
              </div>
              <FormTextarea
                name="notifyParty"
                control={control}
                label="Notify Party"
                placeholder="Notify Agent Inc."
                disabled={isReadOnly}
                rows={3}
              />
            </div>

            {/* Section 5: Cargo */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white border-b pb-2">
                Cargo Summary & Lines
              </h4>
              <HBLCargoSummaryCards lineTotals={lineTotals} />
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <HBLCargoLinesTable
                  lines={lineDrafts}
                  loading={Boolean(packingListId) && isLinesLoading}
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
            </div>

          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/80 md:flex-row md:items-center">
            {!isReadOnly && (
              <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  className="gap-2 shadow-sm transition-shadow hover:shadow-md"
                >
                  {!isSubmitting && <Save className="h-4 w-4" />}
                  {isSubmitting
                    ? 'Saving...'
                    : 'Save Draft'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 gap-2 shadow-sm transition-shadow hover:shadow-md"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
            {isReadOnly && (
              <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row">
                {isViewMode && hbl && !isApproved && onApprove && canWrite && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleApprove}
                    className="gap-2 shadow-md transition-shadow hover:shadow-lg"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  className="gap-2 shadow-sm transition-shadow hover:shadow-md"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            )}
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
        </form>
      </div>
    </div>
  );
};

export default HBLFormModal;
