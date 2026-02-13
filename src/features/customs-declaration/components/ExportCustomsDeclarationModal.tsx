import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Save, Trash2, X } from 'lucide-react';
import { DocumentUploader } from '@/features/document-service/components/DocumentUploader';
import { useDocumentDownload } from '@/features/document-service';
import type { Document } from '@/features/document-service/types';
import { FormDateInput, FormInput } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import type { PackingListListItem } from '@/features/packing-list/types';
import {
  buildCustomsDeclarationFormValues,
  CustomsDeclarationApprovalSchema,
  CustomsDeclarationDraftSchema,
} from '../schemas';
import type {
  CustomsDeclarationFormValues,
  CustomsDeclarationResponse,
  CustomsDeclarationDocumentFile,
  CustomsDeclarationMetadata,
} from '../types';
import {
  useApproveCustomsDeclaration,
  useCreateCustomsDeclaration,
  useCustomsDeclaration,
  useDeleteCustomsDeclaration,
  useUpdateCustomsDeclaration,
} from '../hooks';
import { packingListQueryKeys } from '@/features/packing-list/hooks/use-packing-lists';
import { useQueryClient } from '@tanstack/react-query';

interface ExportCustomsDeclarationModalProps {
  open: boolean;
  packingList: PackingListListItem | null;
  customsDeclarationId?: string | null;
  canWrite?: boolean;
  onClose: () => void;
}

type CustomsStatusChip = 'pending' | 'approved';

const statusStyles: Record<CustomsStatusChip, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
};

const resolveStatusChip = (status?: CustomsDeclarationResponse['status']): CustomsStatusChip => {
  if (status === 'APPROVED') return 'approved';
  return 'pending';
};

const normalizeDateOnly = (value: string) => {
  if (!value) return null;
  return value.includes('T') ? value.split('T')[0] : value;
};

const normalizeString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapDocumentFile = (document: Document): CustomsDeclarationDocumentFile => ({
  id: document.id,
  name: document.name,
  mimeType: document.fileType ?? 'application/octet-stream',
  url: (document.actions as { downloadUrl?: string } | undefined)?.downloadUrl ?? document.key ?? null,
  sizeBytes: document.size ?? null,
});

const InfoItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {value ?? '—'}
    </div>
  </div>
);

