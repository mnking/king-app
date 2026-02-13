import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle } from 'lucide-react';

type Props = { active: boolean; label: string };

export const StatusPill: React.FC<Props> = ({ active, label }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:ring-emerald-800'
          : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
      )}
    >
      {active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
};

export default StatusPill;
