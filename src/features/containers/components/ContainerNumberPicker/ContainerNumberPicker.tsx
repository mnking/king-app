import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { containerNumberSchema, type ContainerFieldValue } from '@/features/containers/schemas';
import type {
  ContainerNumberPickerProps,
  ContainerNumberPickerHandle,
} from '@/features/containers/types/container-picker.types';
import { useCreateContainer, useContainerByNumber } from '@/features/containers/hooks/use-containers-query';
import { useContainerTypeList } from '@/features/containers/hooks/use-container-types-query';
import { normalizeContainerNumber } from '@/shared/utils/container';
import { CreateContainerModal } from '@/features/containers/components/container-list/CreateContainerModal';

/**
 * ContainerNumberPicker Component
 *
 * A reusable form field component for entering and validating ISO 6346 container numbers.
 * Features:
 * - Real-time ISO 6346 validation (format + check digit)
 * - Automatic resolution against the API
 * - Inline modal for creating new containers when not found
 * - Readonly container type display
 * - Full React Hook Form integration
 *
 * @example
 * ```tsx
 * // With React Hook Form
 * <Controller
 *   control={form.control}
 *   name="container"
 *   render={({ field, fieldState }) => (
 *     <ContainerNumberPicker
 *       value={field.value}
 *       onChange={field.onChange}
 *       error={fieldState.error?.message}
 *       onResolved={({ value, existed }) => console.log('Resolved:', value, existed)}
 *     />
 *   )}
 * />
 * ```
 */
