import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput, FormDateTimeInput, FormSingleSelect } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import {
  containerTransactionFormSchema,
  CONTAINER_EVENT_TYPES,
  type ContainerTransactionFormValues,
} from '@/features/containers/schemas';

interface ContainerTransactionFormModalProps {
  isOpen: boolean;
  initialValues?: Partial<ContainerTransactionFormValues>;
  onSubmit: (values: ContainerTransactionFormValues) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const ContainerTransactionFormModal: React.FC<
  ContainerTransactionFormModalProps
> = ({
  isOpen,
  initialValues,
  onSubmit,
  onClose,
  isSubmitting = false,
}) => {
  const form = useForm<ContainerTransactionFormValues>({
    resolver: zodResolver(containerTransactionFormSchema),
    defaultValues: initialValues as ContainerTransactionFormValues,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = form;

  useEffect(() => {
    if (isOpen) {
      reset(initialValues as ContainerTransactionFormValues);
    }
  }, [initialValues, isOpen, reset]);

  if (!isOpen) return null;

  const submitting = isSubmitting || formSubmitting;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Transaction
          </h2>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
            reset();
          })}
        >
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <FormInput
              name="containerNumber"
              control={control}
              label="Container Number"
              placeholder="MSCU6639870"
              required
            />
            <FormInput
              name="cycleId"
              control={control}
              label="Cycle ID"
              placeholder="MSCU6639870-2025A"
            />
            <FormSingleSelect
              name="eventType"
              control={control}
              label="Event Type"
              required
              options={CONTAINER_EVENT_TYPES.map((event) => ({
                value: event,
                label: event.replace(/_/g, ' '),
              }))}
            />
            <FormDateTimeInput
              name="timestamp"
              control={control}
              label="Timestamp"
              required
            />
            <FormInput name="cargoLoading" control={control} label="Cargo Loading" />
            <FormInput name="customsStatus" control={control} label="Customs Status" />
            <FormInput name="condition" control={control} label="Condition" />
            <FormInput name="sealNumber" control={control} label="Seal Number" />
            <FormInput name="status" control={control} label="Status" />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
