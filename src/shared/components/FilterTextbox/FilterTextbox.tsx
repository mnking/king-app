/**
 * FilterTextbox Component
 *
 * Manual-trigger filter control with active-state feedback, helper text,
 * and clear functionality. Supports controlled/uncontrolled modes.
 *
 * @example
 * ```tsx
 * <FilterTextbox
 *   fields={['bookingNumber', 'agentCode']}
 *   onSearch={(term, fields) => refetchData(term, fields)}
 *   placeholder="Search booking orders..."
 * />
 * ```
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { escapeSearchTerm } from '@/shared/utils';
import type { FilterTextboxProps } from './FilterTextbox.types';

/**
 * Convert camelCase to Title Case
 * @example bookingNumber -> Booking Number
 */
const camelToTitleCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, (s) => s.toUpperCase()) // Capitalize first letter
    .trim();
};

const FilterTextbox: React.FC<FilterTextboxProps> = ({
  fields,
  onSearch,
  onInputChange,
  onClear,
  value: controlledValue,
  defaultValue = '',
  placeholder = 'Search...', // TODO(i18n): t('common.search')
  maxLength = 200,
  transformSearchTerm,
  skipSanitization = false,
  disabled: disabledProp = false,
  className = '',
  ariaLabels,
  ariaFilteringMessage,
  ariaClearedMessage,
  ariaEmptyMessage: _ariaEmptyMessage,
  icons,
}) => {
  // Determine if we're in controlled mode
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [isActive, setIsActive] = useState(false);

  // Use controlled value if provided, otherwise use internal state
  const inputValue = isControlled ? controlledValue : uncontrolledValue;

  // Refs for tracking state
  const ariaLiveRef = useRef<HTMLDivElement>(null);

  // Determine disabled state
  const isFieldsEmpty = fields.length === 0;
  const isDisabled = disabledProp || isFieldsEmpty;

  // Generate dynamic placeholder with field names
  const dynamicPlaceholder = useMemo(() => {
    if (isFieldsEmpty) {
      return placeholder;
    }

    // Get first 3 fields and convert to Title Case
    const displayFields = fields.slice(0, 3).map(camelToTitleCase);
    const hasMore = fields.length > 3;

    // Append field names to placeholder
    const fieldText = hasMore
      ? `${displayFields.join(', ')}, ...`
      : displayFields.join(', ');

    return `${placeholder} (${fieldText})`;
  }, [fields, placeholder, isFieldsEmpty]);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Enforce maxLength
    if (newValue.length > maxLength) {
      return;
    }

    if (isControlled) {
      // In controlled mode, notify parent
      onInputChange?.(newValue);
    } else {
      // In uncontrolled mode, update internal state
      setUncontrolledValue(newValue);
    }
  };

  /**
   * Process search term through transform and sanitization pipeline
   */
  const processSearchTerm = (term: string): string => {
    let processed = term.trim();

    // Apply custom transform if provided
    if (transformSearchTerm) {
      processed = transformSearchTerm(processed);
    }

    // Apply sanitization unless skipped
    if (!skipSanitization) {
      processed = escapeSearchTerm(processed);
    }

    return processed;
  };

  /**
   * Handle search execution (icon click or Enter press)
   */
  const handleSearch = () => {
    if (isDisabled) {
      return;
    }

    const trimmedValue = inputValue.trim();

    // Empty search = "search all" (clear filter)
    if (!trimmedValue) {
      setIsActive(false);
      onSearch?.('', fields);
      return;
    }

    // Process the search term
    const processedTerm = processSearchTerm(trimmedValue);

    // Update active state
    setIsActive(true);

    // Trigger callback
    onSearch?.(processedTerm, fields);

    // Announce to screen readers
    if (ariaLiveRef.current && ariaFilteringMessage) {
      ariaLiveRef.current.textContent = ariaFilteringMessage;
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  /**
   * Handle clear button click
   * Wrapped in useCallback for useEffect dependency
   */
  const handleClear = useCallback(() => {
    if (isControlled) {
      // In controlled mode, notify parent to clear
      onInputChange?.('');
    } else {
      // In uncontrolled mode, clear internal state
      setUncontrolledValue('');
    }

    // Reset active state
    setIsActive(false);

    // Trigger clear callback
    onClear?.();

    // Announce to screen readers
    if (ariaLiveRef.current && ariaClearedMessage) {
      ariaLiveRef.current.textContent = ariaClearedMessage;
    }
  }, [isControlled, onInputChange, onClear, ariaClearedMessage]);

  /**
   * Auto-clear when input is manually deleted to empty
   * (Option B: Trigger full clear flow like clicking clear icon)
   */
  useEffect(() => {
    // If input becomes empty while filter is active, trigger clear flow
    if (inputValue === '' && isActive) {
      handleClear();
    }
  }, [inputValue, isActive, handleClear]); // Watch for empty input while filter active

  // Show clear button when there's input value
  const showClearButton = inputValue.length > 0;

  // Determine input background class based on active state
  const inputBgClass = isActive
    ? 'bg-blue-50 dark:bg-blue-900/40'
    : 'bg-white dark:bg-gray-800';

  // Helper text - only show error state (removed "Filter active" text per user feedback)
  const helperText = isFieldsEmpty
    ? 'No fields configured for filtering' // TODO(i18n): t('errors.noFieldsConfigured')
    : null;

  const helperTextClass = 'text-gray-500 dark:text-gray-400';

  return (
    <div className={`w-full ${className}`} data-testid="filter-textbox">
      <div className="relative">
        {/* Input field with buttons inside */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          disabled={isDisabled}
          maxLength={maxLength}
          aria-label={ariaLabels?.input || 'Search input'}
          aria-describedby={helperText ? 'filter-helper-text' : undefined}
          className={`
            w-full pl-3 pr-20 py-2 border rounded-lg
            ${inputBgClass}
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            border-gray-300 dark:border-gray-600
            transition-colors duration-200
          `}
        />

        {/* Buttons container (inside input, right side) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear button */}
          {showClearButton && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={ariaLabels?.clearButton || 'Clear filter'}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
            >
              {icons?.clear || <X size={16} />}
            </button>
          )}

          {/* Search icon button (always enabled) */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={isDisabled}
            aria-label={ariaLabels?.searchButton || 'Search'}
            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {icons?.search || <Search size={18} />}
          </button>
        </div>
      </div>

      {/* Helper text */}
      {helperText && (
        <p
          id="filter-helper-text"
          className={`mt-1 text-sm ${helperTextClass}`}
        >
          {helperText}
        </p>
      )}

      {/* ARIA live region for screen reader announcements */}
      <div
        ref={ariaLiveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
};

export { FilterTextbox };
export default FilterTextbox;
