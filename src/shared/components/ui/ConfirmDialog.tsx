import { useId, type ReactNode } from 'react';

import { Button } from './Button';

type ConfirmIntent = 'primary' | 'danger';

export interface ConfirmDialogProps {
  open?: boolean;
  message: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open = true,
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  intent = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={open ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      tabIndex={-1}
      className="w-full rounded-xl border border-slate-200 bg-white p-6 text-left shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
    >
      <div className="flex flex-col gap-4">
        <div
          id={titleId}
          className="text-base font-semibold text-slate-900 dark:text-slate-50"
        >
          {message}
        </div>
        {description ? (
          <p
            id={descriptionId}
            className="text-sm text-slate-600 dark:text-slate-300"
          >
            {description}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            aria-label={typeof cancelLabel === 'string' ? cancelLabel : undefined}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={intent === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            aria-label={typeof confirmLabel === 'string' ? confirmLabel : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
