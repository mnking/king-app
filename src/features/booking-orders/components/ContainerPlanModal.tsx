import React, { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/Button';
import { CARGO_RELEASE_STATUS, CARGO_RELEASE_STATUS_LABELS } from '@/shared/constants/container-status';
import DocumentUploader from '@/features/document-service/components/DocumentUploader';
import { useDocumentDownload } from '@/features/document-service';
import { toUtcISOString } from '@/shared/utils/dateTimeUtils';

export interface ContainerPlanFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
}

export interface ContainerPlanData {
  containerId?: string;
  containerNo?: string;
  eta?: string;
  cargoReleaseStatus?: string;
  extractFrom?: string;
  extractTo?: string;
  containerFile?: ContainerPlanFile | null;
}

interface ContainerPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  container?: ContainerPlanData | null;
  bookingEta?: string | null;
  canEdit?: boolean;
  onSave?: (data: ContainerPlanData) => void;
}

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '';
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export const ContainerPlanModal: React.FC<ContainerPlanModalProps> = ({
  isOpen,
  onClose,
  container,
  bookingEta,
  canEdit = true,
  onSave,
}) => {
  const {
    register,
    reset,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    watch,
  } = useForm<ContainerPlanData>({
    defaultValues: {
      containerId: '',
      containerNo: '',
      eta: '',
      cargoReleaseStatus: CARGO_RELEASE_STATUS.NOT_REQUESTED,
      extractFrom: '',
      extractTo: '',
      containerFile: null,
    },
  });

  const eta = watch('eta');
  const cargoReleaseStatus = watch('cargoReleaseStatus');
  const extractFrom = watch('extractFrom');
  const extractTo = watch('extractTo');
  const containerFile = watch('containerFile');
  const initialCargoStatusRef = useRef<string>(CARGO_RELEASE_STATUS.NOT_REQUESTED);
  const documentDownload = useDocumentDownload();

  const documentOwnerId = container?.containerId ?? undefined;
  const documentMetadata = useMemo(
    () => ({
      context: 'container-plan',
      containerId: container?.containerId,
      containerNo: container?.containerNo,
    }),
    [container?.containerId, container?.containerNo],
  );

  useEffect(() => {
    if (!isOpen) return;
    initialCargoStatusRef.current =
      container?.cargoReleaseStatus ?? CARGO_RELEASE_STATUS.NOT_REQUESTED;
    reset({
      containerId: container?.containerId,
      containerNo: container?.containerNo,
      eta: bookingEta ? bookingEta.slice(0, 10) : (container?.eta ? container.eta.slice(0, 10) : ''),
      cargoReleaseStatus: container?.cargoReleaseStatus ?? CARGO_RELEASE_STATUS.NOT_REQUESTED,
      extractFrom: container?.extractFrom ? container.extractFrom.slice(0, 10) : '',
      extractTo: container?.extractTo ? container.extractTo.slice(0, 10) : '',
      containerFile: container?.containerFile ?? null,
    });
  }, [bookingEta, container, isOpen, reset]);

  const cargoOptions = useMemo(
    () => {
      const current = cargoReleaseStatus || CARGO_RELEASE_STATUS.NOT_REQUESTED;
      const allowedMap: Record<string, CARGO_RELEASE_STATUS[]> = {
        [CARGO_RELEASE_STATUS.NOT_REQUESTED]: [
          CARGO_RELEASE_STATUS.NOT_REQUESTED,
          CARGO_RELEASE_STATUS.REQUESTED,
          CARGO_RELEASE_STATUS.APPROVED,
        ],
        [CARGO_RELEASE_STATUS.REQUESTED]: [
          CARGO_RELEASE_STATUS.REQUESTED,
          CARGO_RELEASE_STATUS.APPROVED,
        ],
        [CARGO_RELEASE_STATUS.APPROVED]: [CARGO_RELEASE_STATUS.APPROVED],
      };

      const allowed = allowedMap[current] ?? [current];

      return Object.values(CARGO_RELEASE_STATUS).map((value) => ({
        value,
        label: CARGO_RELEASE_STATUS_LABELS[value],
        disabled: !allowed.includes(value as CARGO_RELEASE_STATUS),
      }));
    },
    [cargoReleaseStatus],
  );

  if (!isOpen) return null;

  const submitPlan = handleSubmit((values) => {
    if (values.extractFrom && values.extractTo) {
      const fromDate = new Date(values.extractFrom);
      const toDate = new Date(values.extractTo);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) && fromDate > toDate) {
        setError('extractTo', {
          type: 'validate',
          message: 'Destuff end date cannot be before start date',
        });
        return;
      }
    }

    const currentStatus = values.cargoReleaseStatus;
    const previousStatus = initialCargoStatusRef.current;
    const allowedTransitions = new Set([
      `${CARGO_RELEASE_STATUS.NOT_REQUESTED}->${CARGO_RELEASE_STATUS.REQUESTED}`,
      `${CARGO_RELEASE_STATUS.NOT_REQUESTED}->${CARGO_RELEASE_STATUS.APPROVED}`,
      `${CARGO_RELEASE_STATUS.REQUESTED}->${CARGO_RELEASE_STATUS.APPROVED}`,
    ]);

    const transitionKey = `${previousStatus}->${currentStatus}`;
    const isSame = previousStatus === currentStatus;

    if (!isSame && !allowedTransitions.has(transitionKey)) {
      setError('cargoReleaseStatus', {
        type: 'validate',
        message: 'Invalid destuff request status change',
      });
      return;
    }

    if (values.eta) {
      const etaDate = new Date(values.eta);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(etaDate.getTime()) && etaDate < today) {
        setError('eta', {
          type: 'validate',
          message: 'ETA must be a future date',
        });
        return;
      }
    }

    const payload: ContainerPlanData = {
      ...values,
      eta: values.eta ? toUtcISOString(values.eta) : undefined,
      extractFrom: values.extractFrom ? toUtcISOString(values.extractFrom) : undefined,
      extractTo: values.extractTo ? toUtcISOString(values.extractTo) : undefined,
    };
    onSave?.(payload);
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <input type="hidden" {...register('containerId')} />
        <input type="hidden" {...register('containerNo')} />
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Container Plan
            </p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {container?.containerNo || 'Container'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Update ETA, destuff window, request status, and upload plan documents.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                ETA
              </label>
              <input
                type="date"
                value={eta ?? ''}
                {...register('eta')}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
              />
              {errors.eta?.message ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.eta.message as string}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Destuff Request Status
              </label>
              <select
                value={cargoReleaseStatus}
                {...register('cargoReleaseStatus')}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
              >
                {cargoOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.cargoReleaseStatus?.message ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.cargoReleaseStatus.message as string}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Destuff Date
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
                  From
                </label>
                <input
                  type="date"
                  value={extractFrom ?? ''}
                  {...register('extractFrom')}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
                  To
                </label>
                <input
                  type="date"
                  value={extractTo ?? ''}
                  {...register('extractTo')}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                />
              </div>
            </div>
            {errors.extractTo?.message ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors.extractTo.message as string}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Plan Document
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Upload packing list or supporting files.
                </p>
              </div>
            </div>

            {!containerFile ? (
              canEdit && (
                <DocumentUploader
                  ownerId={documentOwnerId}
                  description="Container plan document"
                  metadata={documentMetadata}
                  onSuccess={(document) => {
                    setValue(
                      'containerFile',
                      {
                        id: document.id,
                        name: document.name,
                        mimeType: document.fileType,
                        url: null,
                        sizeBytes: document.size,
                      },
                      { shouldDirty: true },
                    );
                  }}
                />
              )
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {containerFile?.name}
                  {containerFile?.sizeBytes ? (
                    <span className="ml-2 text-xs text-slate-500">
                      ({formatFileSize(containerFile.sizeBytes)})
                    </span>
                  ) : null}
                </div>
                {containerFile?.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      documentDownload.mutate({
                        documentId: containerFile.id,
                        fileName: containerFile.name ?? undefined,
                        openInNewTab: true,
                      })
                    }
                    disabled={documentDownload.isPending}
                  >
                    Download
                  </Button>
                )}
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValue('containerFile', null, { shouldDirty: true })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canEdit}
            onClick={() => {
              void submitPlan();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContainerPlanModal;
