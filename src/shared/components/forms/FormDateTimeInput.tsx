import React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormField } from './FormField';
import { fromDateTimeLocalFormat, toDateTimeLocalFormat } from '@/shared/utils';

interface FormDateTimeInputProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  className?: string;
}

export const FormDateTimeInput = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  className = '',
  ...inputProps
}: FormDateTimeInputProps<T>) => {
  const { id: providedId, ...restInputProps } = inputProps;
  const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

  const formatValue = (value?: string | null): string => {
    if (!value) return '';
    try {
      return toDateTimeLocalFormat(value);
    } catch {
      return '';
    }
  };

  const handleChange = (value: string, onChange: (next: string | null) => void) => {
    if (!value) {
      onChange(null);
      return;
    }

    try {
      onChange(fromDateTimeLocalFormat(value));
    } catch {
      onChange(null);
    }
  };

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
          <input
            {...restInputProps}
            type="datetime-local"
            value={formatValue(field.value)}
            onChange={(event) => handleChange(event.target.value, field.onChange)}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
            id={providedId ?? sanitizeId(String(field.name))}
            className={`
              w-full px-3 py-2 border rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
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

export default FormDateTimeInput;
