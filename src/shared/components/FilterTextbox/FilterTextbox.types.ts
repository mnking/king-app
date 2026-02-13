/**
 * FilterTextbox Component Types
 *
 * Type definitions for manual-trigger filter textbox with active-state feedback,
 * multi-field support, and optional custom transformations.
 */

import type { ReactNode } from 'react';

/**
 * FilterTextbox component props
 */
export interface FilterTextboxProps {
  /**
   * Array of field identifiers to search across.
   * When empty, component enters disabled state with helper text.
   * @required
   */
  fields: string[];

  /**
   * Callback triggered when search icon is clicked or Enter is pressed.
   * Receives sanitized search term and enabled fields.
   */
  onSearch?: (searchTerm: string, fields: string[]) => void;

  /**
   * Callback triggered when input value changes (controlled mode).
   * Required when using controlled mode with `value` prop.
   */
  onInputChange?: (value: string) => void;

  /**
   * Callback triggered when clear button is clicked.
   * Use to reset parent state or refetch data with empty search.
   */
  onClear?: () => void;

  /**
   * Current input value (controlled mode).
   * When provided, component operates in controlled mode and requires `onInputChange`.
   */
  value?: string;

  /**
   * Initial input value (uncontrolled mode).
   * Only used when `value` is not provided.
   */
  defaultValue?: string;

  /**
   * Placeholder text for input field.
   * Should be i18n-ready translation key.
   * @default "Search..." (TODO(i18n))
   */
  placeholder?: string;

  /**
   * Maximum length of search term.
   * Enforced before callbacks are triggered.
   * @default 200
   */
  maxLength?: number;

  /**
   * Optional preprocessing function executed before sanitization.
   * Must be pure and return string.
   * Use for custom parsing (e.g., handling comparison operators like ">=").
   */
  transformSearchTerm?: (input: string) => string;

  /**
   * Opt-out flag for default HTML/regex escaping.
   * Only set to true if `transformSearchTerm` handles sanitization.
   * @default false
   */
  skipSanitization?: boolean;

  /**
   * Disabled state (in addition to empty fields check).
   * When true, input and buttons are disabled.
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom class name for wrapper div.
   */
  className?: string;

  /**
   * ARIA labels for accessibility.
   * All keys should be i18n-ready translation keys.
   */
  ariaLabels?: {
    /**
     * Label for the input field.
     * @default "Search input" (TODO(i18n))
     */
    input?: string;

    /**
     * Label for the search button.
     * @default "Search" (TODO(i18n))
     */
    searchButton?: string;

    /**
     * Label for the clear button.
     * @default "Clear search" (TODO(i18n))
     */
    clearButton?: string;
  };

  /**
   * ARIA live region messages for screen readers.
   * Should be i18n-ready translation keys or interpolated strings.
   */
  ariaFilteringMessage?: string;
  ariaClearedMessage?: string;
  ariaEmptyMessage?: string;

  /**
   * Custom icons for search and clear buttons.
   * Defaults to Lucide React icons.
   */
  icons?: {
    search?: ReactNode;
    clear?: ReactNode;
  };
}

/**
 * Internal state for FilterTextbox component
 */
export interface FilterState {
  /**
   * Current input value (sanitized unless skipSanitization)
   */
  value: string;

  /**
   * True when value.trim().length > 0 and fields non-empty
   */
  isActive: boolean;

  /**
   * True when fields.length === 0 or disabled prop is true
   */
  isDisabled: boolean;

  /**
   * Timestamp (ms) of last executed search
   * Used for analytics and rerun detection
   */
  lastRunAt?: number;
}

/**
 * Mode for controlled vs uncontrolled component behavior
 */
export type FilterMode = 'controlled' | 'uncontrolled';
