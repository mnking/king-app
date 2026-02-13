import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDocumentDownload, useDocumentUpload } from '@/features/document-service';
import {
  useReceiveContainer,
  useRejectContainer,
  useUpdateCheckingInfo,
} from './use-receive-empty-container-query';
import { useExportPlan } from '@/features/stuffing-planning/hooks/use-export-plans';
import {
  checkContainerConditionDefaultValues,
  checkContainerConditionSchema,
  type CheckContainerConditionForm,
} from '../schemas';
import type { EmptyContainerReceivingListItem, InspectionFile } from '../types';
import type { ExportPlanContainerCheckingFile } from '@/features/stuffing-planning/types';

interface UseCheckContainerConditionModalParams {
  open: boolean;
  mode: 'check' | 'edit' | 'view';
  record: EmptyContainerReceivingListItem | null;
  onClose: () => void;
  canCheck: boolean;
  canWrite: boolean;
}

export const useCheckContainerConditionModal = ({
  open,
  mode,
  record,
  onClose,
  canCheck,
  canWrite,
}: UseCheckContainerConditionModalParams) => {
  const [documentFile, setDocumentFile] = useState<InspectionFile | null>(null);
  const [imageFile, setImageFile] = useState<InspectionFile | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
  } = useForm<CheckContainerConditionForm>({
    defaultValues: checkContainerConditionDefaultValues,
    resolver: zodResolver(checkContainerConditionSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const receiveContainer = useReceiveContainer();
  const rejectContainer = useRejectContainer();
  const updateCheckingInfo = useUpdateCheckingInfo();
  const documentDownload = useDocumentDownload();
  const {
    upload: uploadDocument,
    isUploading: isUploadingDocument,
    status: documentUploadStatus,
  } = useDocumentUpload({
    onSuccess: (doc) => {
      setDocumentFile({
        id: doc.id,
        name: doc.name,
        mimeType: doc.fileType ?? 'application/octet-stream',
        url: (doc as any)?.actions?.downloadUrl ?? doc.key ?? '',
        sizeBytes: doc.size ?? 0,
      });
      setSelectedDocument(null);
      toast.success('Document uploaded');
    },
    onError: (err) => {
      toast.error(err.message || 'Document upload failed');
    },
  });
  const {
    upload: uploadImage,
    isUploading: isUploadingImage,
    status: imageUploadStatus,
  } = useDocumentUpload({
    onSuccess: (doc) => {
      setImageFile({
        id: doc.id,
        name: doc.name,
        mimeType: doc.fileType ?? 'application/octet-stream',
        url: (doc as any)?.actions?.downloadUrl ?? doc.key ?? '',
        sizeBytes: doc.size ?? 0,
      });
      setSelectedImage(null);
      toast.success('Image uploaded');
    },
    onError: (err) => {
      toast.error(err.message || 'Image upload failed');
    },
  });

  const isSaving =
    receiveContainer.isPending ||
    rejectContainer.isPending ||
    updateCheckingInfo.isPending;
  const isReadOnly = mode === 'view';
  const canCheckAction = canCheck || canWrite;
  const canEdit = canWrite;

  const planId = record?.planStuffingId ?? '';
  const { data: exportPlan } = useExportPlan(planId, {
    enabled: open && !!planId,
  });

  const buildInspectionFile = useCallback(
    (file?: ExportPlanContainerCheckingFile | null): InspectionFile | null => {
      if (!file?.id) return null;
      return {
        id: file.id,
        name: file.name ?? 'file',
        mimeType: 'application/octet-stream',
        url: file.url ?? '',
        sizeBytes: 0,
      };
    },
    [],
  );

  useEffect(() => {
    if (!open || !record) return;
    const container = exportPlan?.containers.find((item) => item.id === record.containerId);
    const checkingResult = container?.checkingResult ?? null;
    const documentFromPlan = buildInspectionFile(checkingResult?.document);
    const imageFromPlan = buildInspectionFile(checkingResult?.image);

    reset({
      note: checkingResult?.note ?? record.inspection.note ?? null,
      plateNumber: checkingResult?.truckNumber ?? record.truck.plateNumber ?? '',
      driverName: checkingResult?.driverName ?? record.truck.driverName ?? '',
      document: documentFromPlan
        ? {
            id: documentFromPlan.id,
            name: documentFromPlan.name,
            mimeType: documentFromPlan.mimeType,
          }
        : record.inspection.documents[0]
        ? {
            id: record.inspection.documents[0].id,
            name: record.inspection.documents[0].name,
            mimeType: record.inspection.documents[0].mimeType,
          }
        : null,
      image: imageFromPlan
        ? {
            id: imageFromPlan.id,
            name: imageFromPlan.name,
            mimeType: imageFromPlan.mimeType,
          }
        : record.inspection.images[0]
        ? {
            id: record.inspection.images[0].id,
            name: record.inspection.images[0].name,
            mimeType: record.inspection.images[0].mimeType,
          }
        : null,
    });
    setDocumentFile(documentFromPlan ?? record.inspection.documents[0] ?? null);
    setImageFile(imageFromPlan ?? record.inspection.images[0] ?? null);
    setSelectedDocument(null);
    setSelectedImage(null);
  }, [buildInspectionFile, exportPlan, open, record, reset]);

  const containerLabel = useMemo(() => {
    if (!record) return '';
    return `${record.containerTypeCode}${record.containerSize ? ` (${record.containerSize})` : ''}`;
  }, [record]);

  const handleDocumentSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedDocument(file ?? null);
  }, []);

  const handleImageSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedImage(file ?? null);
  }, []);

  const handleUploadDocument = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    if (!selectedDocument) {
      toast.error('Select a document first');
      return;
    }
    uploadDocument(selectedDocument);
  }, [canCheckAction, selectedDocument, uploadDocument]);

  const handleUploadImage = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    if (!selectedImage) {
      toast.error('Select an image first');
      return;
    }
    uploadImage(selectedImage);
  }, [canCheckAction, selectedImage, uploadImage]);

  const handleDocumentDownload = useCallback(() => {
    if (!documentFile?.id) return;
    documentDownload.mutate({
      documentId: documentFile.id,
      fileName: documentFile.name ?? undefined,
      openInNewTab: true,
    });
  }, [documentDownload, documentFile]);

  const handleImageDownload = useCallback(() => {
    if (!imageFile?.id) return;
    documentDownload.mutate({
      documentId: imageFile.id,
      fileName: imageFile.name ?? undefined,
      openInNewTab: true,
    });
  }, [documentDownload, imageFile]);

  const handleReplaceDocument = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    setDocumentFile(null);
  }, [canCheckAction]);

  const handleRemoveDocument = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    setDocumentFile(null);
  }, [canCheckAction]);

  const handleReplaceImage = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    setImageFile(null);
  }, [canCheckAction]);

  const handleRemoveImage = useCallback(() => {
    if (!canCheckAction) {
      toast.error('You do not have permission to modify empty containers.');
      return;
    }
    setImageFile(null);
  }, [canCheckAction]);

  const handleReceive = useCallback(
    async (values: CheckContainerConditionForm) => {
      if (!canCheckAction) {
        toast.error('You do not have permission to modify empty containers.');
        return;
      }
      if (!record) return;
      try {
        await receiveContainer.mutateAsync({
          record,
          payload: {
            note: values.note?.trim() || null,
            documents: documentFile ? [documentFile] : [],
            images: imageFile ? [imageFile] : [],
            plateNumber: values.plateNumber || null,
            driverName: values.driverName || null,
          },
        });
        toast.success('Container received');
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to receive container');
      }
    },
    [canCheckAction, documentFile, imageFile, onClose, receiveContainer, record],
  );

  const handleReject = useCallback(
    async (values: CheckContainerConditionForm) => {
      if (!canCheckAction) {
        toast.error('You do not have permission to modify empty containers.');
        return;
      }
      if (!record) return;
      try {
        if (!values.note || values.note.trim() === '') {
          setError('note', { message: 'Note is required to reject.' });
          toast.error('Please add a note before rejecting.');
          return;
        }
        await rejectContainer.mutateAsync({
          record,
          payload: {
            note: values.note || null,
            documents: documentFile ? [documentFile] : [],
            images: imageFile ? [imageFile] : [],
            plateNumber: values.plateNumber || null,
            driverName: values.driverName || null,
          },
        });
        toast.success('Container rejected');
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reject container');
      }
    },
    [canCheckAction, documentFile, imageFile, onClose, record, rejectContainer, setError],
  );

  const handleSave = useCallback(
    async (values: CheckContainerConditionForm) => {
      if (!canEdit) {
        toast.error('You do not have permission to modify empty containers.');
        return;
      }
      if (!record) return;
      try {
        const payload = {
          note: values.note?.trim() || null,
          documents: documentFile ? [documentFile] : [],
          images: imageFile ? [imageFile] : [],
          plateNumber: values.plateNumber || null,
          driverName: values.driverName || null,
        };
        await updateCheckingInfo.mutateAsync({ record, payload });
        toast.success('Container updated');
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update container');
      }
    },
    [canEdit, documentFile, imageFile, onClose, record, updateCheckingInfo],
  );

  return {
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
    isDownloading: documentDownload.isPending,
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
  };
};
