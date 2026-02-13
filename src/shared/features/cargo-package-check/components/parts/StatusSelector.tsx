import React from 'react';
import { CargoStatus, CustomsStatus } from '../../types';

interface StatusSelectorProps {
  title: string;
  name: string;
  options: Array<{ value: CargoStatus | CustomsStatus; label: string; helper?: string }>;
  value: CargoStatus | CustomsStatus | null | undefined;
  onChange: (value: CargoStatus | CustomsStatus) => void;
  disabled?: boolean;
  variantMap?: Record<string, 'neutral' | 'green' | 'amber' | 'red'>;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  title,
  options,
  value,
  onChange,
  disabled = false,
  variantMap = {},
}) => {
  const styles = {
    neutral: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-900/50',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/50',
    red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-900/50',
  };

  const hoverStyles = {
    neutral: 'hover:bg-slate-50',
    green: 'hover:bg-emerald-50/50',
    amber: 'hover:bg-amber-50/50',
    red: 'hover:bg-rose-50/50',
  };

  return (
    <div className="flex-1 space-y-2">
      {title && (
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {options.map(option => {
          const isSelected = value === option.value;
          const variant = variantMap[option.value] || 'neutral';

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2 text-center transition-all
                disabled:cursor-not-allowed disabled:opacity-50
                ${isSelected
                  ? `${styles[variant]} ring-2 border-transparent shadow-sm scale-[1.02] font-bold`
                  : `bg-white border-slate-200 text-slate-500 hover:border-slate-300 ${hoverStyles[variant]} dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800`
                }
              `}
              title={option.helper}
            >
              {isSelected && (
                <div className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${variant === 'green' ? 'bg-emerald-500' :
                  variant === 'amber' ? 'bg-amber-500' :
                    variant === 'red' ? 'bg-rose-500' : 'bg-slate-400'
                  }`} />
              )}
              <span className="text-[10px] leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StatusSelector;
