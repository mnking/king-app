/**
 * Type definitions for DynamicFilter component
 *
 * Provides type-safe configuration for dynamic filter fields with support for:
 * - Text inputs
 * - Date pickers
 * - Single-select dropdowns
 * - Multi-select dropdowns with custom key/value mapping
 */

/**
 * Base configuration shared by all field types
 */
interface BaseFieldConfig {
  /** Unique field identifier (will be used as form field name) */
  name: string;
  /** Optional display label */
  label?: string;
}

/**
 * Configuration for text input field
 *
 * @example
 * ```typescript
 * {
 *   type: 'text',
 *   name: 'searchTerm',
 *   label: 'Search',
 *   placeholder: 'Enter search term...'
 * }
 * ```
 */
export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  /** Placeholder text for empty input */
  placeholder?: string;
}

/**
 * Configuration for date input field
 *
 * @example
 * ```typescript
 * {
 *   type: 'date',
 *   name: 'fromDate',
 *   label: 'From Date'
 * }
 * ```
 */
export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date';
}

/**
 * Configuration for datetime input field
 */
export interface DateTimeFieldConfig extends BaseFieldConfig {
  type: 'datetime';
  placeholder?: string;
}

/**
 * Configuration for single-select dropdown with custom key/value mapping
 *
 * @example
 * ```typescript
 * {
 *   type: 'select',
 *   name: 'province',
 *   label: 'Province',
 *   options: [
 *     { provinceCode: 'HCM', provinceName: 'Ho Chi Minh City' },
 *     { provinceCode: 'HN', provinceName: 'Ha Noi' }
 *   ],
 *   keyField: 'provinceCode',
 *   valueField: 'provinceName'
 * }
 * ```
 */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  /** Array of option objects */
  options: any[];
  /** Field name to use as the value (e.g., 'provinceCode') */
  keyField: string;
  /** Field name to display as label (e.g., 'provinceName') */
  valueField: string;
  /** Placeholder text when no option selected */
  placeholder?: string;
}

/**
 * Configuration for multi-select dropdown with checkboxes
 *
 * @example
 * ```typescript
 * {
 *   type: 'multiselect',
 *   name: 'statuses',
 *   label: 'Status',
 *   options: [
 *     { code: 'active', name: 'Active' },
 *     { code: 'pending', name: 'Pending' }
 *   ],
 *   keyField: 'code',
 *   valueField: 'name'
 * }
 * ```
 */
export interface MultiSelectFieldConfig extends BaseFieldConfig {
  type: 'multiselect';
  /** Array of option objects */
  options: any[];
  /** Field name to use as the value */
  keyField: string;
  /** Field name to display as label */
  valueField: string;
  /** Placeholder text when no options selected */
  placeholder?: string;
}

/**
 * Configuration for async single-select dropdown with remote search
 */
export interface AsyncSelectFieldConfig extends BaseFieldConfig {
  type: 'async-select';
  /** Array of option objects */
  options: any[];
  /** Field name to use as the value */
  keyField: string;
  /** Field name to display as label */
  valueField: string;
  /** Placeholder text when no option selected */
  placeholder?: string;
  /** Search input value (controlled) */
  searchValue?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Debounce time for search callback */
  debounceMs?: number;
  /** Minimum characters required before searching */
  minSearchLength?: number;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Loading state for remote options */
  isLoading?: boolean;
  /** Text shown when options are empty */
  emptyText?: string;
  /** Text shown while loading */
  loadingText?: string;
  /** Clear search input when closing the dropdown */
  clearSearchOnClose?: boolean;
  /** Optional display label when the selected value is not in options */
  displayValue?: string;
}

/**
 * Configuration for async multi-select dropdown with remote search
 */
export interface AsyncMultiSelectFieldConfig extends BaseFieldConfig {
  type: 'async-multiselect';
  /** Array of option objects */
  options: any[];
  /** Field name to use as the value */
  keyField: string;
  /** Field name to display as label */
  valueField: string;
  /** Placeholder text when no options selected */
  placeholder?: string;
  /** Search input value (controlled) */
  searchValue?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Debounce time for search callback */
  debounceMs?: number;
  /** Minimum characters required before searching */
  minSearchLength?: number;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Loading state for remote options */
  isLoading?: boolean;
  /** Text shown when options are empty */
  emptyText?: string;
  /** Text shown while loading */
  loadingText?: string;
  /** Clear search input when closing the dropdown */
  clearSearchOnClose?: boolean;
  /** Optional display labels keyed by option value when selected values are not in options */
  displayValues?: Record<string, string>;
}

/**
 * Discriminated union of all supported field configurations
 *
 * TypeScript will enforce that only valid properties are used for each field type.
 */
export type FilterFieldConfig =
  | TextFieldConfig
  | DateFieldConfig
  | DateTimeFieldConfig
  | SelectFieldConfig
  | MultiSelectFieldConfig
  | AsyncSelectFieldConfig
  | AsyncMultiSelectFieldConfig;

/**
 * Filter values returned by onApplyFilter callback
 *
 * Only non-empty values are included:
 * - Empty strings excluded
 * - Empty arrays excluded
 * - Null/undefined values excluded
 */
export type FilterValues = Record<string, string | string[]>;

/**
 * Props for DynamicFilter component
 *
 * @example
 * ```typescript
 * <DynamicFilter
 *   fields={[
 *     { type: 'text', name: 'search', label: 'Search' },
 *     { type: 'date', name: 'fromDate', label: 'From Date' },
 *     {
 *       type: 'select',
 *       name: 'status',
 *       label: 'Status',
 *       options: [{ id: '1', name: 'Active' }],
 *       keyField: 'id',
 *       valueField: 'name'
 *     }
 *   ]}
 *   onApplyFilter={(values) => {
 *     console.log(values); // { search: 'test', status: '1' }
 *   }}
 * />
 * ```
 */
export interface DynamicFilterProps {
  /** Array of field configurations defining filter inputs */
  fields: FilterFieldConfig[];

  /** Optional initial values applied when the component mounts or resets */
  initialValues?: FilterValues;

  /**
   * Callback triggered when user clicks Apply button
   * Receives only non-empty filter values as JSON object
   */
  onApplyFilter?: (values: FilterValues) => void;

  /**
   * Callback triggered when user clicks Clear button
   * Use to reset parent state or clear search results
   */
  onClear?: () => void;

  /**
   * Custom class name for wrapper div
   */
  className?: string;

  /**
   * Label for filter toggle button
   * @default "Filters"
   */
  buttonLabel?: string;

  /**
   * Flag for auto reset
   * @default "true"
   */
  disableAutoReset?: boolean;
}

/**
 * Option format for FormMultiSelect component
 * Used internally after mapping from custom keyField/valueField
 */
export interface SelectOption {
  /** Option value (stored in form state) */
  value: string;
  /** Option display label */
  label: string;
}
