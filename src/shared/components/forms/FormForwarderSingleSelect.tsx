import React, { useMemo, useEffect } from 'react';
import { Control, FieldPath, FieldValues, UseFormSetValue, useWatch } from 'react-hook-form';
import { FormSingleSelect } from './FormSingleSelect';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import type { Forwarder } from '@/features/forwarder/types';

interface FormForwarderSingleSelectProps<T extends FieldValues>
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

export const FormForwarderSingleSelect = <T extends FieldValues>({
  name,
  control,
  label = 'Issuer (Forwarder)',
  required = false,
  placeholder = 'Select a forwarder...',
  className = '',
  codeFieldName,
  setValue,
  forwarders,
  forwardersLoading = false,
  ...selectProps
}: FormForwarderSingleSelectProps<T>) => {
  const hasExternalForwarders = Array.isArray(forwarders);

  // Fetch forwarders with Active status if not provided externally
  const { data: forwardersResponse, isLoading } = useForwarders(
    { status: 'Active' },
    { enabled: !hasExternalForwarders },
  );

  const resolvedForwarders = useMemo(
    () => (hasExternalForwarders ? forwarders : forwardersResponse?.results) || [],
    [hasExternalForwarders, forwarders, forwardersResponse?.results]
  );
  const resolvedLoading = hasExternalForwarders ? forwardersLoading : isLoading;

  // Map forwarders to options format for FormSingleSelect
  const options = useMemo(() => {
    return resolvedForwarders.map((forwarder) => ({
      value: forwarder.id,
      label: `${forwarder.name} (${forwarder.code})`,
    }));
  }, [resolvedForwarders]);

  // Watch the selected forwarder ID
  const selectedForwarderId = useWatch({ control, name });

  // Auto-sync the code field when forwarder selection changes
  useEffect(() => {
    if (!codeFieldName || !setValue) return;
    if (!selectedForwarderId) {
      setValue(codeFieldName, null as any);
      return;
    }
    const selectedForwarder = resolvedForwarders.find(
      (f) => f.id === selectedForwarderId,
    );
    if (selectedForwarder) {
      setValue(codeFieldName, selectedForwarder.code as any);
    }
  }, [selectedForwarderId, codeFieldName, setValue, resolvedForwarders]);

  return (
    <FormSingleSelect
      name={name}
      control={control}
      label={label}
      required={required}
      options={options}
      placeholder={resolvedLoading ? 'Loading forwarders...' : placeholder}
      className={className}
      disabled={resolvedLoading || selectProps.disabled}
    />
  );
};

export default FormForwarderSingleSelect;
