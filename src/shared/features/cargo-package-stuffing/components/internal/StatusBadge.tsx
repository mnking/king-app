import React from 'react';

type StatusTone = 'neutral' | 'amber' | 'red' | 'green';

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
  red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'neutral' }) => {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClasses[tone]}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
