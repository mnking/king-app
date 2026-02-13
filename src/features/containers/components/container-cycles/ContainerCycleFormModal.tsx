import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import {
  containerCycleFormSchema,
  containerCycleEndSchema,
  type ContainerCycleFormValues,
  type ContainerCycleEndFormValues,
} from '@/features/containers/schemas';

interface ContainerCycleFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'end';
  initialValues?: Partial<ContainerCycleFormValues>;
  onSubmit: (
    values: ContainerCycleFormValues | ContainerCycleEndFormValues,
  ) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const ContainerCycleFormModal: React.FC<ContainerCycleFormModalProps> = ({
  isOpen,
  mode,
  initialValues,
  onSubmit,
  onClose,
  isSubmitting = false,
}) => {
  const isEndForm = mode === 'end';
  const schema = isEndForm ? containerCycleEndSchema : containerCycleFormSchema;
  const form = useForm<ContainerCycleFormValues | ContainerCycleEndFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues as any,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = form;

  useEffect(() => {
    if (isOpen) {
      reset(initialValues as any);
    }
  }, [initialValues, isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  const submitting = isSubmitting || formSubmitting;
  const title = isEndForm ? 'End Container Cycle' : 'Create Container Cycle';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
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
            {!isEndForm && (
              <>
                <FormInput
                  name="containerNumber"
                  control={control as any}
                  label="Container Number"
                  placeholder="MSCU6639870"
                  required
                />
                <FormInput
                  name="code"
                  control={control as any}
                  label="Cycle Code"
                  placeholder="MSCU6639870-2025A"
                />
                <FormInput
                  name="operationMode"
                  control={control as any}
                  label="Operation Mode"
                  placeholder="IMPORT"
                />
                <FormInput
                  name="startEvent"
                  control={control as any}
                  label="Start Event"
                  placeholder="GATE_IN"
                  required
                />
                <FormInput
                  name="cargoLoading"
                  control={control as any}
                  label="Cargo Loading"
                  placeholder="FULL"
                />
                <FormInput
                  name="customsStatus"
                  control={control as any}
                  label="Customs Status"
                />
                <FormInput name="condition" control={control as any} label="Condition" />
                <FormInput
                  name="sealNumber"
                  control={control as any}
                  label="Seal Number"
                />
                <FormInput
                  name="containerStatus"
                  control={control as any}
                  label="Container Status"
                />
                <FormInput name="status" control={control as any} label="Status" />
              </>
            )}

            {isEndForm && (
              <>
                <FormInput
                  name="endEvent"
                  control={control as any}
                  label="End Event"
                  placeholder="GATE_OUT"
                  required
                />
                <FormInput
                  name="status"
                  control={control as any}
                  label="Status"
                  placeholder="COMPLETED"
                />
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
