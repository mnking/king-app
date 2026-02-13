import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';

import type { ToastIntent } from '@/shared/services/toast';

export const toastBaseClassName = `
  pointer-events-auto flex w-full max-w-sm items-start !p-0 rounded-lg
  border border-solid shadow-lg bg-white/90 text-slate-900
  dark:bg-slate-900/90 dark:text-slate-100
`.replace(/\s+/g, ' ').trim();

const variantTokens: Record<ToastIntent, string> = {
  success: 'toast-variant-success',
  error: 'toast-variant-error',
  info: 'toast-variant-info',
  warning: 'toast-variant-warning',
  loading: 'toast-variant-loading',
};

export const toastVariantClassNames: Record<ToastIntent, string> = {
  success: `${variantTokens.success} ${toastBaseClassName} border-emerald-300/60 bg-emerald-500/10`,
  error: `${variantTokens.error} ${toastBaseClassName} border-rose-300/70 bg-rose-500/10`,
  info: `${variantTokens.info} ${toastBaseClassName} border-sky-300/60 bg-sky-500/10`,
  warning: `${variantTokens.warning} ${toastBaseClassName} border-amber-300/60 bg-amber-500/15`,
  loading: `${variantTokens.loading} ${toastBaseClassName} border-slate-300/60 bg-slate-500/10`,
};

export const toastVariantDurations: Record<ToastIntent, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
  warning: 5000,
  loading: 10000,
};

export const toastVariantAria: Record<ToastIntent, 'polite' | 'assertive'> = {
  success: 'polite',
  error: 'assertive',
  info: 'polite',
  warning: 'assertive',
  loading: 'polite',
};

export const toastVariantIcons: Record<ToastIntent, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />,
  error: <AlertTriangle className="h-5 w-5 text-rose-500" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-sky-500" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />,
  loading: <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />,
};

export function inferToastIntent(className?: string | null): ToastIntent {
  if (!className) return 'info';

  return (Object.entries(variantTokens).find(([_, token]) =>
    className.includes(token),
  )?.[0] ?? 'info') as ToastIntent;
}

export function appendToastClassName(
  intent: ToastIntent,
  className?: string,
): string {
  const variantClass = toastVariantClassNames[intent];
  if (!className) return variantClass;
  return `${variantClass} ${className}`.trim();
}
