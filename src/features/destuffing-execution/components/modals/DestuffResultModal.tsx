import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save, FileText, Image } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Textarea } from '@/shared/components/ui/Textarea';
import { useDocumentDownload, useDocumentUpload } from '@/features/document-service';
import type { HblDestuffStatus } from '@/features/destuffing-execution/types';
import { DestuffResultSchema, type DestuffResultFormValues } from '@/features/destuffing-execution/schemas';
import { useRecordDestuffResult } from '@/features/destuffing-execution/hooks';
import { Modal } from './Modal';

interface DestuffResultModalProps {
  planId: string;
  containerId: string;
  hbl: HblDestuffStatus;
  onClose: () => void;
}

export const DestuffResultModal = ({
  planId,
  containerId,
  hbl,
  onClose,
}: DestuffResultModalProps) => {
  const { mutateAsync, isPending } = useRecordDestuffResult();
  const documentDownload = useDocumentDownload();
  const existingResult = hbl.destuffResult;

  const form = useForm<DestuffResultFormValues>({
    resolver: zodResolver(DestuffResultSchema),
    defaultValues: {
      onHold: existingResult?.onHoldFlag ?? false,
      note: existingResult?.note ?? '',
      document: existingResult?.document ?? null,
      image: existingResult?.image ?? null,
    },
  });

  const {
    upload: uploadDocument,
    isUploading: docUploading,
    status: docStatus,
  } = useDocumentUpload({
    metadata: { context: 'destuff', planId, containerId, hblId: hbl.hblId, type: 'document' },
    onSuccess: (document) =>
      form.setValue(
        'document',
        {
          id: document.id,
          name: document.name ?? 'document',
          url:
            typeof document.actions?.downloadUrl === 'string'
              ? document.actions.downloadUrl
              : undefined,
          mimeType: document.fileType ?? 'application/octet-stream',
          sizeBytes: document.size ?? undefined,
        },
        { shouldValidate: true, shouldDirty: true },
      ),
  });

  const {
    upload: uploadImage,
    isUploading: imgUploading,
    status: imgStatus,
  } = useDocumentUpload({
    metadata: { context: 'destuff', planId, containerId, hblId: hbl.hblId, type: 'image' },
    onSuccess: (document) =>
      form.setValue(
        'image',
        {
          id: document.id,
          name: document.name ?? 'image',
          url:
            typeof document.actions?.downloadUrl === 'string'
              ? document.actions.downloadUrl
              : undefined,
          mimeType: document.fileType ?? 'application/octet-stream',
          sizeBytes: document.size ?? undefined,
        },
        { shouldValidate: true, shouldDirty: true },
      ),
  });

  useEffect(() => {
    if (docStatus === 'success' || imgStatus === 'success') {
      form.trigger();
    }
  }, [docStatus, imgStatus, form]);

  const documentValue = form.watch('document');
  const imageValue = form.watch('image');

  const onSubmit = async (values: DestuffResultFormValues) => {
    await mutateAsync({
      planId,
      containerId,
      hblId: hbl.hblId,
      payload: {
        document: values.document ?? null,
        image: values.image ?? null,
        note: values.note ?? null,
        onHold: values.onHold,
        updateMetadataOnly: hbl.destuffStatus === 'done',
      },
    });
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Destuff Result - ${hbl.hblCode}`}
      contentClassName="max-w-2xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                Document
              </label>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Upload supporting files</span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <input
              type="file"
              accept="*/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDocument(file);
              }}
              disabled={docUploading}
              className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600"
            />
            {documentValue ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex-1 min-w-[180px] text-xs font-medium text-gray-700 dark:text-gray-200 break-all font-mono">
                  {documentValue.name}
                </div>
                {documentValue.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      documentDownload.mutate({
                        documentId: documentValue.id,
                        fileName: documentValue.name ?? undefined,
                        openInNewTab: true,
                      })
                    }
                    disabled={documentDownload.isPending}
                  >
                    Download
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    form.setValue('document', null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No document uploaded</p>
            )}
            {docUploading && (
              <p className="text-xs text-blue-600 dark:text-blue-400">Uploading...</p>
            )}
            {form.formState.errors.document && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {form.formState.errors.document.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                Image
              </label>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Photo evidence if available</span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }}
              disabled={imgUploading}
              className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600"
            />
            {imageValue ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex-1 min-w-[180px] text-xs font-medium text-gray-700 dark:text-gray-200 break-all font-mono">
                  {imageValue.name}
                </div>
                {imageValue.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      documentDownload.mutate({
                        documentId: imageValue.id,
                        fileName: imageValue.name ?? undefined,
                        openInNewTab: true,
                      })
                    }
                    disabled={documentDownload.isPending}
                  >
                    Download
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    form.setValue('image', null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No image uploaded</p>
            )}
            {imgUploading && (
              <p className="text-xs text-blue-600 dark:text-blue-400">Uploading...</p>
            )}
            {form.formState.errors.image && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {form.formState.errors.image.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
            Note
          </label>
          <Textarea
            {...form.register('note')}
            placeholder="Add details about the destuff result (optional)"
            className="resize-none"
            rows={3}
          />
          {form.formState.errors.note && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {form.formState.errors.note.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-700/50 dark:bg-orange-900/20">
          <label className="inline-flex items-center gap-3 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
            <input
              type="checkbox"
              {...form.register('onHold')}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-2 focus:ring-orange-500 dark:border-gray-600"
            />
            <span className="font-medium">Mark HBL on hold</span>
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400 ml-7">
            Use when the whole HBL must pause or follow customs hold.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending || docUploading || imgUploading}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
