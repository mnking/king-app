import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { ChevronDown, Search, X } from 'lucide-react';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
}

interface FormMultiSelectProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export const FormMultiSelect = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  options,
  placeholder = 'Select...',
  className = '',
  ...selectProps
}: FormMultiSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term (case-insensitive, search in label only)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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
          // Select all filtered options (merge with existing selections)
          const filteredValues = filteredOptions.map((opt) => opt.value);
          const newValues = [...new Set([...selectedValues, ...filteredValues])];
          field.onChange(newValues);
        };

        const clearAll = () => {
          // Clear all filtered options (keep non-filtered selections)
          if (searchTerm.trim()) {
            const filteredValues = filteredOptions.map((opt) => opt.value);
            const newValues = selectedValues.filter((v) => !filteredValues.includes(v));
            field.onChange(newValues);
          } else {
            // If no search, clear all
            field.onChange([]);
          }
        };

        // Get selected option labels for tag display
        const selectedOptions = options.filter((opt) =>
          selectedValues.includes(opt.value)
        );

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div className="relative" ref={dropdownRef}>
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
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
                {/* Selected Tags or Placeholder */}
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

                {/* Chevron Icon */}
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  {/* Search Input */}
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search options..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Select All / Clear All */}
                  <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                    <button
                      type="button"
                      onClick={
                        filteredOptions.every((opt) => selectedValues.includes(opt.value))
                          ? clearAll
                          : selectAll
                      }
                      className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                    >
                      {filteredOptions.every((opt) => selectedValues.includes(opt.value))
                        ? searchTerm.trim()
                          ? 'Clear Filtered'
                          : 'Clear All'
                        : searchTerm.trim()
                          ? 'Select Filtered'
                          : 'Select All'}
                    </button>
                  </div>

                  {/* Options with Checkboxes */}
                  <div className="overflow-y-auto flex-1 p-1">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => {
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
                        No options found
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

export default FormMultiSelect;
