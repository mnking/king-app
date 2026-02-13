import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput, FormSingleSelect } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import {
  containerFormSchema,
  type ContainerFormValues,
} from '@/features/containers/schemas';
import type { ContainerType } from '@/features/containers/types';

interface ContainerFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<ContainerFormValues>;
  containerTypes: ContainerType[];
  onSubmit: (values: ContainerFormValues) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  title?: string;
}

export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({
  isOpen,
  mode,
  initialValues,
  containerTypes,
  onSubmit,
  onClose,
  isSubmitting = false,
  title = mode === 'create' ? 'Create Container' : 'Edit Container',
}) => {
  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerFormSchema),
    defaultValues: {
      number: '',
      containerTypeCode: '',
      ...initialValues,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = form;

  useEffect(() => {
    if (isOpen) {
      reset({
        number: initialValues?.number ?? '',
        containerTypeCode: initialValues?.containerTypeCode ?? '',
      });
    }
  }, [initialValues, isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  const submitting = isSubmitting || formSubmitting;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900">
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
          <div className="space-y-4 p-4">
            <FormInput
              name="number"
              control={control}
              label="Container Number"
              placeholder="e.g. MSCU6639870"
              disabled={mode === 'edit'}
              required
            />
            <FormSingleSelect
              name="containerTypeCode"
              control={control}
              label="Container Type"
              required
              options={containerTypes.map((type) => ({
                value: type.code,
                label: `${type.code} - ${type.size}${type.description ? ` (${type.description})` : ''}`,
              }))}
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
