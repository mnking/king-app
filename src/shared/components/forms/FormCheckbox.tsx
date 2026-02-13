import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';

interface FormCheckboxProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  helpText?: string;
  className?: string;
}

export const FormCheckbox = <T extends FieldValues>({
  name,
  control,
  label,
  helpText,
  className = '',
  ...inputProps
}: FormCheckboxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        return (
          <div className={`flex items-start ${className}`}>
            <div className="flex items-center h-5">
              <input
                {...inputProps}
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                ref={field.ref}
                className={`
                  w-4 h-4 rounded
                  border-gray-300 dark:border-gray-600
                  text-blue-600 dark:text-blue-500
                  focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    error
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
              />
            </div>
            {(label || helpText) && (
              <div className="ml-3 text-sm">
                {label && (
                  <label
                    htmlFor={field.name}
                    className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {label}
                  </label>
                )}
                {helpText && (
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    {helpText}
                  </p>
                )}
                {error && (
                  <p className="text-red-600 dark:text-red-400 mt-1">
                    {error.message}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

export default FormCheckbox;
