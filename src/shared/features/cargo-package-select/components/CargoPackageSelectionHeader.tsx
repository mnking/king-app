import React from 'react';
import {
  FileText,
  Package,
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
  totalPicked: number;
  selectedCount: number;
  availableCount: number;
  onRefresh: () => void;
  refreshing: boolean;
  error?: string | null;
  note?: string | null;
  showMetaRow?: boolean;
}

const MetaField: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span>{label}</span>
    </div>
    <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
      {value}
    </p>
  </div>
);

const SummaryPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
  </div>
);

export const CargoPackageSelectionHeader: React.FC<CargoPackageSelectionHeaderProps> = ({
  plNumber,
  hblNumber,
  workingStatus,
  containerNumber,
  vessel,
  voyage,
  totalPicked,
  selectedCount,
  availableCount,
  onRefresh,
  refreshing,
  error,
  note,
  showMetaRow = false,
}) => (
  <header className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
    {showMetaRow ? (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MetaField
            icon={<Ship className="h-3.5 w-3.5" />}
            label="Container"
            value={containerNumber ?? '—'}
          />
          <MetaField
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PL"
            value={plNumber || '—'}
          />
          <MetaField
            icon={<Package className="h-3.5 w-3.5" />}
            label="HBL"
            value={hblNumber ?? '—'}
          />
          <MetaField
            icon={<Ship className="h-3.5 w-3.5" />}
            label="Vessel"
            value={vessel ?? '—'}
          />
          <MetaField
            icon={<Ship className="h-3.5 w-3.5" />}
            label="Voyage"
            value={voyage ?? '—'}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {workingStatus && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {workingStatus}
              </span>
            </div>
          )}

          {error && (
            <span className="rounded border border-red-200 bg-red-50 px-2 py-1 font-mono text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </span>
          )}
        </div>
      </div>
    ) : null}

    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        showMetaRow ? 'mt-3 border-t border-slate-200 pt-3 dark:border-slate-800' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SummaryPill label="Picked" value={totalPicked} />
        <SummaryPill
          label="Selected"
          value={`${selectedCount}/${availableCount || '—'}`}
        />
      </div>

      <div className="flex items-center">
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

    {note ? (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">Note</span>
        <p className="mt-1">{note}</p>
      </div>
    ) : null}
  </header>
);

export default CargoPackageSelectionHeader;
