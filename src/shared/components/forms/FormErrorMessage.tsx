import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormErrorMessageProps {
  error?: FieldError | string;
  className?: string;
}

export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({
  error,
  className = '',
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  if (!errorMessage) {
    return null;
  }

  return (
    <p className={`text-sm text-red-600 dark:text-red-400 ${className}`}>
      {errorMessage}
    </p>
  );
};

export default FormErrorMessage;
