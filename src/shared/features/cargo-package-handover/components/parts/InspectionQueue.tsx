import React from 'react';
import { Box, Layers, CheckCircle2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { cargoStatusOptions, customsStatusOptions } from '../../constants';
import type { CargoPackageCheckItem, CargoStatus, CustomsStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface InspectionQueueProps {
  packages: CargoPackageCheckItem[];
  selectedPackageIds: Set<string>;
  onTogglePackage: (pkgId: string, checked: boolean) => void;
  readOnly?: boolean;
  onSave: (pkgId: string) => void;
}

const cargoStatusTone: Record<CargoStatus, 'neutral' | 'amber' | 'red' | 'green'> = {
  NORMAL: 'green',
  PACKAGE_DAMAGED: 'amber',
  CARGO_DAMAGED: 'red',
};

const customsStatusTone: Record<CustomsStatus, 'neutral' | 'amber' | 'green'> = {
  UNINSPECTED: 'neutral',
  PASSED: 'green',
  ON_HOLD: 'amber',
};

export const InspectionQueue: React.FC<InspectionQueueProps> = ({
  packages,
  selectedPackageIds,
  onTogglePackage,
  readOnly = false,
  onSave,
}) => {
  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">ALL CLEAR</h3>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {packages.map((pkg) => {
        const isSelected = selectedPackageIds.has(pkg.id);
        const cargoLabel = pkg.cargoStatus
          ? cargoStatusOptions.find(opt => opt.value === pkg.cargoStatus)?.label ?? pkg.cargoStatus
          : '-';
        const customsLabel = pkg.customsStatus
          ? customsStatusOptions.find(opt => opt.value === pkg.customsStatus)?.label ?? pkg.customsStatus
          : '-';

        return (
          <div
            key={pkg.id}
            className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors hover:border-blue-400/50 hover:bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:bg-slate-800/20"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="mr-1 flex items-center gap-1.5">
                    <input
                      id={`handover-select-${pkg.id}`}
                      type="checkbox"
                      checked={isSelected}
                      disabled={readOnly}
                      onChange={(event) => onTogglePackage(pkg.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
                      aria-label={`Select package ${pkg.packageNo ?? pkg.id} for bulk handover`}
                    />
                    <label
                      htmlFor={`handover-select-${pkg.id}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
                    >
                      Select
                    </label>
                  </div>
                  <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-400/20">
                    <Layers className="h-3 w-3" />
                    Line {pkg.lineNo ?? '—'}
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20">
                    <Box className="h-3 w-3" />
                    Pkg {pkg.packageNo ?? '—'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-600 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-400/20">
                    Type <span className="text-slate-900 dark:text-slate-100">{pkg.packageType}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-600 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-400/20">
                    Unit <span className="text-slate-900 dark:text-slate-100">{pkg.cargoUnit ?? '—'}</span>
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                  {pkg.cargoDescription}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  Cargo: {pkg.cargoType ?? '—'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Cond
                  </span>
                  <StatusBadge
                    label={cargoLabel}
                    tone={pkg.cargoStatus ? cargoStatusTone[pkg.cargoStatus] : 'neutral'}
                  />
                  <span className="ml-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Customs
                  </span>
                  <StatusBadge
                    label={customsLabel}
                    tone={pkg.customsStatus ? customsStatusTone[pkg.customsStatus] : 'neutral'}
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSave(pkg.id)}
                  disabled={readOnly}
                  className="gap-2 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Handover</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InspectionQueue;
