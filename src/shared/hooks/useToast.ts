import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  toastService,
  type ToastConfirmOptions,
  type ToastOptions,
  type ToastPromiseMessages,
  type ToastTemplateParams,
  type ToastMessageTemplate,
} from '@/shared/services/toast';

export interface ToastHook {
  show(content: ReactNode, options?: ToastOptions): string;
  success(message: ReactNode, options?: ToastOptions): string;
  error(message: ReactNode, options?: ToastOptions): string;
  info(message: ReactNode, options?: ToastOptions): string;
  warning(message: ReactNode, options?: ToastOptions): string;
  loading(message: ReactNode, options?: ToastOptions): string;
  promise<T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: ToastOptions,
  ): Promise<T>;
  confirm(message: ReactNode, options?: ToastConfirmOptions): Promise<boolean>;
  fromTemplate(params: ToastTemplateParams): string;
  dismiss(toastId?: string): void;
  dismissAll(): void;
  service: typeof toastService;
}

export function useToast(): ToastHook {
  return useMemo<ToastHook>(() => ({
    show: (content, options) => toastService.show(content, options),
    success: (message, options) => toastService.success(message, options),
    error: (message, options) => toastService.error(message, options),
    info: (message, options) => toastService.info(message, options),
    warning: (message, options) => toastService.warning(message, options),
    loading: (message, options) => toastService.loading(message, options),
    promise: (promise, messages, options) =>
      toastService.promise(promise, messages, options),
    confirm: (message, options) => toastService.confirm(message, options),
    fromTemplate: (params) => toastService.fromTemplate(params),
    dismiss: (toastId) => toastService.dismiss(toastId),
    dismissAll: () => toastService.dismissAll(),
    service: toastService,
  }), []);
}

export type {
  ToastOptions,
  ToastConfirmOptions,
  ToastPromiseMessages,
  ToastTemplateParams,
  ToastMessageTemplate,
};
