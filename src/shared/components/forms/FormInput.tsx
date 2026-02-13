import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { FormField } from './FormField';

interface FormInputProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
  valueMode?: 'auto' | 'string';
}

export const FormInput = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  hint,
  className = '',
  type = 'text',
  valueMode = 'auto',
  ...inputProps
}: FormInputProps<T>) => {
  const { id: providedId, ...restInputProps } = inputProps;
  const minValue =
    restInputProps.min === undefined
      ? undefined
      : typeof restInputProps.min === 'number'
        ? restInputProps.min
        : Number(restInputProps.min);
  const maxValue =
    restInputProps.max === undefined
      ? undefined
      : typeof restInputProps.max === 'number'
        ? restInputProps.max
        : Number(restInputProps.max);
  const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // For number inputs, handle valueAsNumber properly
        const isNumberType = type === 'number';
        const shouldKeepAsString = valueMode === 'string';
        const rawValue = field.value;
        const value =
          shouldKeepAsString
            ? rawValue === undefined || rawValue === null
              ? ''
              : String(rawValue)
            : isNumberType
              ? rawValue ?? ''
              : rawValue ?? '';

        const onChange =
          isNumberType && !shouldKeepAsString
            ? (e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value;
                if (raw === '') {
                  field.onChange(undefined);
                  return;
                }
                const val = e.target.valueAsNumber;
                if (Number.isNaN(val)) {
                  field.onChange(undefined);
                  return;
                }

                let nextValue = val;
                if (typeof minValue === 'number' && !Number.isNaN(minValue)) {
                  nextValue = Math.max(minValue, nextValue);
                }
                if (typeof maxValue === 'number' && !Number.isNaN(maxValue)) {
                  nextValue = Math.min(maxValue, nextValue);
                }

                field.onChange(nextValue);
              }
            : (e: React.ChangeEvent<HTMLInputElement>) => {
                field.onChange(e.target.value);
              };

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            hint={hint}
            className={className}
            htmlFor={providedId ?? sanitizeId(String(field.name))}
          >
            <input
              {...restInputProps}
              type={type}
              name={field.name}
              value={value}
              onChange={onChange}
              onBlur={field.onBlur}
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
        );
      }}
    />
  );
};

export default FormInput;
