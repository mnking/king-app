import React from 'react';
import {
  Activity,
  CheckCircle2,
  FileText,
  Package,
  PackagePlus,
  RefreshCw,
  Ship,
} from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface CargoPackageSelectionHeaderProps {
  plNumber: string;
  hblNumber?: string | null;
  workingStatus?: string | null;
  containerNumber?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  forwarderName?: string | null;
  totalPicked: number;
  selectedCount: number;
  availableCount: number;
  onPick: () => void;
  pickDisabled: boolean;
  pickLoading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  error?: string | null;
  note?: string | null;
}

const StatCompact: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-2 border-r border-slate-200 pr-4 last:border-0 dark:border-slate-800">
    <div className="text-slate-400 dark:text-slate-500">{icon}</div>
    <div className="flex flex-col leading-none">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">{value}</span>
    </div>
  </div>
);

export const CargoPackageSelectionHeader: React.FC<CargoPackageSelectionHeaderProps> = ({
  plNumber,
  hblNumber,
  workingStatus,
  containerNumber,
  vessel,
  voyage,
  forwarderName,
  totalPicked,
  selectedCount,
  availableCount,
  onPick,
  pickDisabled,
  pickLoading,
  onRefresh,
  refreshing,
  error,
  note,
}) => (
  <header className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-slate-50">
              Cargo Package Selection
            </h2>
            {workingStatus && (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {workingStatus}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select available packages and pick them into the transaction.
          </p>
        </div>
      </div>

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

    <div className="mt-3 flex flex-wrap item-center justify-between gap-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
      <StatCompact icon={<FileText className="h-3.5 w-3.5" />} label="PL" value={plNumber || '—'} />
      <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="HBL" value={hblNumber ?? '—'} />
      <StatCompact icon={<Ship className="h-3.5 w-3.5" />} label="Container" value={containerNumber ?? '—'} />
      <StatCompact icon={<Ship className="h-3.5 w-3.5" />} label="Vessel/Voyage" value={vessel ? `${vessel}${voyage ? ` • ${voyage}` : ''}` : voyage ?? '—'} />
      <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="Forwarder" value={forwarderName ?? '—'} />
      <StatCompact icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Picked" value={totalPicked} />
      <StatCompact icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Selected" value={`${selectedCount}/${availableCount || '—'}`} />

      <Button
        variant="primary"
        size="sm"
        loading={pickLoading}
        disabled={pickDisabled}
        onClick={onPick}
        className="gap-2 font-semibold"
      >
        <PackagePlus className="h-4 w-4" />
        <span>Pick</span>
      </Button>
    </div>

    {note ? (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">Note</span>
        <p className="mt-1">{note}</p>
      </div>
    ) : null}
  </header>
);

export default CargoPackageSelectionHeader;
