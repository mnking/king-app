import type { ContainerFieldValue } from '../schemas';
import type { Container, ContainerType, ApiResponse, PaginatedResponse } from '.';

/**
 * Imperative handle exposed by ContainerNumberPicker via ref.
 *
 * Allows parent components to trigger validation, resolution, or reset
 * programmatically without relying on user interactions.
 *
 * @example
 * ```typescript
 * const pickerRef = useRef<ContainerNumberPickerHandle>(null);
 *
 * // Validate without resolving
 * const isValid = pickerRef.current?.validate();
 *
 * // Trigger resolution manually
 * await pickerRef.current?.resolve();
 *
 * // Reset to initial state
 * pickerRef.current?.reset();
 * ```
 */
export interface ContainerNumberPickerHandle {
  /**
   * Validates the current container number (client-side only).
   * Checks ISO 6346 format and check digit but does not call the API.
   *
   * @returns true if valid, false otherwise
   */
  validate: () => boolean;

  /**
   * Triggers resolution of the current container number against the API.
   * If valid and found, populates id/typeCode. If not found, shows create button.
   *
   * @returns Promise that resolves when resolution is complete
   */
  resolve: () => Promise<void>;

  /**
   * Resets the component to its initial state.
   * Clears number, id, typeCode, errors, and UI state.
   */
  reset: () => void;

  /**
   * Programmatically focuses the container number input field.
   * Useful for UX flows that need to direct user attention to the input.
   */
  focus: () => void;
}

/**
 * Callback fired after a container is successfully resolved or created.
 *
 * @param value - The populated ContainerFieldValue
 * @param existed - true if container was found in DB, false if newly created
 * @param raw - The raw API response (optional)
 */
export type OnResolvedCallback = (params: {
  value: ContainerFieldValue;
  existed: boolean;
  raw?: Container;
}) => void;

/**
 * Hook injection interface for testing and decoupling.
 *
 * Allows parent components to inject custom hooks (e.g., for testing with mock data)
 * instead of using the default hooks from the services layer.
 */
export interface ContainerPickerHooks {
  /**
   * Hook for fetching container by number.
   * Should return { data?, error?, isFetching, status }.
   */
  useContainerByNumber?: (number: string, options?: { enabled: boolean }) => {
    data?: ApiResponse<Container>;
    error?: Error | null;
    isFetching: boolean;
    status: 'error' | 'success' | 'pending';
  };

  /**
   * Hook for fetching all container types.
   * Should return { data?, error?, isFetching }.
   */
  useContainerTypeList?: () => {
    data?: ApiResponse<PaginatedResponse<ContainerType>>;
    error?: Error | null;
    isFetching: boolean;
  };

  /**
   * Hook for creating a new container.
   * Should return { mutate, mutateAsync, isPending }.
   */
  useCreateContainer?: () => {
    mutate: (
      params: { number: string; containerTypeCode: string },
      options?: {
        onSuccess?: (data: ApiResponse<Container>) => void;
        onError?: (error: Error) => void;
      }
    ) => void;
    mutateAsync: (params: { number: string; containerTypeCode: string }) => Promise<ApiResponse<Container>>;
    isPending: boolean;
  };
}

/**
 * Props for the ContainerNumberPicker component.
 */
export interface ContainerNumberPickerProps {
  // === Form Integration ===
  /**
   * Form field name when used with React Hook Form Controller.
   * @default "container"
   */
  name?: string;

  /**
   * Controlled value (use when not using RHF).
   */
  value?: ContainerFieldValue;

  /**
   * Change handler (use when not using RHF).
   */
  onChange?: (value: ContainerFieldValue) => void;

  /**
   * Callback fired after container is resolved (found) or created.
   */
  onResolved?: OnResolvedCallback;

  /**
   * External error message (e.g., from RHF fieldState.error).
   */
  error?: string;

  // === Behavior ===
  /**
   * Whether to allow creating new containers when not found.
   * @default true
   */
  allowCreateWhenNotFound?: boolean;

  /**
   * Whether to trigger resolution on blur.
   * @default true
   */
  resolveOnBlur?: boolean;

  /**
   * Debounce delay in milliseconds for validation while typing.
   * @default 0 (only validate on blur)
   */
  debounceMs?: boolean;

  /**
   * Disabled state.
   * @default false
   */
  disabled?: boolean;

  /**
   * Required field indicator.
   * @default false
   */
  required?: boolean;

  /**
   * Auto-focus the input on mount.
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Placeholder text.
   * @default "Enter container number"
   */
  placeholder?: string;

  // === UI Customization ===
  /**
   * Custom class name for the container wrapper.
   */
  className?: string;

  /**
   * Custom class name for the number input field.
   */
  inputClassName?: string;

  /**
   * Custom class name for the readonly type display box.
   */
  typeBoxClassName?: string;

  /**
   * Hide the type display box.
   * @default false
   */
  hideTypeBox?: boolean;

  /**
   * Label text for the container number input.
   * @default "Container Number"
   */
  label?: string;

  /**
   * Label text for the container type display.
   * @default "Container Type"
   */
  typeLabel?: string;
}
