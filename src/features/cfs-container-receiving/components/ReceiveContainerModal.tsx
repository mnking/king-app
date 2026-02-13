import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Truck } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import { formatDate, formatDateTime } from '@/shared/utils/date-format';
import type { ReceivingContainerRow } from '../hooks/use-receiving-containers';

const receiveContainerSchema = z.object({
  truckNo: z.string().trim().min(1, 'Truck number is required'),
  notes: z.string().optional(),
});

type ReceiveContainerForm = z.infer<typeof receiveContainerSchema>;

type ReceiveContainerModalProps = {
  open: boolean;
  container: ReceivingContainerRow | null;
  onClose: () => void;
  onSubmit: (payload: { truckNo: string; notes?: string | null }) => Promise<void>;
  isSubmitting?: boolean;
  viewMode?: boolean;
};

export const ReceiveContainerModal: React.FC<ReceiveContainerModalProps> = ({
  open,
  container,
  onClose,
  onSubmit,
  isSubmitting = false,
  viewMode = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<ReceiveContainerForm>({
    resolver: zodResolver(receiveContainerSchema),
    defaultValues: {
      truckNo: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (viewMode && container) {
      reset({
        truckNo: container.planContainerTruckNo ?? '',
        notes: container.planContainerNotes ?? '',
      });
      return;
    }
    reset({ truckNo: '', notes: '' });
  }, [container, open, reset, viewMode]);

  const eta = useMemo(() => {
    const value = container?.eta ?? container?.bookingOrder?.eta ?? null;
    return formatDate(value);
  }, [container]);

  const receivedAt = useMemo(
    () => formatDateTime(container?.planContainerReceivedAt ?? null),
    [container],
  );

  if (!open || !container) return null;

  const isSubmittingBusy = isSubmitting || isFormSubmitting;
  const isFieldDisabled = viewMode || isSubmittingBusy;
  const receivedTypeLabel = container.planContainerReceivedType ?? 'NORMAL';
  const title = viewMode ? 'Received container details' : 'Receive container';
  const description = viewMode
    ? 'Review recorded receiving information.'
    : 'Provide truck information to confirm receiving.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Truck className="h-5 w-5 text-blue-600" />
              {title}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {container.containerNo}
            </div>
            {container.summary?.typeCode ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {container.summary.typeCode}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span>Agent: {container.bookingOrder?.agentCode ?? '—'}</span>
            <span>• ETA: {eta}</span>
            {container.sealNumber ? <span>• Seal: {container.sealNumber}</span> : null}
          </div>
        </div>

        {viewMode ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100">
            <div>
              <span className="font-semibold">Received at:</span> {receivedAt}
            </div>
            <div className="mt-1">
              <span className="font-semibold">Received type:</span> {receivedTypeLabel}
            </div>
          </div>
        ) : null}

        <form
          className="mt-5 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            if (viewMode) return;
            await onSubmit({
              truckNo: values.truckNo.trim(),
              notes: values.notes?.trim() || null,
            });
          })}
        >
          <FormInput<ReceiveContainerForm>
            name="truckNo"
            control={control}
            label="Truck number"
            placeholder="Enter truck number"
            required={!viewMode}
            disabled={isFieldDisabled}
          />
          <FormTextarea<ReceiveContainerForm>
            name="notes"
            control={control}
            label="Notes (optional)"
            placeholder="Add notes if needed"
            rows={3}
            disabled={isFieldDisabled}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmittingBusy}
            >
              {viewMode ? 'Close' : 'Cancel'}
            </Button>
            {!viewMode ? (
              <Button type="submit" loading={isSubmittingBusy}>
                Receive
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveContainerModal;
