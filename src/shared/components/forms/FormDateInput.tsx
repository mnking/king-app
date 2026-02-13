import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { FormField } from './FormField';

interface FormDateInputProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  className?: string;
}

export const FormDateInput = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  className = '',
  ...inputProps
}: FormDateInputProps<T>) => {
  const { id: providedId, ...restInputProps } = inputProps;
  const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Convert ISO datetime to yyyy-MM-dd format for date input
  const formatDateValue = (value: string | undefined): string => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Convert yyyy-MM-dd back to ISO datetime for form state
  const handleDateChange = (dateString: string, onChange: (value: string) => void) => {
    if (!dateString) {
      onChange('');
      return;
    }
    // Convert to ISO datetime string at midnight UTC
    // Ensure we append 'T00:00:00.000Z' to force UTC interpretation
    const isoString = `${dateString}T00:00:00.000Z`;
    onChange(isoString);
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
            type="date"
            value={formatDateValue(field.value)}
            onChange={(e) => handleDateChange(e.target.value, field.onChange)}
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

export default FormDateInput;
