import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label?: string;
  error?: FieldError | string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  hint,
  children,
  className = '',
  htmlFor,
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          htmlFor={htmlFor}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {!errorMessage && hint && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {errorMessage && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default FormField;
