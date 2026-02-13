/*
 * Temporary adapter to support gradual migration from window.alert/confirm to
 * the toast service. The adapter checks a build-time flag so that legacy flows
 * can fall back to native dialogs if required during rollout.
 */
import { toastService } from './toast.service';
import type { ToastConfirmOptions, ToastOptions } from './toast.types';

const TOAST_FLAG = import.meta.env.VITE_ENABLE_TOASTS;
const useToastFeature = TOAST_FLAG === undefined || TOAST_FLAG !== 'false';

function fallbackAlert(message: string) {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(message);
  }
}

function fallbackConfirm(message: string) {
  if (typeof window !== 'undefined' && window.confirm) {
    return window.confirm(message);
  }
  return false;
}

export const toastAdapter = {
  success(message: string, options?: ToastOptions) {
    if (useToastFeature) {
      return toastService.success(message, options);
    }
    fallbackAlert(message);
    return '';
  },
  error(message: string, options?: ToastOptions) {
    if (useToastFeature) {
      return toastService.error(message, options);
    }
    fallbackAlert(message);
    return '';
  },
  warning(message: string, options?: ToastOptions) {
    if (useToastFeature) {
      return toastService.warning(message, options);
    }
    fallbackAlert(message);
    return '';
  },
  info(message: string, options?: ToastOptions) {
    if (useToastFeature) {
      return toastService.info(message, options);
    }
    fallbackAlert(message);
    return '';
  },
  confirm(message: string, options?: ToastConfirmOptions) {
    if (useToastFeature) {
      return toastService.confirm(message, options);
    }
    return Promise.resolve(fallbackConfirm(String(message)));
  },
};

export type ToastAdapter = typeof toastAdapter;
