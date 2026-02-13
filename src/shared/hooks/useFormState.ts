import { useState, useCallback, useEffect } from 'react';
import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ===========================
// TYPES AND INTERFACES
// ===========================

interface FormStateOptions<T extends FieldValues> {
  // Form configuration
  schema?: z.ZodType<T>;
  defaultValues?: T;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';

  // Auto-save configuration
  autoSave?: boolean;
  autoSaveDelay?: number;
  autoSaveKey?: string;

  // Persistence configuration
  persistToLocalStorage?: boolean;
  localStorageKey?: string;

  // Reset behavior
  resetOnSubmitSuccess?: boolean;
  resetOnUnmount?: boolean;

  // Callbacks
  onSubmitSuccess?: (data: T) => void | Promise<void>;
  onSubmitError?: (error: any) => void;
  onAutoSave?: (data: T) => void | Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;

  // Advanced options
  enableDirtyTracking?: boolean;
  enableFormHistory?: boolean;
  maxHistorySize?: number;
}

interface FormState {
  isSubmitting: boolean;
  isAutoSaving: boolean;
  isDirty: boolean;
  submitCount: number;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  validationErrors: Record<string, string>;
}

interface FormActions<T extends FieldValues> {
  submit: () => Promise<void>;
  reset: (values?: T) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  clearLocalStorage: () => void;
  triggerAutoSave: () => void;
  markAsSaved: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface UseFormStateReturn<T extends FieldValues> extends UseFormReturn<T> {
  formState: FormState;
  formActions: FormActions<T>;
}

// ===========================
// MAIN HOOK
// ===========================

export const useFormState = <T extends FieldValues>(
  submitHandler: (data: T) => Promise<void> | void,
  options: FormStateOptions<T> = {},
): UseFormStateReturn<T> => {
  const {
    schema,
    defaultValues,
    mode = 'onChange',
    autoSave = false,
    autoSaveDelay = 2000,
    autoSaveKey,
    persistToLocalStorage = false,
    localStorageKey,
    resetOnSubmitSuccess = false,
    resetOnUnmount = false,
    onSubmitSuccess,
    onSubmitError,
    onAutoSave,
    onDirtyChange,
    enableDirtyTracking = true,
    enableFormHistory = false,
    maxHistorySize = 10,
  } = options;

  // ===========================
  // INTERNAL STATE
  // ===========================

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Form history for undo/redo
  const [formHistory, setFormHistory] = useState<T[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout>();

  // ===========================
  // FORM CONFIGURATION
  // ===========================

  const formConfig: UseFormProps<T> = {
    mode,
    defaultValues,
    ...(schema && { resolver: zodResolver(schema) }),
  };

  // Load persisted data if enabled
  if (persistToLocalStorage && localStorageKey) {
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsedData = JSON.parse(stored);
        formConfig.defaultValues = { ...defaultValues, ...parsedData };
      }
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
    }
  }

  const form = useForm<T>(formConfig);
  const {
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
    getValues,
  } = form;

  // ===========================
  // FORM HISTORY MANAGEMENT
  // ===========================

  const addToHistory = useCallback(
    (data: T) => {
      if (!enableFormHistory) return;

      setFormHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(data);

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        return newHistory;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
    },
    [enableFormHistory, maxHistorySize, historyIndex],
  );

