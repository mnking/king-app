import React from 'react';
import { Clock } from 'lucide-react';
import type { ExecutionSummary } from '../helpers/plan-execution-helpers';

interface ProgressCardProps {
  summary: ExecutionSummary | null;
  progressedCount: number;
  progressPercent: number;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  summary,
  progressedCount,
  progressPercent,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
        Progress
      </div>
      <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-100">
          {summary
            ? `${progressedCount} / ${summary.total} containers`
            : '0 / 0 containers'}
        </p>
        <div className="mt-2 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-200">
          Waiting: {summary?.waiting ?? 0} • Deferred: {summary?.deferred ?? 0} • Received: {summary?.received ?? 0} • Rejected: {summary?.rejected ?? 0}
        </p>
      </div>
    </div>
  );
};
