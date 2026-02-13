import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, XCircle, File as FileIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { documentConfig } from '../config';
import { formatBytes, validateFile } from '../helpers/validation';
import { useDocumentUpload } from '../hooks/use-document-upload';
import type { Document } from '../types';

interface DocumentUploaderProps {
  ownerId?: string;
  scope?: string;
  tags?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (document: Document) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  ownerId,
  scope,
  tags,
  description,
  metadata,
  onSuccess: onSuccessCallback,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const {
    upload,
    cancel,
    reset,
    status,
    progress,
    error,
    isUploading,
    canRetry,
  } = useDocumentUpload({
    ownerId,
    scope,
    tags,
    description,
    metadata,
    onSuccess: (document) => {
      onSuccessCallback?.(document);
    },
  });

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationErrors([]);
    setValidationWarnings([]);

    if (file) {
      const validationResult = validateFile(file);
      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors);
      }
      if (validationResult.warnings.length > 0) {
        setValidationWarnings(validationResult.warnings);
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    fileInputRef.current?.setAttribute('value', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setValidationErrors([
        // TODO(i18n): Localize error when no file selected.
        'Please select a file before uploading.',
      ]);
      return;
    }

    setValidationErrors([]);

    upload(selectedFile);
  };

  useEffect(() => {
    if (status === 'success') {
      clearSelection();
    }
  }, [status]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'creating':
        // TODO(i18n): Localize creating status label.
        return 'Preparing upload...';
      case 'uploading':
        // TODO(i18n): Localize uploading status label.
        return 'Uploading document...';
      case 'confirming':
        // TODO(i18n): Localize confirming status label.
        return 'Finalizing upload...';
      case 'success':
        // TODO(i18n): Localize success status label.
        return 'Upload complete!';
      case 'cancelled':
        // TODO(i18n): Localize cancelled status label.
        return 'Upload cancelled.';
      case 'error':
        // TODO(i18n): Localize error status label.
        return 'Upload failed.';
      default:
        return '';
    }
  }, [status]);

  const effectiveMaxSize = useMemo(
    () => documentConfig.maxFileSizeMb * 1024 * 1024,
    [],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="document-upload-input"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {/* TODO(i18n): Localize uploader label. */}
            Upload document
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {/* TODO(i18n): Localize uploader helper text. */}
            Allowed types: {documentConfig.allowedMimeTypes.join(', ')}. Max size:{' '}
            {formatBytes(effectiveMaxSize)}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="document-upload-input"
            ref={fileInputRef}
            type="file"
            aria-label="Select document to upload"
            onChange={selectFile}
            className="flex-1 text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700"
          />

          <Button
            type="button"
            variant="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || validationErrors.length > 0}
            loading={isUploading}
          >
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            {/* TODO(i18n): Localize upload button text. */}
            Upload
          </Button>

          {isUploading && (
            <Button type="button" variant="ghost" onClick={cancel}>
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              {/* TODO(i18n): Localize cancel upload text. */}
              Cancel
            </Button>
          )}

          {canRetry && (
            <Button type="button" variant="outline" onClick={() => selectedFile && upload(selectedFile)}>
              {/* TODO(i18n): Localize retry upload text. */}
              Retry
            </Button>
          )}
        </div>

        {selectedFile && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start gap-3">
              <FileIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                {/* TODO(i18n): Localize remove file text. */}
                Remove
              </Button>
            </div>
          </div>
        )}

        {status !== 'idle' && statusLabel && (
          <div
            role="status"
            aria-live="polite"
            className="text-sm text-slate-600 dark:text-slate-300"
          >
            {statusLabel}
          </div>
        )}

        {(isUploading || status === 'confirming') && (
          <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        )}

        {validationErrors.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-400">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        {validationWarnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-600 dark:text-amber-400">
            {validationWarnings.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        {(status === 'success' || status === 'cancelled' || status === 'error') && (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={reset}>
              {/* TODO(i18n): Localize reset uploader text. */}
              Reset
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
