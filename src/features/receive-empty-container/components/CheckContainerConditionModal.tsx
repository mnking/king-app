import React from 'react';
import { FileText, Image as ImageIcon, UploadCloud, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import { formatDateTime } from '@/shared/utils/date-format';
import { useCheckContainerConditionModal } from '../hooks';
import type { EmptyContainerReceivingListItem } from '../types';

interface CheckContainerConditionModalProps {
  open: boolean;
  mode?: 'check' | 'edit' | 'view';
  record: EmptyContainerReceivingListItem | null;
  onClose: () => void;
  canCheck: boolean;
  canWrite: boolean;
}

const statusBadge = (status: EmptyContainerReceivingListItem['workingResultStatus']) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (status) {
    case 'waiting':
      return `${base} bg-amber-100 text-amber-800`;
    case 'rejected':
      return `${base} bg-rose-100 text-rose-800`;
    case 'received':
      return `${base} bg-emerald-100 text-emerald-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
};

const CheckContainerConditionModal: React.FC<CheckContainerConditionModalProps> = ({
  open,
  mode = 'check',
  record,
  onClose,
  canCheck,
  canWrite,
}) => {
  const canCheckAction = canCheck || canWrite;
  const {
    control,
    handleSubmit,
    isReadOnly,
    isSaving,
    containerLabel,
    documentFile,
    imageFile,
    selectedDocument,
    selectedImage,
    documentUploadStatus,
    imageUploadStatus,
    isUploadingDocument,
    isUploadingImage,
    isDownloading,
    handleDocumentSelect,
    handleImageSelect,
    handleUploadDocument,
    handleUploadImage,
    handleDocumentDownload,
    handleImageDownload,
    handleReplaceDocument,
    handleRemoveDocument,
    handleReplaceImage,
    handleRemoveImage,
    handleReceive,
    handleReject,
    handleSave,
  } = useCheckContainerConditionModal({
    open,
    mode,
    record,
    onClose,
    canCheck,
    canWrite,
  });

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {mode} empty container
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {record.containerNumber}
              </h3>
              <span className={statusBadge(record.workingResultStatus)}>
                {record.workingResultStatus ?? 'N/A'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {containerLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {record.workingResultStatus === 'rejected' && mode === 'check' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            Previously rejected — please re-check and update evidence.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Reference info
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Read-only details for verification.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Container</p>
                <p className="font-medium text-gray-900 dark:text-white">{record.containerNumber}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{containerLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Plan stuffing</p>
                <p className="font-medium">{record.planStuffingNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Estimated stuffing</p>
                <p className="font-medium">{formatDateTime(record.estimatedStuffingTime)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Check inputs
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Record notes and truck/driver details.
              </p>
            </div>
            <FormTextarea
              control={control}
              name="note"
              label="Note"
              rows={4}
              disabled={isReadOnly}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput
                control={control}
                name="plateNumber"
                label="Vehicle plate number"
                required
                disabled={isReadOnly}
              />
              <FormInput
                control={control}
                name="driverName"
                label="Driver name"
                required
                disabled={isReadOnly}
              />
            </div>
          </section>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <FileText className="h-4 w-4" />
              Upload document
            </div>
            {documentFile ? (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
                <div className="font-semibold">{documentFile.name}</div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDocumentDownload}
                    disabled={!documentFile.id || isDownloading}
                  >
                    Download
                  </Button>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleReplaceDocument}
                    >
                      Replace
                    </Button>
                  )}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleRemoveDocument}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {isReadOnly ? (
                  'No document uploaded.'
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      onChange={handleDocumentSelect}
                      className="text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-200 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadDocument}
                      loading={isUploadingDocument}
                      disabled={!selectedDocument || isUploadingDocument}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {documentUploadStatus === 'uploading' && 'Uploading...'}
                      {documentUploadStatus === 'success' && 'Upload complete'}
                      {documentUploadStatus === 'error' && 'Upload failed'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <ImageIcon className="h-4 w-4" />
              Upload image
            </div>
            {imageFile ? (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
                <div className="flex items-start gap-3">
                  <div>
                    <div className="font-semibold">{imageFile.name}</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleImageDownload}
                    disabled={!imageFile.id || isDownloading}
                  >
                    Download
                  </Button>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleReplaceImage}
                    >
                      Replace
                    </Button>
                  )}
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {isReadOnly ? (
                  'No image uploaded.'
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-200 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadImage}
                      loading={isUploadingImage}
                      disabled={!selectedImage || isUploadingImage}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {imageUploadStatus === 'uploading' && 'Uploading...'}
                      {imageUploadStatus === 'success' && 'Upload complete'}
                      {imageUploadStatus === 'error' && 'Upload failed'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'edit' && (
            <Button
              type="button"
              onClick={handleSubmit(handleSave)}
              loading={isSaving}
              disabled={!canWrite}
            >
              Save
            </Button>
          )}
          {mode === 'check' && (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={handleSubmit(handleReject)}
                disabled={isSaving || !canCheckAction}
              >
                Reject
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(handleReceive)}
                loading={isSaving}
                disabled={!canCheckAction}
              >
                Receive
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckContainerConditionModal;
