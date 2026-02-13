/**
 * DynamicFilter Component
 *
 * Reusable filter component with collapsible panel supporting multiple input types:
 * - Text inputs
 * - Date pickers
 * - Single-select dropdowns
 * - Multi-select dropdowns with custom key/value mapping
 *
 * @example
 * ```tsx
 * <DynamicFilter
 *   fields={[
 *     { type: 'text', name: 'search', label: 'Search', placeholder: 'Enter search...' },
 *     { type: 'date', name: 'fromDate', label: 'From Date' },
 *     {
 *       type: 'select',
 *       name: 'province',
 *       label: 'Province',
 *       options: [{ provinceCode: 'HCM', provinceName: 'Ho Chi Minh City' }],
 *       keyField: 'provinceCode',
 *       valueField: 'provinceName'
 *     },
 *     {
 *       type: 'multiselect',
 *       name: 'statuses',
 *       label: 'Status',
 *       options: [{ code: 'active', name: 'Active' }],
 *       keyField: 'code',
 *       valueField: 'name'
 *     }
 *   ]}
 *   onApplyFilter={(values) => {
 *     // values = { search: 'test', province: 'HCM', statuses: ['active'] }
 *     fetchData(values);
 *   }}
 *   onClear={() => {
 *     clearSearchResults();
 *   }}
 * />
 * ```
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Filter, X } from 'lucide-react';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormDateInput } from '@/shared/components/forms/FormDateInput';
import { FormSingleSelect } from '@/shared/components/forms/FormSingleSelect';
import { FormSingleSelectAsync } from '@/shared/components/forms/FormSingleSelectAsync';
import { FormMultiSelect } from '@/shared/components/forms/FormMultiSelect';
import { FormMultiSelectAsync } from '@/shared/components/forms/FormMultiSelectAsync';
import { FormDateTimeInput } from '@/shared/components/forms/FormDateTimeInput';
import type {
  DynamicFilterProps,
  FilterFieldConfig,
  FilterValues,
  SelectOption,
} from './DynamicFilter.types';

export const DynamicFilter: React.FC<DynamicFilterProps> = ({
  fields,
  onApplyFilter,
  onClear,
  className = '',
  buttonLabel = 'Filters',
  initialValues,
  disableAutoReset = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const fieldSignature = useMemo(
    () => fields.map((field) => `${field.name}:${field.type}`).join('|'),
    [fields],
  );
  const fieldMetaRef = React.useRef(
    fields.map((field) => ({ name: field.name, type: field.type })),
  );
  const lastSignatureRef = React.useRef(fieldSignature);
  if (lastSignatureRef.current !== fieldSignature) {
    fieldMetaRef.current = fields.map((field) => ({
      name: field.name,
      type: field.type,
    }));
    lastSignatureRef.current = fieldSignature;
  }

  // Initialize form with default values
  const defaultValues = useMemo(() => {
    return fieldMetaRef.current.reduce((acc, field) => {
      const presetValue = initialValues?.[field.name];

      if (field.type === 'multiselect' || field.type === 'async-multiselect') {
        acc[field.name] = Array.isArray(presetValue) ? presetValue : [];
      } else {
        acc[field.name] = typeof presetValue === 'string' ? presetValue : '';
      }

      return acc;
    }, {} as Record<string, any>);
  }, [initialValues]);

  const form = useForm({
    defaultValues,
  });

  const { control, handleSubmit, reset } = form;

  const hasPresetValues = (values: Record<string, any>) =>
    Object.values(values).some((value) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return false;
    });

  useEffect(() => {
    if (!disableAutoReset) {
      reset(defaultValues);
      setHasActiveFilters(hasPresetValues(defaultValues));
    }
  }, [defaultValues, reset, disableAutoReset]);

  /**
   * Filter out empty values before returning to parent
   */
  const filterEmptyValues = (values: Record<string, any>): FilterValues => {
    return Object.entries(values).reduce((acc, [key, value]) => {
      // Exclude empty strings
      if (typeof value === 'string' && value.trim() === '') {
        return acc;
      }
      // Exclude empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return acc;
      }
      // Exclude null/undefined
      if (value === null || value === undefined) {
        return acc;
      }
      // Include non-empty values
      acc[key] = value;
      return acc;
    }, {} as FilterValues);
  };

  /**
   * Handle Apply button click
   */
  const onApply = (values: Record<string, any>) => {
    const nonEmptyValues = filterEmptyValues(values);
    const hasValues = Object.keys(nonEmptyValues).length > 0;
    setHasActiveFilters(hasValues);
    onApplyFilter?.(nonEmptyValues);
  };

  /**
   * Handle Clear button click
   */
  const handleClear = () => {
    reset(defaultValues);
    setHasActiveFilters(hasPresetValues(defaultValues));
    onClear?.();
  };

  /**
   * Handle Escape key to close panel
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  /**
   * Map custom keyField/valueField to SelectOption format
   */
  const mapOptions = (
    options: any[],
    keyField: string,
    valueField: string
  ): SelectOption[] => {
    return options.map((opt) => ({
      value: String(opt[keyField]),
      label: String(opt[valueField]),
    }));
  };

  /**
   * Render field based on type
   */
  const renderField = (field: FilterFieldConfig) => {
    switch (field.type) {
      case 'text':
        return (
          <FormInput
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            placeholder={field.placeholder}
            type="text"
          />
        );

      case 'date':
        return (
          <FormDateInput
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
          />
        );

      case 'datetime':
        return (
          <FormDateTimeInput
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        return (
          <FormSingleSelect
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            options={mapOptions(field.options, field.keyField, field.valueField)}
            placeholder={field.placeholder}
          />
        );

      case 'multiselect':
        return (
          <FormMultiSelect
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            options={mapOptions(field.options, field.keyField, field.valueField)}
            placeholder={field.placeholder}
          />
        );

      case 'async-select':
        return (
          <FormSingleSelectAsync
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            options={mapOptions(field.options, field.keyField, field.valueField)}
            placeholder={field.placeholder}
            searchValue={field.searchValue}
            searchPlaceholder={field.searchPlaceholder}
            debounceMs={field.debounceMs}
            minSearchLength={field.minSearchLength}
            onSearchChange={field.onSearchChange}
            isLoading={field.isLoading}
            emptyText={field.emptyText}
            loadingText={field.loadingText}
            clearSearchOnClose={field.clearSearchOnClose}
            displayValue={field.displayValue}
          />
        );

      case 'async-multiselect':
        return (
          <FormMultiSelectAsync
            key={field.name}
            name={field.name as any}
            control={control}
            label={field.label}
            options={mapOptions(field.options, field.keyField, field.valueField)}
            placeholder={field.placeholder}
            searchValue={field.searchValue}
            searchPlaceholder={field.searchPlaceholder}
            debounceMs={field.debounceMs}
            minSearchLength={field.minSearchLength}
            onSearchChange={field.onSearchChange}
            isLoading={field.isLoading}
            emptyText={field.emptyText}
            loadingText={field.loadingText}
            clearSearchOnClose={field.clearSearchOnClose}
            displayValues={field.displayValues}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`w-full ${className}`} data-testid="dynamic-filter">
      {/* Filter Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg border
          sm:w-auto sm:justify-start
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            hasActiveFilters
              ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
        aria-expanded={isOpen}
        aria-controls="filter-panel"
        aria-label="Toggle filters"
      >
        <Filter size={18} />
        <span className="text-sm font-medium">{buttonLabel}</span>
        {hasActiveFilters && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
            Active
          </span>
        )}
      </button>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div
          id="filter-panel"
          role="region"
          aria-label="Filter panel"
          className="mt-3 max-h-[70vh] overflow-visible rounded-lg border border-gray-300 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800 sm:p-4"
        >
          <form onSubmit={handleSubmit(onApply)}>
            {/* Filter Fields */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {fields.map(renderField)}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-stretch justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:w-auto"
              >
                <X size={16} />
                Clear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DynamicFilter;
