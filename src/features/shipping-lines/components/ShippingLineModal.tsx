import React, { useEffect, useMemo, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/Button';
import { FormInput, FormTextarea, FormSingleSelect } from '@/shared/components/forms';
import { useDocumentDownload, useDocumentUpload } from '@/features/document-service';
import type { ShippingLine, ShippingLineCreateForm } from '../types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ShippingLineFormSchema,
  shippingLineFormDefaultValues,
  shippingLineTypeOptions,
} from '../schemas';

export type ModalMode = 'create' | 'edit' | 'view';

interface ShippingLineModalProps {
  open: boolean;
  mode: ModalMode;
  shippingLine: ShippingLine | null;
  onClose: () => void;
  onSave: (payload: ShippingLineCreateForm) => Promise<void>;
  isSaving?: boolean;
}

const emptyForm: ShippingLineCreateForm = {
  ...shippingLineFormDefaultValues,
};

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

export const ShippingLineModal: React.FC<ShippingLineModalProps> = ({
  open,
  mode,
  shippingLine,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<ShippingLine['contractFile'] | null>(null);
  const documentDownload = useDocumentDownload();

  const {
    register,
    reset,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ShippingLineCreateForm>({
    defaultValues: emptyForm,
    resolver: zodResolver(ShippingLineFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const contractStatus = watch('contractStatus');

  const isReadOnly = mode === 'view';

  useEffect(() => {
    if (shippingLine && (mode === 'edit' || mode === 'view')) {
      const nextValues: ShippingLineCreateForm = {
        code: shippingLine.code || '',
        name: shippingLine.name || '',
        status: shippingLine.status || 'ACTIVE',
        type: shippingLine.type || 'NORMAL',
        contactInfo: shippingLine.contactInfo || '',
        contractStatus: shippingLine.contractStatus || 'N/A',
        contractExpireDate: normalizeDateInput(shippingLine.contractExpireDate),
        note: shippingLine.note || '',
        contractFile: shippingLine.contractFile ?? undefined,
      };
      reset(nextValues);
      setContractFile(shippingLine.contractFile ?? null);
    } else {
      reset(emptyForm);
      setContractFile(null);
    }
  }, [shippingLine, mode, reset]);

  const {
    upload,
    isUploading,
    status: uploadStatus,
  } = useDocumentUpload({
    onSuccess: (doc) => {
      setContractFile({
        id: doc.id,
        name: doc.name,
        mimeType: doc.fileType ?? 'application/octet-stream',
        url: (doc as any)?.actions?.downloadUrl ?? doc.key ?? '',
        sizeBytes: doc.size ?? 0,
      });
      toast.success('Contract uploaded');
    },
    onError: (err) => {
      toast.error(err.message || 'Upload failed');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleUploadClick = () => {
    if (!selectedFile) {
      toast.error('Select a file first');
      return;
    }
    upload(selectedFile);
  };

  const handleDownloadClick = () => {
    if (!contractFile?.id) return;
    documentDownload.mutate({
      documentId: contractFile.id,
      fileName: contractFile.name ?? undefined,
      openInNewTab: true,
    });
  };

  const handleRemoveContractFile = () => {
    setContractFile(null);
    setSelectedFile(null);
  };

  const modalTitle = useMemo(() => {
    if (mode === 'edit') return 'Edit shipping line';
    if (mode === 'view') return 'Shipping line details';
    return 'Add shipping line';
  }, [mode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{modalTitle}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Provide basic shipping line info and attach the contract file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            const payload: ShippingLineCreateForm = {
              ...values,
              contractStatus:
                values.contractStatus && values.contractStatus !== 'N/A'
                  ? (values.contractStatus as ShippingLine['contractStatus'])
                  : null,
              contractExpireDate: values.contractExpireDate || null,
              contractFile: contractFile ?? undefined,
              note: values.note || null,
              contactInfo: values.contactInfo || null,
            };

            await onSave(payload);
            reset(emptyForm);
            setContractFile(null);
            setSelectedFile(null);
          })}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Shipping line information</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Basic identifiers, status, and how to reach this shipping line.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  control={control}
                  name="code"
                  label="Code"
                  required
                  placeholder="e.g., CGM01"
                  disabled={isReadOnly}
                />
                <FormInput
                  control={control}
                  name="name"
                  label="Name"
                  required
                  placeholder="Shipping line name"
                  disabled={isReadOnly}
                />
                <FormSingleSelect
                  control={control}
                  name="type"
                  label="Type"
                  disabled={isReadOnly}
                  options={shippingLineTypeOptions}
                />
                <FormSingleSelect
                  control={control}
                  name="status"
                  label="Status"
                  disabled={isReadOnly}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' },
                  ]}
                />
                <FormInput
                  control={control}
                  name="contactInfo"
                  label="Contact Info"
                  placeholder="Email or phone"
                  disabled={isReadOnly}
                />
              </div>
              <label className="mt-3 flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
                Note
                <FormTextarea
                  control={control}
                  name="note"
                  rows={3}
                  disabled={isReadOnly}
                  placeholder="Special instructions or remarks"
                />
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Contract & notes</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Track contract status, expiry, and attach the signed document.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormSingleSelect
                  control={control}
                  name="contractStatus"
                  label="Contract Status"
                  disabled={isReadOnly}
                  options={[
                    { value: 'N/A', label: 'N/A' },
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'EXPIRED', label: 'EXPIRED' },
                    { value: 'SUSPENDED', label: 'SUSPENDED' },
                  ]}
                />
                <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
                  Contract Expiry
                  <input
                    name="contractExpireDate"
                    {...register('contractExpireDate', {
                      validate: (value) => {
                        const needsExpiry =
                          (contractStatus || '').toUpperCase() === 'ACTIVE' ||
                          (contractStatus || '').toUpperCase() === 'SUSPENDED';
                        if (needsExpiry && !value) {
                          return 'Contract expiry date is required when contract status is Active or Suspended.';
                        }
                        return true;
                      },
                    })}
                    type="date"
                    disabled={isReadOnly}
                    className={`rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white disabled:cursor-not-allowed dark:disabled:bg-gray-800 disabled:text-gray-500 ${
                      errors.contractExpireDate?.message
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700'
                    }`}
                  />
                  {errors.contractExpireDate?.message && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {errors.contractExpireDate.message as string}
                    </span>
                  )}
                </label>
              </div>

              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Contract file</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Attach or download the contract PDF for this shipping line.
                </p>
                {contractFile ? (
                  <div className="mt-3 flex flex-col gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{contractFile.name}</span>
                      <span className="text-xs text-green-700 dark:text-green-200/80">
                        {contractFile.mimeType}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadClick}
                        disabled={!contractFile.id || documentDownload.isPending}
                      >
                        Download
                      </Button>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveContractFile}
                          disabled={isUploading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ) : isReadOnly ? (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">No contract file uploaded.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      disabled={isReadOnly}
                      className="text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-200 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadClick}
                      loading={isUploading}
                      disabled={!selectedFile || isUploading || isReadOnly}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {uploadStatus === 'uploading' && 'Uploading...'}
                      {uploadStatus === 'success' && 'Upload complete'}
                      {uploadStatus === 'error' && 'Upload failed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isUploading}
            >
              Close
            </Button>
            {mode !== 'view' && (
              <Button type="submit" size="sm" loading={isSaving}>
                Save shipping line
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShippingLineModal;
