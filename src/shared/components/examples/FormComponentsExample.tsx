/**
 * FormComponentsExample
 *
 * Demonstrates FormSingleSelect and FormMultiSelect components with comprehensive test scenarios.
 * This example is for viewing, testing, and evaluating shared components for future
 * upgrades and debugging purposes.
 *
 * FormSingleSelect features:
 * - Built-in search functionality (always enabled)
 * - Auto-focus search input when dropdown opens
 * - Case-insensitive search in option labels
 * - Clear selection button (dropdown stays open)
 *
 * Test scenarios covered:
 * - Required vs optional fields
 * - Validation and error states
 * - Disabled state
 * - Different placeholder texts
 * - Form submission
 * - Form reset
 * - Dynamic value display
 * - Search and filter functionality
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormSingleSelect } from '@/shared/components/forms/FormSingleSelect';
import { FormMultiSelect } from '@/shared/components/forms/FormMultiSelect';
import toast from 'react-hot-toast';

// Mock data for testing
const categoryOptions = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'automotive', label: 'Automotive' },
];

const priorityOptions = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
];

const tagOptions = [
  { value: 'fragile', label: 'Fragile' },
  { value: 'perishable', label: 'Perishable' },
  { value: 'hazardous', label: 'Hazardous' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'temperature-controlled', label: 'Temperature Controlled' },
  { value: 'high-value', label: 'High Value' },
];

const regionOptions = [
  { value: 'north', label: 'North Region' },
  { value: 'south', label: 'South Region' },
  { value: 'central', label: 'Central Region' },
  { value: 'east', label: 'East Region' },
  { value: 'west', label: 'West Region' },
];

// Form schema with validation
const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  priority: z.string().min(1, 'Priority is required'),
  optionalCategory: z.string().optional(),
  tags: z.array(z.string()).min(1, 'At least one tag must be selected'),
  optionalTags: z.array(z.string()).optional(),
  disabledSelect: z.string().optional(),
  disabledMultiSelect: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function FormComponentsExample() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      priority: '',
      optionalCategory: '',
      tags: [],
      optionalTags: [],
      disabledSelect: 'north',
      disabledMultiSelect: ['fragile', 'high-value'],
    },
  });

  const onSubmit = async (data: FormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setFormData(data);
    toast.success('Form submitted successfully!');
    console.log('Form data:', data);
  };

  const handleReset = () => {
    reset();
    setFormData(null);
    toast.success('Form reset!');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Form Components Example
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Comprehensive testing and evaluation page for FormSingleSelect and FormMultiSelect components.
          Use this page to view behavior, test edge cases, and debug shared form components.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isFormDisabled}
            onChange={(e) => setIsFormDisabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Disable entire form (test disabled state)
          </span>
        </label>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 space-y-6">
          {/* Section 1: Required FormSingleSelect */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              FormSingleSelect - Required Fields
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSingleSelect
                name="category"
                control={control}
                label="Category"
                required
                options={categoryOptions}
                placeholder="Select a category..."
                disabled={isFormDisabled}
              />
              <FormSingleSelect
                name="priority"
                control={control}
                label="Priority Level"
                required
                options={priorityOptions}
                placeholder="Select priority..."
                disabled={isFormDisabled}
              />
            </div>
            {(errors.category || errors.priority) && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Note: Required fields show validation errors when empty
              </p>
            )}
          </div>

          {/* Section 2: Optional FormSingleSelect */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              FormSingleSelect - Optional Field
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSingleSelect
                name="optionalCategory"
                control={control}
                label="Optional Category"
                options={categoryOptions}
                placeholder="This field is optional..."
                disabled={isFormDisabled}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This field has no validation requirements
            </p>
          </div>

          {/* Section 3: Required FormMultiSelect */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              FormMultiSelect - Required Field
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <FormMultiSelect
                name="tags"
                control={control}
                label="Cargo Tags"
                required
                options={tagOptions}
                placeholder="Select tags..."
                disabled={isFormDisabled}
              />
            </div>
            {errors.tags && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Note: At least one tag must be selected
              </p>
            )}
          </div>

          {/* Section 4: Optional FormMultiSelect */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              FormMultiSelect - Optional Field
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <FormMultiSelect
                name="optionalTags"
                control={control}
                label="Additional Tags"
                options={tagOptions}
                placeholder="Optional: Select additional tags..."
                disabled={isFormDisabled}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This field is optional and can be left empty
            </p>
          </div>

          {/* Section 5: Disabled State */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Disabled State Test
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSingleSelect
                name="disabledSelect"
                control={control}
                label="Disabled Select"
                options={regionOptions}
                placeholder="This is disabled..."
                disabled={true}
              />
              <FormMultiSelect
                name="disabledMultiSelect"
                control={control}
                label="Disabled Multi-Select"
                options={tagOptions}
                placeholder="This is disabled..."
                disabled={true}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              These fields are always disabled (regardless of form state toggle)
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isFormDisabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || isFormDisabled}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Form
            </button>
          </div>
        </div>
      </form>

      {/* Form Values Display */}
      {formData && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
            Submitted Form Values
          </h3>
          <pre className="text-xs text-green-800 dark:text-green-400 overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      )}

      {/* Validation Errors Display */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
            Validation Errors
          </h3>
          <pre className="text-xs text-red-800 dark:text-red-400 overflow-auto">
            {JSON.stringify(errors, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
          Test Scenarios
        </h3>
        <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
          <li>
            <strong>Search feature:</strong> Open FormSingleSelect and type to search/filter options in real-time
          </li>
          <li>
            <strong>Clear selection:</strong> Click "Clear Selection" button - dropdown stays open for quick re-selection
          </li>
          <li>
            <strong>Required validation:</strong> Try submitting without selecting category/priority or tags
          </li>
          <li>
            <strong>Optional fields:</strong> Submit form with optional fields empty - should succeed
          </li>
          <li>
            <strong>Multi-select:</strong> Test "Select All" and "Clear All" buttons in multi-select
          </li>
          <li>
            <strong>Disabled state:</strong> Toggle the "Disable entire form" checkbox to test disabled UI
          </li>
          <li>
            <strong>Always disabled:</strong> Bottom two fields are permanently disabled with pre-filled values
          </li>
          <li>
            <strong>Form reset:</strong> Click "Reset Form" to clear all values and errors
          </li>
          <li>
            <strong>Dark mode:</strong> Test components in both light and dark mode
          </li>
          <li>
            <strong>Keyboard navigation:</strong> Use Tab, Arrow keys, Enter, and Space to navigate
          </li>
        </ul>
      </div>

      {/* Component Properties Documentation */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300 mb-3">
          Component API Reference
        </h3>

        <div className="space-y-4 text-xs text-gray-700 dark:text-gray-400">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">FormSingleSelect Props:</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code>name</code>: Field name (required)</li>
              <li><code>control</code>: React Hook Form control (required)</li>
              <li><code>options</code>: Array of {'{value: string, label: string}'} (required)</li>
              <li><code>label</code>: Field label</li>
              <li><code>required</code>: Show required indicator</li>
              <li><code>placeholder</code>: Placeholder text</li>
              <li><code>className</code>: Additional CSS classes</li>
              <li><code>disabled</code>: Disable the field</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">FormMultiSelect Props:</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code>name</code>: Field name (required)</li>
              <li><code>control</code>: React Hook Form control (required)</li>
              <li><code>options</code>: Array of {'{value: string, label: string}'} (required)</li>
              <li><code>label</code>: Field label</li>
              <li><code>required</code>: Show required indicator</li>
              <li><code>placeholder</code>: Placeholder text</li>
              <li><code>className</code>: Additional CSS classes</li>
              <li><code>disabled</code>: Disable the field</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
