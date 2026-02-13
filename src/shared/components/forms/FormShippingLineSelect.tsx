import React from 'react';
import { Control, Controller, FieldPath, FieldValues, UseFormSetValue } from 'react-hook-form';
import { FormField } from './FormField';
import { useShippingLines } from '@/features/shipping-lines/hooks';
import type { ShippingLine } from '@/services/apiCarrier';

interface FormShippingLineSelectProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  helperText?: string;
  error?: string;
  codeFieldName?: FieldPath<T>;     // Optional field name for the code
  setValue?: UseFormSetValue<T>;    // Form setValue to update the code field
  shippingLines?: ShippingLine[];   // Optional pre-fetched shipping lines
  shippingLinesLoading?: boolean;   // Loading indicator for provided list
}

export const FormShippingLineSelect = <T extends FieldValues>({
  name,
  control,
  label = 'Vessel / Shipping Line',
  required = false,
  placeholder = 'Select...',
  className = '',
  error: externalError,
  codeFieldName,
  setValue,
  shippingLines,
  shippingLinesLoading = false,
  ...selectProps
}: FormShippingLineSelectProps<T>) => {
  const hasExternalShippingLines = Array.isArray(shippingLines);

  // Fetch shipping lines (no status filter - backend doesn't support it)
  const { data: shippingLinesResponse, isLoading } = useShippingLines(
    { itemsPerPage: 100 },
    { enabled: !hasExternalShippingLines },
  );

  const resolvedShippingLines =
    (hasExternalShippingLines ? shippingLines : shippingLinesResponse?.results) || [];
  const resolvedLoading = hasExternalShippingLines ? shippingLinesLoading : isLoading;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error: fieldError } }) => {
        const error = externalError || fieldError?.message;

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <select
              {...field}
              {...selectProps}
              value={field.value || ''}
              disabled={resolvedLoading || selectProps.disabled}
              onChange={(e) => {
                const selectedId = e.target.value;
                field.onChange(selectedId);

                // If codeFieldName and setValue are provided, also update the code field
                if (codeFieldName && setValue && selectedId) {
                  const selectedLine = resolvedShippingLines.find(
                    (l) => l.id === selectedId,
                  );
                  if (selectedLine) {
                    setValue(codeFieldName, selectedLine.code as any);
                  }
                }
              }}
              className={`
                w-full px-3 py-2 border rounded-lg
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }
            `}
          >
            <option value="">
              {resolvedLoading ? 'Loading shipping lines...' : placeholder}
            </option>
            {resolvedShippingLines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name} ({line.code})
              </option>
            ))}
          </select>
          </FormField>
        );
      }}
    />
  );
};

export default FormShippingLineSelect;
