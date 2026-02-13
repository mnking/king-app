import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  ClipboardList,
  Container,
  FileSpreadsheet,
  Save,
  Ship,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { Forwarder } from '@/features/forwarder/types';
import { DocumentUploader } from '@/features/document-service/components/DocumentUploader';
import { useDocumentDownload } from '@/features/document-service';
import type { Document } from '@/features/document-service/types';
import {
  FormInput,
  FormForwarderSingleSelect,
  FormShippingLineSingleSelect,
  FormTextarea,
} from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { toastAdapter } from '@/shared/services/toast';
import { useUnsavedChanges } from '@/shared/hooks';
import { exportServiceOrdersApi } from '@/services/apiExportOrders';
import {
  useApproveExportServiceOrder,
  useCreateExportServiceOrder,
  useExportServiceOrder,
  useUpdateExportServiceOrder,
  exportServiceOrderQueryKeys,
} from '../hooks';
import {
  ExportServiceOrderFormSchema,
  exportServiceOrderDefaultValues,
  getBookingContainerErrors,
  validateApprove,
  validateDraft,
} from '../schemas';
import {
  mapFormPackingListToAssignPayload,
  mapFormValuesToPayload,
  mapOrderPackingListsToFormRows,
  mapOrderToFormValues,
} from '../helpers/export-service-order.utils';
import type {
  ExportServiceOrder,
  ExportServiceOrderDocumentFile,
  ExportServiceOrderFormPackingList,
  ExportServiceOrderFormValues,
  ExportServiceOrderModalMode,
} from '../types';
import BookingContainersTable from './BookingContainersTable';
import PackingListTable from './PackingListTable';

interface ExportServiceOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ExportServiceOrderModalMode;
  order?: ExportServiceOrder | null;
  forwarders?: Forwarder[];
  forwardersLoading?: boolean;
}

