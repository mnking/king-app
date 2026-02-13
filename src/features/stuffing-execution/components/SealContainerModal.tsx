import { useEffect, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import {
  DocumentUploader,
  useDocumentDownload,
  type Document,
} from '@/features/document-service';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Textarea } from '@/shared/components/ui/Textarea';
import type { DocumentFileInfo } from '@/features/stuffing-planning';
import { Modal } from './modals/Modal';

interface SealContainerModalProps {
  open: boolean;
  containerNumber: string;
  ownerId: string;
  onClose: () => void;
  onSubmit: (payload: {
    sealNumber: string;
    stuffingDocument: DocumentFileInfo;
    stuffingPhoto?: DocumentFileInfo | null;
    stuffingNote?: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const mapDocumentFile = (document: Document): DocumentFileInfo => ({
  id: document.id,
  name: document.name,
  mimeType: document.fileType ?? 'application/octet-stream',
  url:
    (document.actions as { downloadUrl?: string } | undefined)?.downloadUrl ??
    document.key ??
    null,
  sizeBytes: document.size ?? null,
});

export const SealContainerModal = ({
  open,
  containerNumber,
  ownerId,
  onClose,
  onSubmit,
  isSubmitting = false,
}: SealContainerModalProps) => {
  const documentDownload = useDocumentDownload();
  const [sealNumber, setSealNumber] = useState('');
  const [note, setNote] = useState('');
  const [documentFile, setDocumentFile] = useState<DocumentFileInfo | null>(null);
  const [photoFile, setPhotoFile] = useState<DocumentFileInfo | null>(null);
  const [errors, setErrors] = useState<{ sealNumber?: string; document?: string }>({});

  useEffect(() => {
    if (!open) {
      setSealNumber('');
      setNote('');
      setDocumentFile(null);
      setPhotoFile(null);
      setErrors({});
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return sealNumber.trim().length > 0 && Boolean(documentFile) && !isSubmitting;
  }, [documentFile, isSubmitting, sealNumber]);

  const handleSubmit = async () => {
    const nextErrors: { sealNumber?: string; document?: string } = {};
    if (!sealNumber.trim()) {
      nextErrors.sealNumber = 'Seal number is required.';
    }
    if (!documentFile) {
      nextErrors.document = 'Stuffing document is required.';
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !documentFile) {
      return;
    }

    await onSubmit({
      sealNumber: sealNumber.trim(),
      stuffingDocument: documentFile,
      stuffingPhoto: photoFile,
      stuffingNote: note.trim() ? note.trim() : null,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Seal Container ${containerNumber}`}
      contentClassName="max-w-3xl"
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Seal number
          </label>
          <Input
            value={sealNumber}
            onChange={(event) => setSealNumber(event.target.value)}
            placeholder="Enter seal number"
          />
          {errors.sealNumber ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.sealNumber}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Stuffing document
              </label>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Required
            </span>
          </div>
          {!documentFile ? (
            <DocumentUploader
              ownerId={ownerId}
              description="Stuffing document"
              metadata={{ context: 'stuffing-seal', containerNumber }}
              onSuccess={(document) => setDocumentFile(mapDocumentFile(document))}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {documentFile.name}
              </div>
              {documentFile.id && (
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDocumentFile(null)}
              >
                Remove
              </Button>
            </div>
          )}
          {errors.document ? (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.document}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Container photo (optional)
            </label>
          </div>
          {!photoFile ? (
            <DocumentUploader
              ownerId={ownerId}
              description="Stuffing photo"
              metadata={{ context: 'stuffing-seal', containerNumber, type: 'photo' }}
              onSuccess={(document) => setPhotoFile(mapDocumentFile(document))}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {photoFile.name}
              </div>
              {photoFile.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    documentDownload.mutate({
                      documentId: photoFile.id,
                      fileName: photoFile.name ?? undefined,
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
                onClick={() => setPhotoFile(null)}
              >
                Remove
              </Button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add note"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SealContainerModal;
