import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  ZoneCreateSchema,
  ZoneUpdateSchema,
  ZoneCreateForm,
  ZoneUpdateForm,
  zoneFormDefaults,
  zoneStatusOptions,
  zoneTypeOptions,
} from '@/features/zones-locations/schemas';
import type { Zone } from '@/features/zones-locations/types';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { toastAdapter } from '@/shared/services';

interface ZoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  zone?: Zone | null;
  onSave: (
    data: ZoneCreateForm | (ZoneUpdateForm & { id: string }),
  ) => Promise<void>;
}

export const ZoneFormModal: React.FC<ZoneFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  zone,
  onSave,
}) => {
  const isEdit = mode === 'edit';
  const schema = isEdit ? ZoneUpdateSchema : ZoneCreateSchema;
  const isActiveZone = isEdit && zone?.status === 'active';

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ZoneCreateForm | ZoneUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues:
      isEdit && zone
        ? {
            name: zone.name,
            description: zone.description || '',
            status: zone.status,
            type: zone.type,
          }
        : zoneFormDefaults,
  });

  // Reset form when modal opens/closes or mode/zone changes
  React.useEffect(() => {
    if (isOpen) {
      if (isEdit && zone) {
        reset({
          name: zone.name,
          description: zone.description || '',
          status: zone.status,
          type: zone.type,
        });
      } else {
        // Always reset to clean defaults for create mode
        reset(zoneFormDefaults);
      }
    }
  }, [isOpen, isEdit, zone, reset, mode]);

  const handleClose = async () => {
    if (!isDirty) {
      reset();
      onClose();
      return;
    }
    const confirmed = await toastAdapter.confirm(
      'You have unsaved changes. Close without saving?',
      { intent: 'danger' },
    );
    if (confirmed) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (data: ZoneCreateForm | ZoneUpdateForm) => {
    try {
      if (isEdit && zone) {
        await onSave({ ...data, id: zone.id } as ZoneUpdateForm & {
          id: string;
        });
      } else {
        await onSave(data as ZoneCreateForm);
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to save zone:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Zone' : 'Create New Zone'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Zone Code - only show in create mode */}
          {!isEdit && (
            <FormInput
              name="code"
              label="Zone Code"
              control={control}
              error={errors.code?.message}
              placeholder="e.g. GE, DG (1-2 uppercase letters)"
              className="uppercase"
              maxLength={2}
            />
          )}

          {/* Zone Name */}
          <FormInput
            name="name"
            label="Zone Name"
            control={control}
            error={errors.name?.message}
            placeholder="Enter zone name"
            required
            disabled={isActiveZone}
          />
          {isActiveZone && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Active zones cannot be renamed.
            </p>
          )}

          {/* Description */}
          <FormTextarea
            name="description"
            label="Description"
            control={control}
            error={errors.description?.message}
            placeholder="Enter zone description (optional)"
            rows={3}
          />

          {/* Zone Type - only show in create mode */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type')}
                className={`
                w-full px-3 py-2 border rounded-lg
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              `}
              >
                {zoneTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.type.message}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('status')}
              className={`
                w-full px-3 py-2 border rounded-lg
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              `}
            >
              {zoneStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Zone'
                  : 'Create Zone'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZoneFormModal;
