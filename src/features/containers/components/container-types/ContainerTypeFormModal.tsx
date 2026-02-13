import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import {
  containerTypeFormSchema,
  type ContainerTypeFormValues,
} from '@/features/containers/schemas';

interface ContainerTypeFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<ContainerTypeFormValues>;
  onSubmit: (values: ContainerTypeFormValues) => Promise<void>;
  onClose: () => void;
  title?: string;
  isSubmitting?: boolean;
}

export const ContainerTypeFormModal: React.FC<ContainerTypeFormModalProps> = ({
  isOpen,
  mode,
  initialValues,
  onSubmit,
  onClose,
  title = mode === 'create' ? 'Create Container Type' : 'Edit Container Type',
  isSubmitting = false,
}) => {
  const form = useForm<ContainerTypeFormValues>({
    resolver: zodResolver(containerTypeFormSchema),
    defaultValues: {
      code: '',
      size: '',
      description: '',
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
        code: initialValues?.code ?? '',
        size: initialValues?.size ?? '',
        description: initialValues?.description ?? '',
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
              name="code"
              control={control}
              label="ISO Code"
              placeholder="22G1"
              disabled={mode === 'edit'}
              required
            />
            <FormInput
              name="size"
              control={control}
              label="Size"
              placeholder="20ft"
              required
            />
            <FormTextarea
              name="description"
              control={control}
              label="Description"
              rows={3}
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
