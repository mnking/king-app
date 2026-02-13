import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent dark:bg-blue-600 dark:hover:bg-blue-700',
  secondary: 'bg-slate-600 hover:bg-slate-700 text-white border-transparent dark:bg-slate-600 dark:hover:bg-slate-700',
  outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border-slate-300 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent dark:bg-red-600 dark:hover:bg-red-700',
};

const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        {...props}
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg border
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
