import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useFocusTrap } from '@/shared/hooks/useUtils';
import {
  toastVariantAria,
  toastVariantClassNames,
  toastVariantDurations,
} from '@/shared/components/ui/toast-variants';
import { formatToastFromTemplate } from '@/shared/utils/toast-helpers';
import { resolveToastTemplate } from './toast.messages';
import type {
  ToastConfirmOptions,
  ToastId,
  ToastIntent,
  ToastOptions,
  ToastPromiseMessages,
  ToastShowOptions,
  ToastTemplateParams,
} from './toast.types';

const DEFAULT_POSITION: ToastOptions['position'] = 'top-center';
const DEFAULT_DURATION = 4000;

function mergeClassNames(base?: string, next?: string) {
  if (base && next) {
    return `${base} ${next}`.trim();
  }
  return next || base || undefined;
}

type ConfirmToastContentProps = {
  open: boolean;
  message: ReactNode;
  description?: ReactNode;
  intent: 'primary' | 'danger';
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
const ConfirmToastContent = ({
  open,
  message,
  description,
  intent,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmToastContentProps) => {
  const focusTrapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement;

    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={focusTrapRef}
        className="pointer-events-auto w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <ConfirmDialog
          open={open}
          message={message}
          description={description}
          intent={intent}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </div>,
    document.body,
  );
};

class ToastService {
  private withDefaults(
    intent: ToastIntent,
    options?: ToastOptions,
  ): ToastOptions {
    const className = mergeClassNames(
      toastVariantClassNames[intent],
      options?.className,
    );

    return {
      duration: toastVariantDurations[intent] ?? DEFAULT_DURATION,
      position: options?.position ?? DEFAULT_POSITION,
      ariaLive: options?.ariaLive ?? toastVariantAria[intent] ?? 'polite',
      ...options,
      className,
    };
  }

  show(content: ReactNode, options?: ToastShowOptions): ToastId {
    const intent = options?.variant ?? 'info';
    return toast(content, this.withDefaults(intent, options));
  }

  success(message: ReactNode, options?: ToastOptions): ToastId {
    return toast.success(message, this.withDefaults('success', options));
  }

  error(message: ReactNode, options?: ToastOptions): ToastId {
    return toast.error(message, this.withDefaults('error', options));
  }

  info(message: ReactNode, options?: ToastOptions): ToastId {
    return toast(message, this.withDefaults('info', options));
  }

  warning(message: ReactNode, options?: ToastOptions): ToastId {
    return toast(message, this.withDefaults('warning', options));
  }

  loading(message: ReactNode, options?: ToastOptions): ToastId {
    return toast.loading(message, this.withDefaults('loading', options));
  }

  promise<T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: ToastOptions,
  ): Promise<T> {
    return toast.promise(promise, messages, this.withDefaults('info', options));
  }

  dismiss(toastId?: ToastId) {
    toast.dismiss(toastId);
  }

  dismissAll() {
    toast.dismiss();
  }

  custom(renderable: ReactNode, options?: ToastOptions): ToastId {
    return toast.custom(renderable, this.withDefaults('info', options));
  }

  confirm(message: ReactNode, options: ToastConfirmOptions = {}): Promise<boolean> {
    const {
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      description,
      intent = 'primary',
      autoCloseMs,
      ...toastOptions
    } = options;

    return new Promise((resolve) => {
      const variant: ToastIntent = intent === 'danger' ? 'warning' : 'info';
      const mergedOptions = this.withDefaults(variant, {
        ...toastOptions,
        duration:
          typeof autoCloseMs === 'number' && autoCloseMs > 0
            ? autoCloseMs
            : 30000,
        className: mergeClassNames(
          'toast-confirm-dialog',
          toastOptions.className,
        ),
        removeDelay: 200,
      });

      const toastId = toast.custom(
        (t) => (
          <ConfirmToastContent
            open={t.visible}
            message={message}
            description={description}
            intent={intent}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            onConfirm={() => {
              this.dismiss(t.id);
              resolve(true);
            }}
            onCancel={() => {
              this.dismiss(t.id);
              resolve(false);
            }}
          />
        ),
        mergedOptions,
      );

      if (typeof autoCloseMs === 'number' && autoCloseMs > 0) {
        setTimeout(() => {
          this.dismiss(toastId);
          resolve(false);
        }, autoCloseMs);
      }
    });
  }

  fromTemplate(params: ToastTemplateParams) {
    const template = resolveToastTemplate(params);
    const message = formatToastFromTemplate(template);
    const intent = template.variant ?? 'info';

    switch (intent) {
      case 'success':
        return this.success(message, { duration: template.duration });
      case 'error':
        return this.error(message, { duration: template.duration });
      case 'warning':
        return this.warning(message, { duration: template.duration });
      case 'loading':
        return this.loading(message, { duration: template.duration });
      default:
        return this.info(message, { duration: template.duration });
    }
  }
}

export const toastService = new ToastService();
