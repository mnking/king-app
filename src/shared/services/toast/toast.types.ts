import type { CSSProperties, ReactNode } from 'react';
import type {
  DefaultToastOptions,
  ToastOptions as HotToastOptions,
  ToastPosition,
  ToastType,
  ValueOrFunction,
} from 'react-hot-toast';

export type ToastId = string;

export type ToastIntent = Extract<ToastType, 'success' | 'error' | 'loading'> | 'info' | 'warning';

export interface ToastOptions
  extends Omit<HotToastOptions, 'style' | 'className' | 'iconTheme'> {
  ariaLive?: 'off' | 'polite' | 'assertive';
  className?: string;
  icon?: ReactNode;
  iconTheme?: DefaultToastOptions['iconTheme'];
  style?: CSSProperties;
}

export interface ToastPromiseMessages<T = unknown> {
  loading: ReactNode;
  success: ReactNode | ValueOrFunction<T>;
  error: ReactNode | ValueOrFunction<unknown>;
}

export interface ToastConfirmOptions extends ToastOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'primary' | 'danger';
  description?: ReactNode;
  autoCloseMs?: number | null;
}

export interface ToastMessageTemplate {
  title: string;
  description?: string;
  variant?: ToastIntent;
  duration?: number;
}

export type ToastMessageDictionary = Record<
  string,
  Record<string, ToastMessageTemplate>
>;

export type ToastShowOptions = ToastOptions & {
  title?: string;
  description?: string;
  variant?: ToastIntent;
};

export type ToastPromiseOptions = ToastOptions & {
  messages: ToastPromiseMessages;
};

export type ToastTemplateKey<
  TDictionary extends ToastMessageDictionary,
  TCategory extends keyof TDictionary,
> = keyof TDictionary[TCategory] & string;

export interface ToastShowParams {
  message: string;
  options?: ToastOptions;
}

export interface ToastTemplateParams<TCategory extends string = string> {
  category: TCategory;
  template: string;
  overrides?: Partial<ToastMessageTemplate>;
  fallback?: ToastMessageTemplate;
}

export type ToastPositionOption = ToastPosition;
