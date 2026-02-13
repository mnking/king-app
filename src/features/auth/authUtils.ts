import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { handleAuthError } from './authErrorHandler';

// Enhanced useQuery with auth error handling
// Note: Toast handling should be done by consuming components using useToast hook
export function useAuthQuery<T = unknown, TError = unknown>(
  options: UseQueryOptions<T, TError>,
) {
  return useQuery({
    ...options,
    onError: (error) => {
      // Let consuming components handle error display
      // They can use getAuthErrorForToast(error) with their useToast hook
      options.onError?.(error);
    },
  });
}

// Enhanced useMutation with auth error handling
// Note: Toast handling should be done by consuming components using useToast hook
export function useAuthMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  return useMutation({
    ...options,
    onError: (error, variables, context) => {
      // Let consuming components handle error display
      // They can use getAuthErrorForToast(error) with their useToast hook
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Let consuming components handle success display
      options.onSuccess?.(data, variables, context);
    },
  });
}

// Helper for creating auth-specific query keys
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
  preferences: (userId: string) =>
    [...authKeys.all, 'preferences', userId] as const,
  permissions: (userId: string) =>
    [...authKeys.all, 'permissions', userId] as const,
};

// Helper for auth data normalization
export const normalizeAuthResponse = <T>(response: {
  data: T | null;
  error: Error | null;
}) => {
  if (response.error) {
    throw handleAuthError(response.error);
  }
  return response.data;
};

// Helper for checking if error requires re-authentication
export const requiresReauth = (error: unknown): boolean => {
  const authError = handleAuthError(error);
  return (
    authError.code === 'SESSION_EXPIRED' || authError.code === 'UNAUTHORIZED'
  );
};
