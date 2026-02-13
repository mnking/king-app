import React, { useMemo } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormSingleSelect } from './FormSingleSelect';
import { useShippingLines } from '@/features/shipping-lines/hooks';
import type { ShippingLine } from '@/services/apiCarrier';

interface FormShippingLineSingleSelectProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  shippingLines?: ShippingLine[];   // Optional pre-fetched shipping lines list
  shippingLinesLoading?: boolean;   // Loading indicator for provided list
}

export const FormShippingLineSingleSelect = <T extends FieldValues>({
  name,
  control,
  label = 'Shipping Line',
  required = false,
  placeholder = 'Select a shipping line...',
  className = '',
  shippingLines,
  shippingLinesLoading = false,
  ...selectProps
}: FormShippingLineSingleSelectProps<T>) => {
  const hasExternalShippingLines = Array.isArray(shippingLines);

  const { data: shippingLinesResponse, isLoading } = useShippingLines(
    { status: 'ACTIVE', contractStatus: 'ACTIVE', itemsPerPage: 100 },
    { enabled: !hasExternalShippingLines },
  );

  const resolvedShippingLines = useMemo(
    () =>
      (hasExternalShippingLines ? shippingLines : shippingLinesResponse?.results) ||
      [],
    [hasExternalShippingLines, shippingLines, shippingLinesResponse?.results]
  );
  const resolvedLoading = hasExternalShippingLines ? shippingLinesLoading : isLoading;

  const options = useMemo(
    () =>
      resolvedShippingLines.map((line) => ({
        value: line.id,
        label: `${line.name} (${line.code})`,
      })),
    [resolvedShippingLines]
  );

  return (
    <FormSingleSelect
      name={name}
      control={control}
      label={label}
      required={required}
      options={options}
      placeholder={resolvedLoading ? 'Loading shipping lines...' : placeholder}
      className={className}
      disabled={resolvedLoading || selectProps.disabled}
    />
  );
};

export default FormShippingLineSingleSelect;