  const undo = useCallback(() => {
    if (!enableFormHistory || historyIndex <= 0) return;

    const previousState = formHistory[historyIndex - 1];
    if (previousState) {
      reset(previousState);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [enableFormHistory, formHistory, historyIndex, reset]);

  const redo = useCallback(() => {
    if (!enableFormHistory || historyIndex >= formHistory.length - 1) return;

    const nextState = formHistory[historyIndex + 1];
    if (nextState) {
      reset(nextState);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [enableFormHistory, formHistory, historyIndex, reset]);

  // ===========================
  // AUTO-SAVE FUNCTIONALITY
  // ===========================

  const triggerAutoSave = useCallback(async () => {
    if (!autoSave && !onAutoSave) return;

    const data = getValues();

    try {
      setIsAutoSaving(true);

      if (onAutoSave) {
        await onAutoSave(data);
      }

      // Auto-save to localStorage if enabled
      if (autoSave && autoSaveKey) {
        localStorage.setItem(autoSaveKey, JSON.stringify(data));
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [autoSave, autoSaveKey, onAutoSave, getValues]);

  // Watch form changes for auto-save
  const watchedValues = watch();

  useEffect(() => {
    if (!autoSave && !onAutoSave) return;

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer
    const timer = setTimeout(triggerAutoSave, autoSaveDelay);
    setAutoSaveTimer(timer);

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [watchedValues, autoSave, autoSaveDelay, triggerAutoSave, onAutoSave, autoSaveTimer]);

  // ===========================
  // FORM SUBMISSION
  // ===========================

  const submit = useCallback(async () => {
    const submitFn = handleSubmit(async (data: T) => {
      try {
        setIsSubmitting(true);
        setSubmitCount((prev) => prev + 1);

        // Add to history before submission
        addToHistory(data);

        await submitHandler(data);

        // Mark as saved
        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        // Reset form if configured
        if (resetOnSubmitSuccess) {
          reset();
        }

        // Clear validation errors on success
        setValidationErrors({});

        // Call success callback
        if (onSubmitSuccess) {
          await onSubmitSuccess(data);
        }
      } catch (error) {
        console.error('Form submission failed:', error);

        if (onSubmitError) {
          onSubmitError(error);
        }

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    });

    return submitFn();
  }, [
    handleSubmit,
    submitHandler,
    addToHistory,
    resetOnSubmitSuccess,
    reset,
    onSubmitSuccess,
    onSubmitError,
  ]);

  // ===========================
  // PERSISTENCE HELPERS
  // ===========================

  const saveToLocalStorage = useCallback(() => {
    if (!localStorageKey) return;

    try {
      const data = getValues();
      localStorage.setItem(localStorageKey, JSON.stringify(data));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [localStorageKey, getValues]);

  const loadFromLocalStorage = useCallback(() => {
    if (!localStorageKey) return;

    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        reset(data);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }, [localStorageKey, reset]);

  const clearLocalStorage = useCallback(() => {
    if (!localStorageKey) return;

    try {
      localStorage.removeItem(localStorageKey);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }, [localStorageKey]);

  // ===========================
  // EFFECTS
  // ===========================

  // Track dirty state changes
  useEffect(() => {
    if (enableDirtyTracking && onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, enableDirtyTracking, onDirtyChange]);

  // Auto-persist to localStorage
  useEffect(() => {
    if (persistToLocalStorage && isDirty) {
      saveToLocalStorage();
    }
  }, [watchedValues, persistToLocalStorage, isDirty, saveToLocalStorage]);

  // Update validation errors
  useEffect(() => {
    const errorMessages: Record<string, string> = {};

    Object.entries(errors).forEach(([key, error]) => {
      if (error?.message) {
        errorMessages[key] = error.message as string;
      }
    });

    setValidationErrors(errorMessages);
  }, [errors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      if (resetOnUnmount) {
        reset();
      }
    };
  }, [autoSaveTimer, resetOnUnmount, reset]);

  // ===========================
  // RETURN INTERFACE
  // ===========================

  const markAsSaved = useCallback(() => {
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  }, []);

  return {
    ...form,
    formState: {
      isSubmitting,
      isAutoSaving,
      isDirty,
      submitCount,
      lastSaved,
      hasUnsavedChanges,
      validationErrors,
    },
    formActions: {
      submit,
      reset,
      saveToLocalStorage,
      loadFromLocalStorage,
      clearLocalStorage,
      triggerAutoSave,
      markAsSaved,
      undo,
      redo,
      canUndo: enableFormHistory && historyIndex > 0,
      canRedo: enableFormHistory && historyIndex < formHistory.length - 1,
    },
  };
};

// ===========================
// UTILITY HOOKS
// ===========================

/**
 * Simple form hook for basic forms without advanced features
 */
export const useSimpleForm = <T extends FieldValues>(
  submitHandler: (data: T) => Promise<void> | void,
  schema?: z.ZodType<T>,
  defaultValues?: T,
) => {
  return useFormState(submitHandler, {
    schema,
    defaultValues,
    mode: 'onChange',
  });
};

/**
 * Auto-saving form hook for long forms
 */
export const useAutoSaveForm = <T extends FieldValues>(
  submitHandler: (data: T) => Promise<void> | void,
  autoSaveHandler: (data: T) => Promise<void> | void,
  options: {
    schema?: z.ZodType<T>;
    defaultValues?: T;
    autoSaveDelay?: number;
    localStorageKey?: string;
  } = {},
) => {
  return useFormState(submitHandler, {
    ...options,
    autoSave: true,
    onAutoSave: autoSaveHandler,
    persistToLocalStorage: !!options.localStorageKey,
    enableFormHistory: true,
  });
};

/**
 * Modal form hook with specific behaviors for modal forms
 */
export const useModalForm = <T extends FieldValues>(
  submitHandler: (data: T) => Promise<void> | void,
  options: {
    schema?: z.ZodType<T>;
    defaultValues?: T;
    onSuccess?: () => void;
    onError?: (error: any) => void;
  } = {},
) => {
  return useFormState(submitHandler, {
    ...options,
    mode: 'onChange',
    resetOnSubmitSuccess: true,
    onSubmitSuccess: options.onSuccess,
    onSubmitError: options.onError,
  });
};

export default useFormState;
