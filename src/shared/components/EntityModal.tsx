import React, { useState, useEffect, ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';

// Generic field configuration for the modal form
export interface EntityField<T> {
  key: keyof T;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'date'
    | 'datetime-local'
    | 'number'
    | 'email';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  validation?: (value: string | number | boolean) => string | null;
  transform?: (value: string | number | boolean) => string | number | boolean; // Transform value before saving
}

export interface EntityModalProps<T, TInsert, TUpdate> {
  // Modal state
  isOpen: boolean;
  onClose: () => void;

  // Entity configuration
  entityName: string; // e.g., 'Task', 'Project'

  // Mode and data
  mode: 'create' | 'edit';
  entity?: T | null;

  // Form configuration
  fields: EntityField<TInsert>[];
  defaultValues?: Partial<TInsert>;

  // Callbacks
  onSave: (data: TInsert | (TUpdate & { id: string })) => Promise<void>;

  // Custom content
  customHeader?: ReactNode;
  customFooter?: ReactNode;

  // UI customization
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function EntityModal<
  T extends { id: string },
  TInsert,
  TUpdate,
>({
  isOpen,
  onClose,
  entityName,
  mode,
  entity,
  fields,
  defaultValues = {},
  onSave,
  customHeader,
  customFooter,
  size = 'md',
  className = '',
}: EntityModalProps<T, TInsert, TUpdate>) {
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Initialize form data when modal opens or entity changes
  useEffect(() => {
    if (!isOpen) return;

    if (entity && mode === 'edit') {
      // Pre-populate form with entity data
      const initialData: Record<string, string | number | boolean> = {};
      fields.forEach((field) => {
        const key = field.key as string;
        initialData[key] =
          (entity as Record<string, string | number | boolean>)[key] || '';
      });
      setFormData(initialData);
    } else {
      // Initialize with default values for create mode
      const initialData: Record<string, string | number | boolean> = {};
      fields.forEach((field) => {
        const key = field.key as string;
        initialData[key] =
          defaultValues[key] || (field.type === 'select' ? '' : '');
      });
      setFormData(initialData);
    }

    setErrors({});
  }, [entity, mode, isOpen, fields, defaultValues]);

  // Handle input changes
  const handleInputChange = (key: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: '',
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const key = field.key as string;
      const value = formData[key];

      // Required field validation
      if (
        field.required &&
        (!value || (typeof value === 'string' && value.trim() === ''))
      ) {
        newErrors[key] = `${field.label} is required`;
      }

      // Custom validation
      if (field.validation && value) {
        const validationError = field.validation(value);
        if (validationError) {
          newErrors[key] = validationError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Transform form data
      const transformedData: Record<string, string | number | boolean> = {};
      fields.forEach((field) => {
        const key = field.key as string;
        let value = formData[key];

        // Apply transformation if provided
        if (field.transform) {
          value = field.transform(value);
        }

        // Handle empty strings and null values
        if (value === '') {
          value = null;
        }

        transformedData[key] = value;
      });

      if (mode === 'edit' && entity) {
        await onSave({ ...transformedData, id: entity.id } as TUpdate & {
          id: string;
        });
      } else {
        await onSave(transformedData as TInsert);
      }

      onClose();
    } catch (error) {
      console.error(`Error saving ${entityName.toLowerCase()}:`, error);
      // You might want to show a toast notification here
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          {customHeader || (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'create'
                ? `Create ${entityName}`
                : `Edit ${entityName}`}
            </h2>
          )}
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => {
            const key = field.key as string;
            const value = formData[key] || '';
            const error = errors[key];

            return (
              <div key={key} className="space-y-1">
                <label
                  htmlFor={key}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={key}
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled || loading}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      error
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={key}
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    disabled={field.disabled || loading}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      error
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={key}
                    type={field.type}
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled || loading}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      error
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                )}

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {customFooter || (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? 'Saving...'
                  : mode === 'create'
                    ? `Create ${entityName}`
                    : `Update ${entityName}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
