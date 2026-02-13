import { useCallback } from 'react';
import { toastAdapter } from '@/shared/services';

/**
 * Options for the useUnsavedChanges hook
 */
export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes (typically from formState.isDirty) */
  isDirty: boolean;

  /** Whether the form is currently submitting */
  isSubmitting?: boolean;

  /** Whether the form is in read-only mode */
  isReadOnly?: boolean;

  /** Callback to close/navigate away from the form */
  onClose: () => void;

  /** Optional callback to reset the form state */
  reset?: () => void;

  /** Custom confirmation message */
  confirmMessage?: string;
}

/**
 * Return type for the useUnsavedChanges hook
 */
export interface UseUnsavedChangesReturn {
  /** Guarded close handler that prompts for confirmation if there are unsaved changes */
  handleClose: () => Promise<void>;

  /** Whether there are currently unsaved changes */
  hasUnsavedChanges: boolean;
}

/**
 * Hook to guard against losing unsaved form changes
 *
 * Provides a confirmation dialog when trying to close/navigate away from a form
 * with unsaved changes. Automatically handles read-only and submitting states.
 *
 * @example
 * ```tsx
 * const { control, formState: { isDirty }, reset } = useForm();
 * const { handleClose, hasUnsavedChanges } = useUnsavedChanges({
 *   isDirty,
 *   onClose: () => navigate('/back'),
 *   reset,
 * });
 *
 * return (
 *   <Modal onClose={handleClose}>
 *     <form>...</form>
 *   </Modal>
 * );
 * ```
 */
export const useUnsavedChanges = ({
  isDirty,
  isSubmitting = false,
  isReadOnly = false,
  onClose,
  reset,
  confirmMessage = 'You have unsaved changes. Discard changes?',
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn => {
  const handleClose = useCallback(async () => {
    // Skip confirmation if read-only, submitting, or no unsaved changes
    if (isReadOnly || isSubmitting || !isDirty) {
      if (reset) reset();
      onClose();
      return;
    }

    // Show confirmation dialog
    const confirmed = await toastAdapter.confirm(confirmMessage, {
      intent: 'danger',
    });

    if (confirmed) {
      if (reset) reset();
      onClose();
    }
  }, [isDirty, isSubmitting, isReadOnly, onClose, reset, confirmMessage]);

  return {
    handleClose,
    hasUnsavedChanges: isDirty && !isReadOnly,
  };
};

export default useUnsavedChanges;