const formatStatusBadge = (status?: string | null) => {
  const styleMap: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-gray-700',
    APPROVED: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 ring-1 ring-inset ring-green-600/20',
    DONE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10',
  };

  const label = status ?? 'Draft';
  const style = styleMap[status ?? 'DRAFT'] ?? styleMap.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const InfoField: React.FC<{
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-gray-900/50">
    {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {value ?? '-'}
      </div>
    </div>
  </div>
);

const mapDocumentFile = (document: Document): ExportServiceOrderDocumentFile => ({
  id: document.id,
  name: document.name,
  mimeType: document.fileType ?? null,
  url:
    (document.actions as { downloadUrl?: string } | undefined)?.downloadUrl ??
    document.key ??
    null,
  sizeBytes: document.size ?? null,
});

export const ExportServiceOrderFormModal: React.FC<ExportServiceOrderFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  order,
  forwarders,
  forwardersLoading = false,
}) => {
  const queryClient = useQueryClient();
  const [createdOrder, setCreatedOrder] = useState<ExportServiceOrder | null>(null);
  const orderId = createdOrder?.id ?? order?.id ?? '';
  const isCreateMode = mode === 'create' && !orderId;

  const { data: detailData, isLoading: detailLoading } = useExportServiceOrder(orderId, {
    enabled: isOpen && Boolean(orderId),
  });

  const currentOrder = detailData ?? createdOrder ?? order ?? null;
  const currentStatus = currentOrder?.status ?? 'DRAFT';
  const isViewMode = mode === 'view';
  const isDone = currentStatus === 'DONE';
  const isApproved = currentStatus === 'APPROVED';
  const isDraft = currentStatus === 'DRAFT';
  const canApproveInView = isViewMode && isDraft;
  const isReadOnly = isViewMode || isDone;
  const updatedAtLabel = useMemo(() => {
    if (!currentOrder?.updatedAt) return '-';
    const date = new Date(currentOrder.updatedAt);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }, [currentOrder?.updatedAt]);

  const createMutation = useCreateExportServiceOrder();
  const updateMutation = useUpdateExportServiceOrder();
  const approveMutation = useApproveExportServiceOrder();
  const documentDownload = useDocumentDownload();

  const methods = useForm<ExportServiceOrderFormValues>({
    resolver: zodResolver(ExportServiceOrderFormSchema),
    defaultValues: exportServiceOrderDefaultValues,
  });

  const {
    control,
    getValues,
    reset,
    setError,
    clearErrors,
    setValue,
    formState: { isDirty, errors },
  } = methods;

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    approveMutation.isPending;

  const [formError, setFormError] = useState<string | null>(null);

  const watchedPackingLists = useWatch({ control, name: 'packingLists' });
  const packingListCount = watchedPackingLists?.length ?? 0;
  const hasPackingLists = packingListCount > 0;
  const watchedBookingContainers = useWatch({
    control,
    name: 'bookingContainers',
  });
  const bookingFile = useWatch({
    control,
    name: 'bookingConfirmation.bookingFile',
  });

  const { handleClose } = useUnsavedChanges({
    isDirty,
    isSubmitting: isMutating,
    isReadOnly,
    onClose,
    reset: () => reset(exportServiceOrderDefaultValues),
  });

  const lastLoadedOrderIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const lastLoadedSourceRef = useRef<'detail' | 'fallback' | 'default' | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const nextOrderId = currentOrder?.id ?? null;
    const source = detailData
      ? 'detail'
      : currentOrder
        ? 'fallback'
        : 'default';
    const shouldReset =
      !hasInitializedRef.current ||
      nextOrderId !== lastLoadedOrderIdRef.current ||
      (source === 'detail' &&
        lastLoadedSourceRef.current !== 'detail' &&
        !isDirty);

    if (!shouldReset) return;

    if (currentOrder) {
      reset(mapOrderToFormValues(currentOrder));
    } else {
      reset(exportServiceOrderDefaultValues);
    }

    hasInitializedRef.current = true;
    lastLoadedOrderIdRef.current = nextOrderId;
    lastLoadedSourceRef.current = source;
  }, [currentOrder, detailData, isDirty, isOpen, reset]);

  useEffect(() => {
    if (isOpen) return;
    hasInitializedRef.current = false;
    lastLoadedOrderIdRef.current = null;
    lastLoadedSourceRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!formError) return;
    if (packingListCount > 0) {
      setFormError(null);
    }
  }, [formError, packingListCount]);

  useEffect(() => {
    if (!errors.bookingContainers) return;
    if (!watchedBookingContainers || watchedBookingContainers.length === 0) return;
    const containerErrors = getBookingContainerErrors(watchedBookingContainers);
    if (Object.keys(containerErrors).length === 0) {
      clearErrors('bookingContainers');
    }
  }, [clearErrors, errors.bookingContainers, watchedBookingContainers]);

  const applyFieldErrors = (fieldErrors?: Record<string, string>) => {
    clearErrors();
    setFormError(null);

    if (!fieldErrors) return;

    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (field === '_root') {
        setFormError(message);
        return;
      }
      setError(field as any, { type: 'manual', message });
    });
  };

  const closeAndReset = () => {
    reset(exportServiceOrderDefaultValues);
    setFormError(null);
    setCreatedOrder(null);
    onClose();
  };

  const assignPackingLists = async (
    id: string,
    packingLists: ExportServiceOrderFormPackingList[],
  ) => {
    let latestOrder: ExportServiceOrder | null = null;

    try {
      for (const row of packingLists) {
        const payload = mapFormPackingListToAssignPayload(row);
        if (!payload) continue;
        const response = await exportServiceOrdersApi.assignPackingList(id, payload);
        latestOrder = response.data;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to assign packing lists.';
      toast.error(message);
      throw error;
    }

    if (latestOrder) {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(latestOrder.id),
        latestOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      const nextPackingLists = mapOrderPackingListsToFormRows(
        latestOrder.packingLists ?? [],
      );
      setValue('packingLists', nextPackingLists, { shouldDirty: false });
    }
  };

  const handleSave = async () => {
    if (isReadOnly) return;

    const values = getValues();
    setFormError(null);

    const validation = isDraft ? validateDraft(values) : validateApprove(values);
    if (!validation.valid) {
      applyFieldErrors(validation.fieldErrors);
      return;
    }

    try {
      const payload = mapFormValuesToPayload(values);
      let savedOrder: ExportServiceOrder | null = null;

      if (isCreateMode) {
        savedOrder = await createMutation.mutateAsync(payload);
        setCreatedOrder(savedOrder);
      } else {
        savedOrder = await updateMutation.mutateAsync({ id: orderId, payload });
      }

      if (savedOrder && values.packingLists.length > 0 && isCreateMode) {
        await assignPackingLists(savedOrder.id, values.packingLists);
      }

      closeAndReset();
    } catch {
      // Toasts handled in hooks.
    }
  };

  const handleApprove = async () => {
    if (!isDraft) return;

    const values = getValues();
    const validation = validateApprove(values);
    if (!validation.valid) {
      applyFieldErrors(validation.fieldErrors);
      const fieldErrors = validation.fieldErrors ?? {};
      const firstMessage =
        fieldErrors._root ?? Object.values(fieldErrors)[0] ?? null;
      if (firstMessage) {
        toast.error(firstMessage);
      }
      return;
    }

    const confirmed = await toastAdapter.confirm(
      'Approve export service order? This will lock the order.',
      { intent: 'danger' },
    );
    if (!confirmed) return;

    let savedOrder: ExportServiceOrder | null = null;

    try {
      const payload = mapFormValuesToPayload(values);
      if (isCreateMode) {
        savedOrder = await createMutation.mutateAsync(payload);
        setCreatedOrder(savedOrder);
      } else {
        savedOrder = await updateMutation.mutateAsync({ id: orderId, payload });
      }
    } catch {
      return;
    }

    if (!savedOrder) {
      toast.error('Unable to prepare order for approval.');
      return;
    }

    try {
      if (isCreateMode && values.packingLists.length > 0) {
        await assignPackingLists(savedOrder.id, values.packingLists);
      }

      await approveMutation.mutateAsync(savedOrder.id);
      closeAndReset();
    } catch {
      // Toast handled in hook.
    }
  };

  if (!isOpen) return null;

  const requestTimeValue = methods.watch('requestTime');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm transition-all duration-200">
      <div className="relative flex w-full max-w-[90vw] max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-50 p-2.5 dark:bg-blue-900/20">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {mode === 'view'
                    ? 'View Export Order'
                    : mode === 'edit'
                      ? 'Edit Export Order'
                      : 'New Export Order'}
                </h2>
                {formatStatusBadge(currentStatus)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage export stuffing orders and booking confirmations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormProvider {...methods}>
          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 dark:bg-black/20">
            <div className="space-y-6">
              {/* Order Information - Compact Bar */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="grid gap-4 md:grid-cols-[auto_auto_1fr_auto]">
                  <InfoField
                    label="Order Number"
                    value={currentOrder?.code ?? '-'}
                    icon={<ClipboardList className="h-4 w-4" />}
                  />
                  <InfoField
                    label="Last Update"
                    value={updatedAtLabel}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <div className="min-w-[240px]">
                    <FormForwarderSingleSelect<ExportServiceOrderFormValues>
                      name="forwarderId"
                      control={control}
                      label="Forwarder"
                      required
                      disabled={isReadOnly || isApproved || hasPackingLists}
                      forwarders={forwarders}
                      forwardersLoading={forwardersLoading}
                      codeFieldName="forwarderCode"
                      setValue={setValue}
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="min-w-[200px]">
                    <FormInput<ExportServiceOrderFormValues>
                      name="requestTime"
                      control={control}
                      label="Request Time"
                      type="datetime-local"
                      required
                      disabled={isReadOnly || isApproved}
                      valueMode="string"
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
                {!isReadOnly && hasPackingLists && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    Remove all packing lists to change the forwarder
                  </div>
                )}
                {requestTimeValue && isDraft && !isReadOnly && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-500">
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    Request time must be in the future for draft saves
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[55fr_45fr]">
                <div className="space-y-6">
                  {/* Booking Confirmation */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <Ship className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Booking Confirmation
                        </h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.bookingNumber"
                          control={control}
                          label="Booking Confirmation Number"
                          required
                          disabled={isReadOnly || isApproved}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.bookingDate"
                          control={control}
                          label="Booking Date"
                          type="date"
                          valueMode="string"
                          required
                          disabled={isReadOnly || isApproved}
                        />
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Booking Confirmation Document
                          </label>
                          {!bookingFile ? (
                            !isReadOnly ? (
                              <DocumentUploader
                                ownerId={orderId || undefined}
                                description="Booking confirmation document"
                                metadata={{
                                  context: 'export-service-order',
                                  orderId,
                                }}
                                onSuccess={(document: Document) => {
                                  setValue(
                                    'bookingConfirmation.bookingFile',
                                    mapDocumentFile(document),
                                    { shouldDirty: true },
                                  );
                                }}
                              />
                            ) : null
                          ) : (
                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                              <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {bookingFile.name ?? 'Document'}
                              </div>
                              {bookingFile.id && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    documentDownload.mutate({
                                      documentId: bookingFile.id,
                                      fileName: bookingFile.name ?? undefined,
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
                                  onClick={() =>
                                    setValue(
                                      'bookingConfirmation.bookingFile',
                                      null,
                                      { shouldDirty: true },
                                    )
                                  }
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          )}
                          {errors.bookingConfirmation?.bookingFile && (
                            <p
                              className="mt-2 text-sm text-red-600 dark:text-red-400"
                              role="alert"
                            >
                              {errors.bookingConfirmation.bookingFile.message}
                            </p>
                          )}
                        </div>
                        <FormShippingLineSingleSelect<ExportServiceOrderFormValues>
                          name="bookingConfirmation.shippingLine"
                          control={control}
                          label="Shipping Line"
                          required
                          disabled={isReadOnly || isApproved}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.vessel"
                          control={control}
                          label="Vessel Name"
                          required
                          disabled={isReadOnly}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.voyage"
                          control={control}
                          label="Voyage Number"
                          required
                          disabled={isReadOnly}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.etd"
                          control={control}
                          label="ETD"
                          type="date"
                          valueMode="string"
                          disabled={isReadOnly}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.pol"
                          control={control}
                          label="PoL"
                          required
                          disabled={isReadOnly || isApproved}
                        />
                        <FormInput<ExportServiceOrderFormValues>
                          name="bookingConfirmation.pod"
                          control={control}
                          label="PoD"
                          required
                          disabled={isReadOnly || isApproved}
                        />
                        <FormTextarea<ExportServiceOrderFormValues>
                          name="bookingConfirmation.note"
                          control={control}
                          label="Note"
                          rows={2}
                          disabled={isReadOnly || isApproved}
                          className="md:col-span-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <BookingContainersTable isReadOnly={isReadOnly} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <Container className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Packing Lists
                        </h3>
                      </div>
                    </div>
                    <div className="p-5">
                      {detailLoading && currentOrder && (
                        <div className="mb-4 flex items-center gap-2 text-sm text-blue-600">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Loading latest details...
                        </div>
                      )}
                      <PackingListTable
                        isReadOnly={isReadOnly}
                        orderId={orderId}
                        orderStatus={currentStatus}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormProvider>

        <div className="flex flex-col gap-4 border-t border-gray-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {isReadOnly ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {canApproveInView
                  ? 'Review the details and approve when ready.'
                  : 'This order is read-only'}
              </span>
            ) : (
              <span>
                {isDraft
                  ? 'Ready to draft. Approve when finalized.'
                  : 'Modifications will be logged.'}
              </span>
            )}
            {formError && (
              <span className="flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <X className="h-3 w-3" />
                {formError}
              </span>
            )}
            {errors.bookingContainers && (
              <span className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <X className="h-3 w-3" />
                Check booking container inputs
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isMutating}
            >
              Close
            </Button>
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSave()}
                disabled={isMutating}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isApproved ? 'Save Changes' : 'Save Draft'}
              </Button>
            )}
            {canApproveInView && (
              <Button
                type="button"
                onClick={() => void handleApprove()}
                disabled={isMutating}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportServiceOrderFormModal;
