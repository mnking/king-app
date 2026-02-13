import React from 'react';

type BadgeTone = 'neutral' | 'amber' | 'red' | 'green';

export const StatusBadge: React.FC<{ label: string; tone: BadgeTone }> = ({ label, tone }) => {
  const styles = {
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-400/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm ring-1 ring-inset ${styles[tone]}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
