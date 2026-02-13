import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { ChevronDown, Search, X } from 'lucide-react';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
}

interface FormMultiSelectAsyncProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  debounceMs?: number;
  minSearchLength?: number;
  isLoading?: boolean;
  emptyText?: string;
  loadingText?: string;
  clearSearchOnClose?: boolean;
  displayValues?: Record<string, string>;
  className?: string;
}

export const FormMultiSelectAsync = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  options,
  placeholder = 'Select...',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search options...',
  debounceMs = 300,
  minSearchLength = 3,
  isLoading = false,
  emptyText = 'No options found',
  loadingText = 'Loading options...',
  clearSearchOnClose = true,
  displayValues,
  className = '',
  ...selectProps
}: FormMultiSelectAsyncProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchValue ?? '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedRef = useRef<string>(searchValue ?? '');
  const searchTerm = internalSearchTerm;

  useEffect(() => {
    if (searchValue === undefined) return;
    if (searchValue === lastEmittedRef.current) {
      if (searchValue !== internalSearchTerm) {
        setInternalSearchTerm(searchValue);
      }
      return;
    }
    if (searchValue === '' && internalSearchTerm === '') {
      setInternalSearchTerm('');
    }
  }, [searchValue, internalSearchTerm]);

  const resetSearch = useCallback(() => {
    if (!clearSearchOnClose) return;
    if (searchValue === undefined) {
      setInternalSearchTerm('');
    }
    if (onSearchChange) {
      onSearchChange('');
    }
  }, [clearSearchOnClose, searchValue, onSearchChange]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setInternalSearchTerm(value);
      lastEmittedRef.current = value;
      if (!onSearchChange) return;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      const trimmed = value.trim();
      if (!trimmed) {
        onSearchChange('');
        return;
      }
      if (trimmed.length < minSearchLength) {
        return;
      }
      if (debounceMs > 0) {
        searchTimeoutRef.current = setTimeout(() => {
          onSearchChange(value);
        }, debounceMs);
      } else {
        onSearchChange(value);
      }
    },
    [onSearchChange, debounceMs, minSearchLength],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        resetSearch();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, resetSearch]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedValues = (field.value as string[]) || [];
        const selectedCount = selectedValues.length;

        const toggleOption = (optionValue: string) => {
          const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter((v) => v !== optionValue)
            : [...selectedValues, optionValue];
          field.onChange(newValues);
        };

        const selectAll = () => {
          const filteredValues = options.map((opt) => opt.value);
          const newValues = [...new Set([...selectedValues, ...filteredValues])];
          field.onChange(newValues);
        };

        const clearAll = () => {
          if (searchTerm.trim()) {
            const filteredValues = options.map((opt) => opt.value);
            const newValues = selectedValues.filter((v) => !filteredValues.includes(v));
            field.onChange(newValues);
          } else {
            field.onChange([]);
          }
        };

        const optionMap = new Map(options.map((opt) => [opt.value, opt.label]));
        const selectedOptions = selectedValues.map((value) => ({
          value,
          label: optionMap.get(value) ?? displayValues?.[value] ?? value,
        }));

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !isOpen;
                  if (!nextOpen) {
                    resetSearch();
                  }
                  setIsOpen(nextOpen);
                }}
                disabled={selectProps.disabled}
                className={`
                  w-full min-h-[42px] px-3 py-2 border rounded-lg
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  text-left
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-between gap-2
                  ${
                    error
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
                aria-label={label || 'Multi-select dropdown'}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[20px]">
                  {selectedCount === 0 ? (
                    <span className="text-gray-500 text-sm">{placeholder}</span>
                  ) : (
                    selectedOptions.map((option) => (
                      <span
                        key={option.value}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm border border-blue-200 dark:border-blue-800"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <span className="max-w-[200px] truncate">{option.label}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOption(option.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleOption(option.value);
                            }
                          }}
                          className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-sm p-0.5 transition-colors cursor-pointer"
                          aria-label={`Remove ${option.label}`}
                        >
                          <X size={12} />
                        </span>
                      </span>
                    ))
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                    <button
                      type="button"
                      onClick={
                        options.every((opt) => selectedValues.includes(opt.value))
                          ? clearAll
                          : selectAll
                      }
                      className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                    >
                      {options.every((opt) => selectedValues.includes(opt.value))
                        ? searchTerm.trim()
                          ? 'Clear Filtered'
                          : 'Clear All'
                        : searchTerm.trim()
                          ? 'Select Filtered'
                          : 'Select All'}
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-1">
                    {isLoading ? (
                      <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {loadingText}
                      </div>
                    ) : options.length > 0 ? (
                      options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOption(option.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                              {option.label}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm.trim() ? emptyText : 'Type to search'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </FormField>
        );
      }}
    />
  );
};

export default FormMultiSelectAsync;
