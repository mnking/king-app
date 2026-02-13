import React from 'react';
import { CalendarDays, Package, RefreshCw, FileText, CheckCircle2, Activity } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { workingStatusCopy } from '../../constants';
import type { CargoPackageCheckFlow } from '../../types';

interface HeaderProps {
  flow: CargoPackageCheckFlow | null;
  renderDate: Date;
  primaryPackingListId: string;
  packingListLabel?: string | null;
  headerHbl: string | null;
  totalChecked: number;
  onRefresh: () => void;
  refreshing: boolean;
  error: string | null;
}

const StatCompact: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-2 border-r border-slate-200 pr-4 last:border-0 dark:border-slate-800">
    <div className="text-slate-400 dark:text-slate-500">{icon}</div>
    <div className="flex flex-col leading-none">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  </div>
);

export const CargoPackageCheckHeader: React.FC<HeaderProps> = ({
  flow,
  renderDate,
  primaryPackingListId,
  packingListLabel,
  headerHbl,
  totalChecked,
  onRefresh,
  refreshing,
  error,
}) => {
  const packingListDisplay =
    packingListLabel !== undefined ? packingListLabel ?? '—' : primaryPackingListId;

  return (
  <header className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
    <div className="flex flex-wrap items-center justify-between gap-4">

      {/* Title & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-slate-50">
            {flow?.title ?? 'Cargo Package Store'}
          </h2>
        </div>
        {flow?.workingStatus && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {workingStatusCopy[flow.workingStatus] ?? flow.workingStatus}
            </span>
          </div>
        )}
      </div>

      {/* Stats - Horizontal Strip */}
      <div className="flex items-center gap-4 border-l border-slate-200 pl-4 dark:border-slate-800 hidden md:flex">
        <StatCompact
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          label="Date"
          value={renderDate.toLocaleDateString()}
        />
        <StatCompact
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Packing List"
          value={packingListDisplay}
        />
        {headerHbl && (
          <StatCompact
            icon={<Package className="h-3.5 w-3.5" />}
            label="HBL Ref"
            value={headerHbl}
          />
        )}
        <StatCompact
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Handed Over"
          value={totalChecked}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {error && (
          <span className="bg-red-50 px-2 py-0.5 font-mono text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="group relative overflow-hidden border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-semibold">Sync Data</span>
          </div>
        </Button>
      </div>
    </div>
  </header>
  );
};

export default CargoPackageCheckHeader;
