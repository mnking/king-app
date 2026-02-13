import React from 'react';
import { Control, Controller, FieldPath, FieldValues, UseFormSetValue } from 'react-hook-form';
import { FormField } from './FormField';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import type { Forwarder } from '@/features/forwarder/types';

interface FormForwarderSelectProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  codeFieldName?: FieldPath<T>;     // Optional field name for the code
  setValue?: UseFormSetValue<T>;    // Form setValue to update the code field
  forwarders?: Forwarder[];         // Optional pre-fetched forwarders list
  forwardersLoading?: boolean;      // Loading indicator for provided list
}

export const FormForwarderSelect = <T extends FieldValues>({
  name,
  control,
  label = 'Issuer (Forwarder)',
  required = false,
  placeholder = 'Select...',
  className = '',
  codeFieldName,
  setValue,
  forwarders,
  forwardersLoading = false,
  ...selectProps
}: FormForwarderSelectProps<T>) => {
  const hasExternalForwarders = Array.isArray(forwarders);

  // Fetch forwarders with Active status if not provided externally
  const { data: forwardersResponse, isLoading } = useForwarders(
    { status: 'Active' },
    { enabled: !hasExternalForwarders },
  );

  const resolvedForwarders =
    (hasExternalForwarders ? forwarders : forwardersResponse?.results) || [];
  const resolvedLoading = hasExternalForwarders ? forwardersLoading : isLoading;

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
                const selectedForwarder = resolvedForwarders.find(
                  (f) => f.id === selectedId,
                );
                if (selectedForwarder) {
                  setValue(codeFieldName, selectedForwarder.code as any);
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
              {resolvedLoading ? 'Loading forwarders...' : placeholder}
            </option>
            {resolvedForwarders.map((forwarder) => (
              <option key={forwarder.id} value={forwarder.id}>
                {forwarder.name} ({forwarder.code})
              </option>
            ))}
          </select>
        </FormField>
      )}
    />
  );
};

export default FormForwarderSelect;
