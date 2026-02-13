import React from 'react';

import { Button } from '@/shared/components/ui';

import { cargoStatusOptions, customsStatusOptions } from '../../helpers/status-options';
import type { CargoPackageStuffingItem, CargoStatus, CustomsStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface StuffingQueueProps {
  packages: CargoPackageStuffingItem[];
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

export const StuffingQueue: React.FC<StuffingQueueProps> = ({
  packages,
  readOnly = false,
  onSave,
}) => {
  if (packages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No packages waiting to be stuffed.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {packages.map((pkg) => {
        const cargoLabel = pkg.cargoStatus
          ? cargoStatusOptions.find(opt => opt.value === pkg.cargoStatus)?.label ?? pkg.cargoStatus
          : '—';
        const customsLabel = pkg.customsStatus
          ? customsStatusOptions.find(opt => opt.value === pkg.customsStatus)?.label ?? pkg.customsStatus
          : '—';

        return (
          <div
            key={pkg.id}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 dark:border-slate-700">Line {pkg.lineNo ?? '—'}</span>
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 dark:border-slate-700">Pkg {pkg.packageNo ?? '—'}</span>
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 dark:border-slate-700">Type {pkg.packageType}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {pkg.cargoDescription}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Cargo: {pkg.cargoType ?? '—'} · Unit: {pkg.cargoUnit ?? '—'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    label={cargoLabel}
                    tone={pkg.cargoStatus ? cargoStatusTone[pkg.cargoStatus] : 'neutral'}
                  />
                  <StatusBadge
                    label={customsLabel}
                    tone={pkg.customsStatus ? customsStatusTone[pkg.customsStatus] : 'neutral'}
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => onSave(pkg.id)}
                >
                  Stuff
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StuffingQueue;
