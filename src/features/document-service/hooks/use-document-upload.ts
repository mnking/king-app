import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { documentApi } from '@/services/apiDocument';
import type { Document } from '../types';
import { inferFileExtension, validateFile } from '../helpers/validation';
import type { BackendConstraints } from '../helpers/validation';
import { uploadFileWithProgress } from '../helpers/upload';
import { documentListPrefixKey } from './query-keys';

export type UploadStatus =
  | 'idle'
  | 'validating'
  | 'creating'
  | 'uploading'
  | 'confirming'
  | 'success'
  | 'error'
  | 'cancelled';

interface UseDocumentUploadOptions {
  ownerId?: string;
  scope?: string;
  tags?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (document: Document) => void;
  onError?: (error: Error) => void;
}

interface UploadVariables {
  file: File;
  description?: string;
  scope?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

type UploadError = Error & { status?: number; responseText?: string };

const mapUploadError = (error: UploadError): Error => {
  if (error.name === 'AbortError') {
    return new DOMException(
      // TODO(i18n): Localize upload cancelled error message.
      'Upload cancelled.',
      'AbortError',
    );
  }

  if (error.status === 403 || error.responseText?.includes('SignatureDoesNotMatch')) {
    return new Error(
      // TODO(i18n): Localize expired upload link copy (Vietnamese).
      'Link hết hạn hoặc không hợp lệ; vui lòng thử lại.',
    );
  }

  return error;
};

export const useDocumentUpload = ({
  ownerId,
  scope,
  tags,
  description,
  metadata,
  onSuccess,
  onError,
}: UseDocumentUploadOptions) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      file,
      description: overrideDescription,
      scope: overrideScope,
      tags: overrideTags,
      metadata: overrideMetadata,
    }: UploadVariables) => {
      setStatus('validating');
      setError(null);
      setProgress(0);

      const initialValidation = validateFile(file);
      if (!initialValidation.isValid) {
        throw new Error(
          initialValidation.errors[0] ??
            // TODO(i18n): Localize generic invalid file message.
            'Invalid file.',
        );
      }

      setStatus('creating');

      const fileExtension = inferFileExtension(file);

      const finalScope = overrideScope ?? scope;
      const finalTags = overrideTags ?? tags;
      const finalDescription = overrideDescription ?? description;
      const finalMetadata = overrideMetadata ?? metadata;

      const created = await documentApi.createDocument({
        ...(ownerId && { ownerId }),
        name: file.name,
        ...(finalDescription && { description: finalDescription }),
        ...(finalScope && { scope: finalScope }),
        ...(finalTags && { tags: finalTags }),
        ...(fileExtension && { fileType: fileExtension }),
        size: file.size,
        ...(finalMetadata && { metadata: finalMetadata }),
      });

      const backendConstraints: BackendConstraints = {
        maxSize: created.maxSize,
        allowedMime: created.allowedMime,
        allowedMimeTypes: created.allowedMimeTypes,
      };

      const constraintValidation = validateFile(file, backendConstraints);
      if (!constraintValidation.isValid) {
        throw new Error(
          constraintValidation.errors[0] ??
            // TODO(i18n): Localize generic invalid file message.
            'Invalid file.',
        );
      }

      const headers = {
        ...(created.requiredHeaders ?? {}),
      };

      if (file.type && !headers['Content-Type']) {
        headers['Content-Type'] = file.type;
      }

      setStatus('uploading');
      abortControllerRef.current = new AbortController();

      try {
        await uploadFileWithProgress(created.uploadUrl, file, {
          headers,
          signal: abortControllerRef.current.signal,
          onProgress: setProgress,
        });
      } catch (uploadError) {
        throw mapUploadError(uploadError as UploadError);
      } finally {
        abortControllerRef.current = null;
      }

      setStatus('confirming');

      let confirmed: Document;
      try {
        confirmed = await documentApi.confirmDocument(created.documentId, {
          status: 'UPLOADED',
        });
      } catch (confirmError) {
        const message =
          confirmError instanceof Error ? confirmError.message : '';
        if (message.includes('Unexpected response when confirming document upload.')) {
          confirmed = {
            id: created.documentId,
            ownerId: ownerId ?? '',
            name: file.name,
            description: finalDescription ?? null,
            fileType: file.type || (fileExtension ? `application/${fileExtension}` : null),
            size: file.size,
            status: 'UPLOADED',
            scope: finalScope ?? null,
            tags: finalTags ?? [],
            createdAt: new Date().toISOString(),
            createdBy: null,
            updatedAt: null,
            updatedBy: null,
            metadata: finalMetadata ?? undefined,
            bucket: null,
            key: null,
            sourceId: null,
            sourceSystemReference: null,
            actions: undefined,
          };
        } else {
          throw confirmError;
        }
      }

      return confirmed;
    },
    onSuccess: (document) => {
      setStatus('success');
      setProgress(100);
      setError(null);
      setCurrentFile(null);

      toast.success(
        // TODO(i18n): Localize upload success toast.
        'Document uploaded successfully.',
      );

      onSuccess?.(document);

      queryClient.invalidateQueries({
        queryKey: documentListPrefixKey(ownerId),
        exact: false,
      });
    },
    onError: (unknownError) => {
      const mappedError = mapUploadError(unknownError as UploadError);
      setStatus(mappedError.name === 'AbortError' ? 'cancelled' : 'error');
      setError(mappedError);
      toast.error(
        mappedError.message ||
          // TODO(i18n): Localize upload default error.
          'Unable to upload the document. Please try again.',
      );
      onError?.(mappedError);
    },
    retry(failureCount, error) {
      const mapped = mapUploadError(error as UploadError);
      if (mapped.message.includes('Link hết hạn') || mapped.name === 'AbortError') {
        return false;
      }
      return failureCount < 2;
    },
  });

  const upload = useCallback(
    (file: File, overrides?: Partial<Omit<UploadVariables, 'file'>>) => {
      setCurrentFile(file);
      mutation.mutate({
        file,
        description: overrides?.description,
        scope: overrides?.scope,
        tags: overrides?.tags,
        metadata: overrides?.metadata,
      });
    },
    [mutation],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('cancelled');
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus('idle');
    setProgress(0);
    setError(null);
    setCurrentFile(null);
    mutation.reset();
  }, [mutation]);

  const canRetry = useMemo(
    () => status === 'error' || status === 'cancelled',
    [status],
  );

  return {
    upload,
    cancel,
    reset,
    canRetry,
    status,
    progress,
    currentFile,
    error,
    isUploading: status === 'uploading' || status === 'confirming' || status === 'creating',
    mutation,
  };
};