export const ContainerNumberPicker = forwardRef<ContainerNumberPickerHandle, ContainerNumberPickerProps>(
  (props, ref) => {
    const {
      name = 'container',
      value,
      onChange,
      onResolved,
      error: externalError,
      allowCreateWhenNotFound = true,
      resolveOnBlur = true,
      disabled = false,
      required = false,
      autoFocus = false,
      placeholder = 'Enter container number',
      className = '',
      inputClassName = '',
      typeBoxClassName = '',
      hideTypeBox = false,
      label = 'Container Number',
      typeLabel = 'Container Type',
    } = props;

    // === State ===
    const [internalValue, setInternalValue] = useState<ContainerFieldValue>(() => value || {
      id: null,
      number: '',
      typeCode: null,
    });
    const [inputValue, setInputValue] = useState(value?.number || '');
    const [localError, setLocalError] = useState<string>('');
    const [showCreateButton, setShowCreateButton] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shouldResolve, setShouldResolve] = useState(false);
    const [containerTypeInfo, setContainerTypeInfo] = useState<{ size: string; description: string } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const lastResolvedNumber = useRef<string>('');
    const autoResolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pasteResolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Normalize the input value for querying
    const normalizedNumber = normalizeContainerNumber(inputValue);
    const shouldFetch = shouldResolve && normalizedNumber.length === 11;

  // Query for container by number (only enabled when we want to resolve)
  const containerQuery = useContainerByNumber(normalizedNumber, { enabled: shouldFetch });

  const containerTypesQuery = useContainerTypeList();
  const createContainerMutation = useCreateContainer();

  // === Controlled value sync ===
  useEffect(() => {
    if (!value) {
      return;
    }

    setInternalValue(value);
    setInputValue(value.number);

    if (!value.number) {
      lastResolvedNumber.current = '';
    }

    // If value has id (existing container) but no containerTypeInfo yet, trigger resolution
    // This ensures containerTypeInfo is populated when editing existing data
    if (value.id && value.number && !containerTypeInfo) {
      const normalized = normalizeContainerNumber(value.number);
      if (normalized.length === 11 && normalized !== lastResolvedNumber.current) {
        setShouldResolve(true);
      }
    }
  }, [value, containerTypeInfo]);

  useEffect(() => {
    const typeCode = value?.typeCode ?? null;

    if (!typeCode) {
      if (containerTypeInfo) {
        setContainerTypeInfo(null);
      }
      return;
    }

    const typeResults = containerTypesQuery.data?.results ?? [];
    const matchedType = typeResults.find((type) => type.code === typeCode);

    if (matchedType) {
      setContainerTypeInfo((current) => {
        if (
          current?.size === matchedType.size &&
          current?.description === matchedType.description
        ) {
          return current;
        }
        return {
          size: matchedType.size,
          description: matchedType.description,
        };
      });
      return;
    }

    // Fallback: if we couldn't hydrate via type list and we have a number, attempt resolution once
    if (!value?.id && value?.number) {
      const normalized = normalizeContainerNumber(value.number);
      if (normalized.length === 11 && normalized !== lastResolvedNumber.current) {
        setShouldResolve(true);
      }
    }
  }, [
    value?.id,
    value?.number,
    value?.typeCode,
    containerTypeInfo,
    containerTypesQuery.data,
  ]);

  useEffect(() => {
    // Cleanup pending timers on unmount to avoid setState after teardown
    return () => {
      if (autoResolveTimeoutRef.current) {
        clearTimeout(autoResolveTimeoutRef.current);
        autoResolveTimeoutRef.current = null;
      }
      if (pasteResolveTimeoutRef.current) {
        clearTimeout(pasteResolveTimeoutRef.current);
        pasteResolveTimeoutRef.current = null;
      }
    };
  }, []);

  // === Emit changes to parent ===
  const emitChange = useCallback((newValue: ContainerFieldValue) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // === Validation ===
  const validate = useCallback((): boolean => {
    setLocalError('');

    if (!inputValue.trim()) {
      if (required) {
        setLocalError('Container number is required');
        return false;
      }
      return true;
    }

    const result = containerNumberSchema.safeParse(inputValue);
    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid container number';
      setLocalError(errorMessage);
      return false;
    }

    return true;
  }, [inputValue, required]);

  // === Resolution (find container) ===
  const resolve = useCallback(async () => {
    if (!validate()) {
      return;
    }

    if (!inputValue.trim()) {
      return;
    }

    const normalized = normalizeContainerNumber(inputValue);

    // Skip if already resolved
    if (normalized === lastResolvedNumber.current) {
      return;
    }

    // Trigger the query
    setShouldResolve(true);
  }, [validate, inputValue]);

  // === Handle query results ===
  useEffect(() => {
    if (!shouldResolve || !shouldFetch) return;

    if (containerQuery.status === 'success') {
      setShouldResolve(false);

      if (containerQuery.data) {
        // Container found
        const container = containerQuery.data;
        const newValue: ContainerFieldValue = {
          id: container.id,
          number: container.number,
          typeCode: container.containerTypeCode,
        };

        // Store full container type info for display
        if (container.containerType) {
          setContainerTypeInfo({
            size: container.containerType.size,
            description: container.containerType.description,
          });
        }

        lastResolvedNumber.current = container.number;
        setShowCreateButton(false);
        setLocalError('');
        emitChange(newValue);

        onResolved?.({
          value: newValue,
          existed: true,
          raw: container,
        });
      }
    } else if (containerQuery.status === 'error') {
      setShouldResolve(false);

      // Check if it's a 404 (not found)
      const error = containerQuery.error as any;
      const isNotFound = error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found');

      if (isNotFound && allowCreateWhenNotFound) {
        // Container not found, but creation allowed - show create button
        setShowCreateButton(true);
        setLocalError('');
      } else if (isNotFound && !allowCreateWhenNotFound) {
        // Container not found, creation NOT allowed - show clear message
        setShowCreateButton(false);
        setLocalError('Container not found in the system');
      } else {
        // Other errors (network, server error, etc.)
        setShowCreateButton(false);
        setLocalError('Failed to resolve container. Please try again.');
      }
    }
  }, [shouldResolve, shouldFetch, containerQuery.status, containerQuery.data, containerQuery.error, allowCreateWhenNotFound, emitChange, onResolved]);

  // === Reset ===
  const reset = useCallback(() => {
    setInputValue('');
    setInternalValue({ id: null, number: '', typeCode: null });
    setContainerTypeInfo(null);
    setLocalError('');
    setShowCreateButton(false);
    setShouldResolve(false);
    lastResolvedNumber.current = '';
    emitChange({ id: null, number: '', typeCode: null });
  }, [emitChange]);

  // === Focus ===
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // === Imperative handle ===
  useImperativeHandle(ref, () => ({
    validate,
    resolve,
    reset,
    focus,
  }), [validate, resolve, reset, focus]);

  // === Input handlers ===
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setLocalError(''); // Clear errors while typing
    setShowCreateButton(false);

    // Update the number field immediately
    emitChange({
      ...internalValue,
      number: newValue,
      id: null, // Clear ID when number changes
      typeCode: null, // Clear type when number changes
    });

    // Clear last resolved to allow re-resolution
    lastResolvedNumber.current = '';

    // Auto-resolve when exactly 11 characters are entered
    const normalized = normalizeContainerNumber(newValue);
    if (normalized.length === 11) {
      // Small delay to allow user to see what they typed
      if (autoResolveTimeoutRef.current) {
        clearTimeout(autoResolveTimeoutRef.current);
      }
      autoResolveTimeoutRef.current = setTimeout(() => {
        if (!normalized) return;

        // Skip if already resolved
        if (normalized === lastResolvedNumber.current) return;

        // Validate ISO 6346 format before attempting to resolve
        const validationResult = containerNumberSchema.safeParse(normalized);
        if (!validationResult.success) {
          // Show validation error for invalid format/check digit
          const errorMessage = validationResult.error.errors[0]?.message || 'Invalid container number';
          setLocalError(errorMessage);
          return;
        }

        // Valid format - trigger the query to check if container exists
        setShouldResolve(true);
      }, 100);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Get pasted text
    const pastedText = e.clipboardData.getData('text');
    const normalized = normalizeContainerNumber(pastedText);

    // Clear any errors on paste
    setLocalError('');
    setShowCreateButton(false);

    // If pasted text is exactly 11 characters, auto-resolve after paste completes
    if (normalized.length === 11) {
      if (pasteResolveTimeoutRef.current) {
        clearTimeout(pasteResolveTimeoutRef.current);
      }
      pasteResolveTimeoutRef.current = setTimeout(() => {
        if (!normalized || normalized === lastResolvedNumber.current) return;

        // Validate ISO 6346 format before attempting to resolve
        const validationResult = containerNumberSchema.safeParse(normalized);
        if (!validationResult.success) {
          // Show validation error for invalid format/check digit
          const errorMessage = validationResult.error.errors[0]?.message || 'Invalid container number';
          setLocalError(errorMessage);
          return;
        }

        // Valid format - trigger the query to check if container exists
        setShouldResolve(true);
      }, 150);
    }
  };

  const handleBlur = () => {
    if (resolveOnBlur && inputValue.trim()) {
      const normalized = normalizeContainerNumber(inputValue);
      // Only resolve on blur if exactly 11 characters
      if (normalized.length === 11) {
        resolve();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = normalizeContainerNumber(inputValue);
      if (normalized.length === 11) {
        resolve();
      }
    }
  };

  // === Create Modal handlers ===
  const handleOpenModal = () => {
    if (validate()) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleContainerCreated = (container: any) => {
    const newValue: ContainerFieldValue = {
      id: container.id,
      number: container.number,
      typeCode: container.containerTypeCode,
    };

    // Store full container type info for display
    if (container.containerType) {
      setContainerTypeInfo({
        size: container.containerType.size,
        description: container.containerType.description,
      });
    }

    lastResolvedNumber.current = container.number;
    setInputValue(container.number);
    setShowCreateButton(false);
    setLocalError('');
    setIsModalOpen(false);
    emitChange(newValue);

    onResolved?.({
      value: newValue,
      existed: false,
      raw: container,
    });

    // Return focus to input
    inputRef.current?.focus();
  };

  // === Render ===
  const displayError = externalError || localError;
  const shouldShowInlineError = Boolean(displayError);
  const isLoading = containerQuery.isFetching;

  // Format type display with size and description
  const typeDisplay = internalValue.typeCode
    ? containerTypeInfo
      ? `${internalValue.typeCode} - ${containerTypeInfo.size} (${containerTypeInfo.description})`
      : internalValue.typeCode
    : '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Container Number Input */}
      <div className="space-y-2">
        <label htmlFor={`${name}-number`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <input
            ref={inputRef}
            id={`${name}-number`}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            className={`
              w-full px-3 py-2 pr-10
              border rounded-md shadow-sm
              font-mono uppercase
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
              ${displayError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}
              ${inputClassName}
            `}
            aria-invalid={!!displayError}
            aria-describedby={shouldShowInlineError ? `${name}-error` : undefined}
          />

          {/* Adornments (spinner, create button, retry button) */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isLoading && (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin pointer-events-none" aria-label="Loading" />
            )}
            {showCreateButton && !isLoading && (
              <button
                type="button"
                onMouseDown={(e) => {
                  // Use onMouseDown to capture click before input onBlur fires
                  e.preventDefault(); // Prevent input from losing focus
                  handleOpenModal();
                }}
                className="pointer-events-auto p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                aria-label="Create new container"
                title="Create new container"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            {displayError && !isLoading && !showCreateButton && (
              <AlertCircle className="h-5 w-5 text-red-500 pointer-events-none" aria-label="Error" />
            )}
          </div>
        </div>

        {/* Error message */}
        {shouldShowInlineError && (
          <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {displayError}
          </p>
        )}

        {/* Character counter */}
        {!displayError && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {normalizedNumber.length}/11 characters
          </p>
        )}
      </div>

      {/* Container Type (readonly) */}
      {!hideTypeBox && (
        <div className="space-y-2">
          <label htmlFor={`${name}-type`} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            {typeLabel}
          </label>
          <input
            id={`${name}-type`}
            type="text"
            value={typeDisplay}
            readOnly
            disabled
            placeholder="—"
            className={`
              w-full px-3 py-2
              border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
              bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300
              cursor-default
              ${typeBoxClassName}
            `}
            tabIndex={-1}
          />
        </div>
      )}

      {/* Create Container Modal */}
      {isModalOpen && (
        <CreateContainerModal
          isOpen={isModalOpen}
          containerNumber={normalizedNumber}
          onClose={handleCloseModal}
          onCreated={handleContainerCreated}
          containerTypes={containerTypesQuery.data?.results || []}
          isLoadingTypes={containerTypesQuery.isFetching}
          createMutation={createContainerMutation}
        />
      )}
    </div>
  );
}
);

ContainerNumberPicker.displayName = 'ContainerNumberPicker';
