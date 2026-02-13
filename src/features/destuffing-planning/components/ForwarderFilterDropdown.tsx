import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormForwarderSingleSelect } from '@/shared/components/forms';
import type { Forwarder } from '@/features/forwarder/types';

interface ForwarderFilterDropdownProps {
  value: string | null;
  onChange: (forwarderId: string | null) => void;
  forwarders?: Forwarder[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

interface ForwarderFilterFormValues {
  forwarderId: string;
}

/**
 * Wrapper around the shared FormForwarderSingleSelect so the workspace filter
 * stays in sync with the forwarder dropdown used across the app.
 */
export const ForwarderFilterDropdown: React.FC<ForwarderFilterDropdownProps> = ({
  value,
  onChange,
  forwarders,
  isLoading = false,
  errorMessage,
}) => {
  const { control, setValue, watch } = useForm<ForwarderFilterFormValues>({
    defaultValues: { forwarderId: value ?? '' },
  });

  const selectedForwarderId = watch('forwarderId');

  useEffect(() => {
    const normalized = selectedForwarderId || null;
    if (normalized !== value) {
      onChange(normalized);
    }
  }, [selectedForwarderId, value, onChange]);

  useEffect(() => {
    setValue('forwarderId', value ?? '', { shouldDirty: false, shouldTouch: false });
  }, [value, setValue]);

  return (
    <div className="w-full">
      <FormForwarderSingleSelect<ForwarderFilterFormValues>
        name="forwarderId"
        control={control}
        label="Forwarder"
        placeholder="All forwarders"
        forwarders={forwarders ?? []}
        forwardersLoading={isLoading}
      />
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
};
