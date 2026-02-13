import React from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface StuffingHeaderProps {
  packingListLabel?: string | null;
  totalStuffed: number;
  onRefresh: () => void;
  refreshing?: boolean;
  error?: string | null;
}

export const StuffingHeader: React.FC<StuffingHeaderProps> = ({
  packingListLabel,
  totalStuffed,
  onRefresh,
  refreshing = false,
  error,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stuffing Step</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cargo package stuffing</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Packing list: <span className="font-medium text-slate-700 dark:text-slate-200">{packingListLabel ?? '—'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{totalStuffed} stuffed</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={refreshing}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
};

export default StuffingHeader;
