import { Fragment } from 'react';
import toast, { ToastBar, Toaster } from 'react-hot-toast';
import { X } from 'lucide-react';

import {
  inferToastIntent,
  toastVariantClassNames,
  toastVariantIcons,
} from './toast-variants';

export function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={12}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
        },
        ariaProps: {
          role: 'alert',
          'aria-live': 'polite',
        },
      }}
    >
      {(t) => {
        if (t.type === 'custom' && t.className?.includes('toast-confirm-dialog')) {
          return <>{t.message}</>;
        }

        const intent = inferToastIntent(t.className);
        const variantClasses = toastVariantClassNames[intent];
        const className = t.className ? `${t.className}` : variantClasses;

        return (
          <ToastBar toast={t}>
            {({ message }) => (
              <div className={className}>
                <div className="flex flex-row w-full items-center gap-3 p-3">
                    <span aria-hidden="true">
                      {toastVariantIcons[intent] ?? <Fragment />}
                    </span>

                    <div className="flex-1 text-sm leading-5">{message}</div>

                    <button
                      type="button"
                      className="ml-2 rounded-md p-2 text-slate-700 transition hover:bg-blue-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-700/50 dark:hover:text-slate-50"
                      onClick={() => toast.dismiss(t.id)}
                      aria-label="Dismiss notification"
                    >
                      <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                </div>
              </div>
            )}
          </ToastBar>
        );
      }}
    </Toaster>
  );
}

export default ToastContainer;
