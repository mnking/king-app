import React, { useMemo } from 'react';
import { Box, Plus, Trash2, Container } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useContainerTypeList } from '@/features/containers/hooks/use-container-types-query';
import { FormInput, FormSingleSelect } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { generateClientId } from '../helpers/export-service-order.utils';
import type { ExportServiceOrderFormValues } from '../types';

interface BookingContainersTableProps {
  isReadOnly?: boolean;
}

export const BookingContainersTable: React.FC<BookingContainersTableProps> = ({
  isReadOnly = false,
}) => {
  const { control } = useFormContext<ExportServiceOrderFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bookingContainers',
  });
  const watchedContainers = useWatch({
    control,
    name: 'bookingContainers',
  });

  const { data: containerTypesResponse } = useContainerTypeList();
  const containerTypeOptions = useMemo(
    () =>
      (containerTypesResponse?.results ?? []).map((type) => ({
        value: type.code,
        label: `${type.code} - ${type.size}`,
      })),
    [containerTypesResponse?.results],
  );
  const selectedContainerTypes = useMemo(
    () =>
      (watchedContainers ?? [])
        .map((container) => container?.containerTypeCode)
        .filter((code): code is string => Boolean(code)),
    [watchedContainers],
  );

  const handleAdd = () => {
    append({
      clientId: generateClientId(),
      containerTypeCode: null,
      amount: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-indigo-50 p-2 dark:bg-indigo-900/20">
            <Container className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Booking Containers
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {fields.length === 0
                ? 'No containers'
                : `${fields.length} type${fields.length > 1 ? 's' : ''} added`}
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Container
          </Button>
        )}
      </div>

      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <Box className="h-6 w-6 text-gray-400" />
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
            No Containers Added
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add container types and amounts to complete the booking.
          </p>
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="mt-2 text-xs"
            >
              Add Container
            </Button>
          )}
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-3">
          <div className="hidden grid-cols-[2fr_1fr_auto] gap-3 border-b border-gray-100 bg-gray-50/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 md:grid">
            <div className="flex items-center gap-2">
              <Container className="h-3 w-3" />
              Container Type
            </div>
            <div className="flex items-center gap-2">
              <Box className="h-3 w-3" />
              Amount
            </div>
            <div className="text-center">Actions</div>
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="group grid grid-cols-1 gap-3 border-b border-gray-100 bg-white p-3 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50 md:grid-cols-[2fr_1fr_auto] md:items-start"
            >
              <FormSingleSelect<ExportServiceOrderFormValues>
                name={`bookingContainers.${index}.containerTypeCode`}
                control={control}
                label="Container Type"
                required
                options={containerTypeOptions.map((option) => ({
                  ...option,
                  disabled:
                    selectedContainerTypes.includes(option.value) &&
                    option.value !== watchedContainers?.[index]?.containerTypeCode,
                }))}
                placeholder="Select container type"
                disabled={isReadOnly}
              />
              <FormInput<ExportServiceOrderFormValues>
                name={`bookingContainers.${index}.amount`}
                control={control}
                label="Amount"
                type="number"
                min={1}
                required
                disabled={isReadOnly}
              />
              <div className="flex justify-center mt-7">
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingContainersTable;
