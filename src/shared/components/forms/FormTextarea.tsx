import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { FormField } from './FormField';

interface FormTextareaProps<T extends FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  className?: string;
}

export const FormTextarea = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  className = '',
  rows = 2,
  ...textareaProps
}: FormTextareaProps<T>) => {
  const { id: providedId, ...restTextareaProps } = textareaProps;
  const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormField
          label={label}
          error={error}
          required={required}
          className={className}
          htmlFor={providedId ?? sanitizeId(String(field.name))}
        >
          <textarea
            {...field}
            {...restTextareaProps}
            id={providedId ?? sanitizeId(String(field.name))}
            rows={rows}
            value={field.value || ''}
            className={`
              w-full px-3 py-2 border rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-vertical
              ${
                error
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }
            `}
          />
        </FormField>
      )}
    />
  );
};

export default FormTextarea;
