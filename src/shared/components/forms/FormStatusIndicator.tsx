import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Pause,
  Play,
  Circle,
} from 'lucide-react';
import { FormField } from './FormField';

interface StatusOption {
  value: string;
  label: string;
  description?: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo';
  icon?: 'check' | 'clock' | 'alert' | 'x' | 'pause' | 'play' | 'circle';
}

interface FormStatusIndicatorProps<T extends FieldValues>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  className?: string;
  options: StatusOption[];
  disabled?: boolean;
  allowClear?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_CLASSES = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-300 dark:border-green-600',
    selectedBg: 'bg-green-200 dark:bg-green-800/50',
    selectedBorder: 'border-green-500 dark:border-green-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-600',
    selectedBg: 'bg-blue-200 dark:bg-blue-800/50',
    selectedBorder: 'border-blue-500 dark:border-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-600',
    selectedBg: 'bg-yellow-200 dark:bg-yellow-800/50',
    selectedBorder: 'border-yellow-500 dark:border-yellow-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-600',
    selectedBg: 'bg-red-200 dark:bg-red-800/50',
    selectedBorder: 'border-red-500 dark:border-red-400',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
    selectedBg: 'bg-gray-200 dark:bg-gray-800/50',
    selectedBorder: 'border-gray-500 dark:border-gray-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600',
    selectedBg: 'bg-purple-200 dark:bg-purple-800/50',
    selectedBorder: 'border-purple-500 dark:border-purple-400',
  },
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-600',
    selectedBg: 'bg-indigo-200 dark:bg-indigo-800/50',
    selectedBorder: 'border-indigo-500 dark:border-indigo-400',
  },
};

const ICONS = {
  check: CheckCircle,
  clock: Clock,
  alert: AlertCircle,
  x: XCircle,
  pause: Pause,
  play: Play,
  circle: Circle,
};

const SIZE_CLASSES = {
  sm: {
    container: 'text-xs',
    item: 'px-2 py-1',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'text-sm',
    item: 'px-3 py-2',
    icon: 'h-4 w-4',
  },
  lg: {
    container: 'text-base',
    item: 'px-4 py-3',
    icon: 'h-5 w-5',
  },
};

export const FormStatusIndicator = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  className = '',
  options,
  disabled = false,
  allowClear = false,
  layout = 'horizontal',
  showDescription = false,
  size = 'md',
  ...divProps
}: FormStatusIndicatorProps<T>) => {
  const sizeClasses = SIZE_CLASSES[size];

  const getLayoutClasses = () => {
    switch (layout) {
      case 'vertical':
        return 'flex flex-col space-y-2';
      case 'grid':
        return 'grid grid-cols-2 gap-2';
      default:
        return 'flex flex-wrap gap-2';
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const handleStatusSelect = (value: string) => {
          if (field.value === value && allowClear) {
            field.onChange('');
          } else {
            field.onChange(value);
          }
        };

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div
              className={`${sizeClasses.container} ${getLayoutClasses()}`}
              {...divProps}
            >
              {options.map((option) => {
                const isSelected = field.value === option.value;
                const colorClasses = COLOR_CLASSES[option.color];
                const IconComponent = option.icon ? ICONS[option.icon] : Circle;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleStatusSelect(option.value)}
                    className={`
                      ${sizeClasses.item}
                      flex items-center space-x-2 rounded-lg border-2 transition-all
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                      ${
                        isSelected
                          ? `${colorClasses.selectedBg} ${colorClasses.selectedBorder} ${colorClasses.text} shadow-md`
                          : `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} hover:${colorClasses.selectedBg}`
                      }
                      ${layout === 'grid' ? 'w-full justify-center' : ''}
                    `}
                  >
                    <IconComponent
                      className={`${sizeClasses.icon} flex-shrink-0`}
                    />
                    <div
                      className={`${layout === 'grid' ? 'text-center' : 'text-left'} min-w-0`}
                    >
                      <div className="font-medium truncate">{option.label}</div>
                      {showDescription && option.description && (
                        <div className="text-xs opacity-75 truncate mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear all button for horizontal layout when allowClear is true */}
            {allowClear &&
              field.value &&
              layout === 'horizontal' &&
              !disabled && (
                <button
                  type="button"
                  onClick={() => field.onChange('')}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Clear selection
                </button>
              )}
          </FormField>
        );
      }}
    />
  );
};

export default FormStatusIndicator;
