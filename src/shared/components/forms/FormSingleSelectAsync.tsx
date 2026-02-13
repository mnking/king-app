import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Control, Controller, FieldPath, FieldValues, useWatch } from 'react-hook-form';
import { ChevronDown, Search, X } from 'lucide-react';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSingleSelectAsyncProps<T extends FieldValues>
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
  displayValue?: string;
  className?: string;
}

export const FormSingleSelectAsync = <T extends FieldValues>({
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
  displayValue,
  className = '',
  ...selectProps
}: FormSingleSelectAsyncProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchValue ?? '');
  const [selectedMeta, setSelectedMeta] = useState<{ value: string; label: string } | null>(null);
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

  const watchedValue = useWatch({ control, name });
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === watchedValue),
    [options, watchedValue],
  );

  useEffect(() => {
    if (!selectedOption) return;
    setSelectedMeta((prev) => {
      if (prev?.value === selectedOption.value && prev.label === selectedOption.label) {
        return prev;
      }
      return { value: selectedOption.value, label: selectedOption.label };
    });
  }, [selectedOption]);

  useEffect(() => {
    if (!displayValue || typeof watchedValue !== 'string' || !watchedValue) return;
    setSelectedMeta((prev) => {
      if (prev?.value === watchedValue && prev.label === displayValue) {
        return prev;
      }
      return { value: watchedValue, label: displayValue };
    });
  }, [displayValue, watchedValue]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const displayText = selectedOption?.label
          || (displayValue && field.value ? displayValue : '')
          || (selectedMeta?.value === field.value ? selectedMeta.label : '')
          || (typeof field.value === 'string' && field.value ? field.value : placeholder);

        const handleSelect = (optionValue: string, disabled?: boolean) => {
          if (disabled) return;
          const optionLabel = options.find((opt) => opt.value === optionValue)?.label ?? optionValue;
          setSelectedMeta({ value: optionValue, label: optionLabel });
          field.onChange(optionValue);
          setIsOpen(false);
          resetSearch();
        };

        const handleClear = () => {
          field.onChange('');
          setSelectedMeta(null);
          setIsOpen(false);
          resetSearch();
        };

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
                aria-label={label || 'Single-select dropdown'}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span className={!selectedOption ? 'text-gray-500 text-sm' : ''}>
                  {displayText}
                </span>
                <div className="flex items-center gap-2">
                  {typeof field.value === 'string' && field.value && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          handleClear();
                        }
                      }}
                      className="rounded-sm p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      aria-label="Clear selection"
                    >
                      <X size={14} />
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col"
                  role="listbox"
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

                  <div className="overflow-y-auto flex-1 p-1">
                    {isLoading ? (
                      <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {loadingText}
                      </div>
                    ) : options.length > 0 ? (
                      options.map((option) => {
                        const isSelected = option.value === field.value;
                        const isDisabled = option.disabled === true;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value, isDisabled)}
                            disabled={isDisabled}
                            className={`w-full text-left px-3 py-2 text-sm rounded focus:outline-none ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-medium'
                                : 'text-gray-900 dark:text-gray-100'
                            } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={isDisabled}
                          >
                            {option.label}
                          </button>
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

export default FormSingleSelectAsync;
