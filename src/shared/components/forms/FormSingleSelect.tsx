import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { ChevronDown, Search } from 'lucide-react';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSingleSelectProps<T extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

const isValueMatch = (optionValue: string, fieldValue: unknown) => {
  if (typeof fieldValue !== 'string') {
    return optionValue === fieldValue;
  }
  return optionValue.toLowerCase() === fieldValue.toLowerCase();
};

export const FormSingleSelect = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  options,
  placeholder = 'Select an option...',
  className = '',
  ...selectProps
}: FormSingleSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const MIN_HEIGHT_NEEDED = 220; // Approx max-h-60 (240px) plus buffer

    const defaultMaxHeight = 240; // max-h-60 equivalent

    // Decide whether to flip
    const shouldFlip = spaceBelow < MIN_HEIGHT_NEEDED && spaceAbove > spaceBelow;

    if (shouldFlip) {
      setMenuPosition({
        bottom: viewportHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(defaultMaxHeight, spaceAbove - 10),
      });
    } else {
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(defaultMaxHeight, spaceBelow - 10),
      });
    }
  }, []);

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
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
      setSearchTerm('');
      setMenuPosition(null);
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

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleScroll = () => updateMenuPosition();
    const handleResize = () => updateMenuPosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOption = options.find((opt) =>
          isValueMatch(opt.value, field.value),
        );
        const displayText = selectedOption?.label || placeholder;

        const handleSelect = (optionValue: string, disabled?: boolean) => {
          if (disabled) return;
          field.onChange(optionValue);
          setIsOpen(false);
          setSearchTerm('');
          setMenuPosition(null);
        };

        const handleClear = () => {
          field.onChange('');
          setSearchTerm('');
          // Refocus search input after clearing
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 0);
        };

        const menu = isOpen && menuPosition
          ? (
            <div
              ref={menuRef}
              className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden flex flex-col"
              style={{
                top: menuPosition.top,
                bottom: menuPosition.bottom,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
              }}
              role="listbox"
            >
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

              {selectedOption && (
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div className="overflow-y-auto flex-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const isSelected = isValueMatch(option.value, field.value);
                    const isDisabled = option.disabled === true;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value, isDisabled)}
                        disabled={isDisabled}
                        className={`w-full text-left px-3 py-2 text-sm focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${isSelected
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
                    No options found
                  </div>
                )}
              </div>
            </div>
          )
          : null;

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div className="relative" ref={dropdownRef}>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                  if (isOpen) {
                    setIsOpen(false);
                    setSearchTerm('');
                    setMenuPosition(null);
                    return;
                  }
                  updateMenuPosition();
                  setIsOpen(true);
                }}
                disabled={selectProps.disabled}
                className={`
                  w-full px-3 py-2 border rounded-lg
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  text-left
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-between
                  ${error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}
                aria-label={label || 'Select dropdown'}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span className={!selectedOption ? 'text-gray-500' : ''}>
                  {displayText}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {typeof document !== 'undefined' && menu
              ? createPortal(menu, document.body)
              : null}
          </FormField>
        );
      }}
    />
  );
};

export default FormSingleSelect;
