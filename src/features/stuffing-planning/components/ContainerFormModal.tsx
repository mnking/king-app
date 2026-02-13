import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  FormCheckbox,
  FormDateTimeInput,
  FormInput,
  FormSingleSelect,
  FormTextarea,
} from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import {
  ContainerFormSchema,
  containerFormDefaultValues,
  type ContainerFormValues,
} from '../schemas';
import type { ExportPlanContainer } from '../types';
import { containerStatusLabel } from '../utils';

interface ContainerFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  container?: ExportPlanContainer | null;
  containerTypeOptions: Array<{ value: string; label: string }>;
  isContainerNumberLocked?: boolean;
  isSaving?: boolean;
  isDuplicateCheckReady?: boolean;
  getDuplicatePlanLabels?: (
    containerNumber: string | null | undefined,
    currentContainerId?: string | null,
  ) => string[];
  onClose: () => void;
  onSubmit: (values: ContainerFormValues) => Promise<void> | void;
}

export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({
  isOpen,
  mode,
  container,
  containerTypeOptions,
  isContainerNumberLocked = false,
  isSaving = false,
  isDuplicateCheckReady = true,
  getDuplicatePlanLabels,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    trigger,
    setError,
    clearErrors,
    watch,
    formState: { isDirty },
  } = useForm<ContainerFormValues>({
    resolver: zodResolver(ContainerFormSchema),
    defaultValues: containerFormDefaultValues,
  });

  const watchedContainerNumber = watch('containerNumber');

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && container) {
      reset({
        containerNumber: container.containerNumber ?? null,
        containerTypeCode: container.containerTypeCode ?? '',
        estimatedStuffingAt: container.estimatedStuffingAt ?? null,
        estimatedMoveAt: container.estimatedMoveAt ?? null,
        equipmentBooked: container.equipmentBooked ?? false,
        appointmentBooked: container.appointmentBooked ?? false,
        notes: container.notes ?? null,
      });
    } else {
      reset(containerFormDefaultValues);
    }
  }, [container, isOpen, mode, reset]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const validateContainerNumber = async () => {
      const isValid = await trigger('containerNumber');
      if (isMounted && isValid) {
        clearErrors('containerNumber');
      }
    };
    void validateContainerNumber();
    return () => {
      isMounted = false;
    };
  }, [clearErrors, isOpen, trigger, watchedContainerNumber]);

  if (!isOpen) return null;

  const statusLabel = container ? containerStatusLabel[container.status] : 'New';

  const handleClose = () => {
    if (!isDirty || isSaving) {
      onClose();
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {mode === 'create' ? 'New Container' : 'Container Details'}
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create'
                ? 'Add Container'
                : container?.containerNumber || container?.containerTypeCode || 'Container'}
            </h2>
            <p className="text-sm text-gray-500">
              Status: {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(async (values) => {
            if (values.containerNumber) {
              if (!isDuplicateCheckReady) {
                setError('containerNumber', {
                  type: 'manual',
                  message: 'Unable to validate container number. Please try again.',
                });
                return;
              }
              const duplicatePlanLabels =
                getDuplicatePlanLabels?.(values.containerNumber, container?.id) ?? [];
              if (duplicatePlanLabels.length > 0) {
                const labelList = duplicatePlanLabels.join(', ');
                setError('containerNumber', {
                  type: 'manual',
                  message: `Container number already exists in stuffing plan: ${labelList}`,
                });
                return;
              }
            }
            await onSubmit(values);
          })}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="grid gap-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput<ContainerFormValues>
                name="containerNumber"
                control={control}
                label="Container Number"
                placeholder="Enter container number"
                maxLength={20}
                disabled={mode === 'edit' && isContainerNumberLocked}
              />
              <FormSingleSelect<ContainerFormValues>
                name="containerTypeCode"
                control={control}
                label="Container Type"
                options={containerTypeOptions}
                placeholder="Select container type"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormDateTimeInput<ContainerFormValues>
                name="estimatedStuffingAt"
                control={control}
                label="Estimated Stuffing Time"
              />
              <FormDateTimeInput<ContainerFormValues>
                name="estimatedMoveAt"
                control={control}
                label="Estimated Move Time"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormCheckbox<ContainerFormValues>
                name="equipmentBooked"
                control={control}
                label="Equipment Booked"
              />
              <FormCheckbox<ContainerFormValues>
                name="appointmentBooked"
                control={control}
                label="Appointment Booked"
              />
            </div>

            <FormTextarea<ContainerFormValues>
              name="notes"
              control={control}
              label="Notes"
              placeholder="Add notes (optional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerFormModal;