export const ExportCustomsDeclarationModal: React.FC<ExportCustomsDeclarationModalProps> = ({
  open,
  packingList,
  customsDeclarationId,
  canWrite = true,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { data: customsDeclaration, isLoading } = useCustomsDeclaration(
    customsDeclarationId ?? null,
    { enabled: open && !!customsDeclarationId },
  );
  const createMutation = useCreateCustomsDeclaration();
  const updateMutation = useUpdateCustomsDeclaration();
  const approveMutation = useApproveCustomsDeclaration();
  const deleteMutation = useDeleteCustomsDeclaration();
  const documentDownload = useDocumentDownload();

  const emptyValues = useMemo(
    () => buildCustomsDeclarationFormValues(null),
    [],
  );

  const form = useForm<CustomsDeclarationFormValues>({
    resolver: zodResolver(CustomsDeclarationDraftSchema),
    defaultValues: buildCustomsDeclarationFormValues(customsDeclaration ?? null),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const {
    control,
    reset,
    handleSubmit,
    setValue,
    getValues,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const mainDocument = watch('mainDocument');

  useEffect(() => {
    if (!open) {
      reset(emptyValues);
      return;
    }

    if (customsDeclarationId && customsDeclaration) {
      reset(buildCustomsDeclarationFormValues(customsDeclaration));
      return;
    }

    reset(emptyValues);
  }, [
    open,
    customsDeclaration,
    customsDeclarationId,
    emptyValues,
    reset,
  ]);

  const statusChip = statusStyles[resolveStatusChip(customsDeclaration?.status)];
  const isApproved = customsDeclaration?.status === 'APPROVED';
  const isCreateBlocked =
    !customsDeclarationId &&
    packingList?.workingStatus === 'DONE';
  const isReadOnly = !canWrite || isCreateBlocked;
  const editableAfterApprove = new Set(['etd', 'mainDocument', 'clearanceSource']);

  const isFieldEditable = (field: string) => {
    if (isReadOnly) return false;
    if (!isApproved) return true;
    return editableAfterApprove.has(field);
  };

  const canSave = !isReadOnly && !!packingList?.id;
  const canApprove =
    !isReadOnly && !!packingList?.id && (customsDeclaration?.status ?? 'PENDING') === 'PENDING';
  const canDelete = !isReadOnly && customsDeclaration?.status === 'PENDING' && !!customsDeclarationId;

  const buildMetadataPayload = (values: CustomsDeclarationFormValues): CustomsDeclarationMetadata | null => {
    const metadata: CustomsDeclarationMetadata = {
      consignee: normalizeString(values.consignee),
      etd: values.etd || null,
    };

    if (!metadata.consignee && !metadata.etd) return null;
    return metadata;
  };

  const buildDraftPayload = (values: CustomsDeclarationFormValues) => ({
    packingListId: packingList?.id ?? '',
    code: normalizeString(values.code),
    customsOffice: normalizeString(values.customsOffice),
    registeredAt: normalizeDateOnly(values.registeredAt),
    mainDocument: values.mainDocument ?? null,
    clearanceSource: values.clearanceSource ?? 'API',
    metadata: buildMetadataPayload(values),
  });

  const buildApprovedUpdatePayload = (values: CustomsDeclarationFormValues) => ({
    clearanceSource: values.clearanceSource ?? 'API',
    mainDocument: values.mainDocument ?? null,
    metadata: {
      etd: values.etd || null,
    },
  });

  const validateForApproval = (values: CustomsDeclarationFormValues) => {
    const result = CustomsDeclarationApprovalSchema.safeParse(values);
    if (result.success) return true;

    result.error.issues.forEach((issue) => {
      const path = issue.path[0];
      if (typeof path === 'string') {
        setError(path as keyof CustomsDeclarationFormValues, {
          type: 'manual',
          message: issue.message,
        });
      }
    });

    if (!values.mainDocument) {
      setError('mainDocument', {
        type: 'manual',
        message: 'Main declaration document is required',
      });
    }

    return false;
  };

  const handleSaveDraft = async () => {
    if (!packingList?.id) return;
    const values = getValues();
    const payload = isApproved
      ? buildApprovedUpdatePayload(values)
      : buildDraftPayload(values);

    if (!customsDeclarationId) {
      await createMutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['hbls'] });
      onClose();
      return;
    }

    await updateMutation.mutateAsync({
      id: customsDeclarationId,
      payload,
    });
    queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['hbls'] });
    onClose();
  };

  const handleApprove = async () => {
    if (!packingList?.id) return;
    const values = getValues();
    if (!validateForApproval(values)) return;

    if (!customsDeclarationId) {
      const created = await createMutation.mutateAsync(buildDraftPayload(values));
      await approveMutation.mutateAsync(created.id);
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['hbls'] });
      queryClient.invalidateQueries({ queryKey: ['customs-declaration-status', created.id] });
      onClose();
      return;
    }

    await approveMutation.mutateAsync(customsDeclarationId);
    queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['hbls'] });
    queryClient.invalidateQueries({ queryKey: ['customs-declaration-status', customsDeclarationId] });
    onClose();
  };

  const handleDelete = async () => {
    if (!customsDeclarationId) return;
    await deleteMutation.mutateAsync(customsDeclarationId);
    queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['hbls'] });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Customs declaration
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusChip.className}`}
              >
                {statusChip.label}
              </span>
              <p className="w-full text-sm text-gray-600 dark:text-gray-300">
                Manage declaration details, documents, and clearance status for this cargo list.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {isCreateBlocked && (
            <div className="px-6 pb-4">
              <span className="text-xs text-amber-600 dark:text-amber-300">
                Creation disabled because cargo list working status is DONE.
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit(handleSaveDraft)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {packingList && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Cargo List
                </h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoItem label="Cargo List #" value={packingList.packingListNumber ?? '—'} />
                  <InfoItem label="HBL" value={packingList.hblData?.hblCode ?? '—'} />
                  <InfoItem label="Container" value={packingList.hblData?.containerNumber ?? '—'} />
                  <InfoItem label="Shipper" value={packingList.shippingDetail?.shipper ?? packingList.hblData?.shipper ?? '—'} />
                  <InfoItem label="Consignee" value={packingList.hblData?.consignee ?? '—'} />
                  <InfoItem label="Forwarder" value={packingList.hblData?.forwarderName ?? '—'} />
                </div>
              </div>
            )}

            {isLoading && customsDeclarationId ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading customs declaration...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput
                    name="code"
                    control={control}
                    label="Declaration code"
                    placeholder="e.g., CUS123456"
                    required
                    disabled={!isFieldEditable('code')}
                  />
                  <FormInput
                    name="customsOffice"
                    control={control}
                    label="Customs office"
                    placeholder="Customs office"
                    required
                    disabled={!isFieldEditable('customsOffice')}
                  />
                  <FormInput
                    name="registeredAt"
                    control={control}
                    label="Register date"
                    type="date"
                    required
                    disabled={!isFieldEditable('registeredAt')}
                  />
                  <FormInput
                    name="consignee"
                    control={control}
                    label="Importer (consignee)"
                    placeholder="Importer"
                    disabled={!isFieldEditable('consignee')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Main Declaration Document
                    </label>
                    {!mainDocument ? (
                      isFieldEditable('mainDocument') ? (
                        <DocumentUploader
                          ownerId={customsDeclaration?.id ?? packingList?.id}
                          description="Main declaration document" // TODO(i18n)
                          metadata={{
                            context: 'customs-declaration',
                            packingListId: packingList?.id ?? '',
                          }}
                          onSuccess={(document: Document) => {
                            setValue('mainDocument', mapDocumentFile(document), { shouldDirty: true });
                          }}
                        />
                      ) : null
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {mainDocument?.name}
                        </div>
                        {mainDocument?.id && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              documentDownload.mutate({
                                documentId: mainDocument.id,
                                fileName: mainDocument.name ?? undefined,
                                openInNewTab: true,
                              })
                            }
                            disabled={documentDownload.isPending}
                          >
                            Download
                          </Button>
                        )}
                        {isFieldEditable('mainDocument') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setValue('mainDocument', null, { shouldDirty: true })}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                    {errors.mainDocument && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                        {errors.mainDocument.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormDateInput
                    name="etd"
                    control={control}
                    label="ETD"
                    disabled={!isFieldEditable('etd')}
                  />
                </div>

              </>
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/80">
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || isSubmitting}
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={!canSave || isSubmitting}
              loading={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove || isSubmitting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportCustomsDeclarationModal;
