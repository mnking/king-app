/**
 * Auth Error Handler
 *
 * Provides standardized error handling for authentication operations.
 * Toast notifications should be handled by consuming components using the useToast hook.
 *
 * Example usage:
 * ```typescript
 * import { getAuthErrorForToast } from './authErrorHandler';
 * import { useToast } from '@/shared/hooks/useToast';
 *
 * const toast = useToast();
 *
 * // In error handler:
 * const errorInfo = getAuthErrorForToast(error);
 * toast.error(errorInfo.title, errorInfo.message);
 * ```
 */

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

export const isAuthError = (error: unknown): error is AuthError => {
  return (
    error && typeof error.code === 'string' && typeof error.message === 'string'
  );
};

export const handleAuthError = (error: unknown): AuthError => {
  // If it's already an AuthError, return it
  if (isAuthError(error)) {
    return error;
  }

  // Handle common auth error patterns
  if (error?.code === 'INVALID_CREDENTIALS') {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    };
  }

  if (error?.code === 'USER_NOT_FOUND') {
    return {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    };
  }

  if (error?.code === 'EMAIL_ALREADY_EXISTS') {
    return {
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists',
    };
  }

  if (error?.code === 'WEAK_PASSWORD') {
    return {
      code: 'WEAK_PASSWORD',
      message: 'Password is too weak. Please choose a stronger password.',
    };
  }

  if (error?.code === 'UNAUTHORIZED') {
    return {
      code: 'UNAUTHORIZED',
      message: 'You are not authorized to perform this action',
    };
  }

  if (error?.code === 'SESSION_EXPIRED') {
    return {
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please sign in again.',
    };
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and try again.',
    };
  }

  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.code === 'TIMEOUT') {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out. Please try again.',
    };
  }

  // Generic error fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'An unexpected error occurred',
    details: error,
  };
};

// Helper to get error info for toast display
export const getAuthErrorForToast = (error: unknown) => {
  const authError = handleAuthError(error);
  return {
    title: 'Authentication Error',
    message: authError.message,
    error: authError,
  };
};

export const getAuthErrorMessage = (error: unknown): string => {
  const authError = handleAuthError(error);
  return authError.message;
};
