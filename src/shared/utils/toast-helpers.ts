import type { ToastPromiseMessages, ToastMessageTemplate } from '@/shared/services/toast/toast.types';

type ErrorLike = { message?: string } | string | null | undefined;

export function ensureErrorMessage(
  error: ErrorLike,
  fallback = 'An unexpected error occurred',
): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'object' && 'message' in error && error.message) {
    return String(error.message);
  }

  return fallback;
}

export function formatToastFromTemplate(template: ToastMessageTemplate): string {
  if (!template.description) {
    return template.title;
  }

  return `${template.title}: ${template.description}`;
}

export function createPromiseMessages(
  template: ToastPromiseMessages,
): ToastPromiseMessages {
  return {
    loading: template.loading,
    success: template.success,
    error: template.error,
  };
}
