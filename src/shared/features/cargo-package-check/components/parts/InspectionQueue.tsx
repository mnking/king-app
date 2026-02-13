import React from 'react';
import { Box, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { cargoStatusOptions, customsStatusOptions } from '../../constants';
import type { CargoPackageCheckItem, CargoStatus, CustomsStatus, StatusSelection } from '../../types';
import { StatusSelector } from './StatusSelector';

interface InspectionQueueProps {
  packages: CargoPackageCheckItem[];
  selections: Record<string, StatusSelection>;
  onStatusChange: (pkgId: string, field: keyof StatusSelection, value: CargoStatus | CustomsStatus) => void;
  selectedPackageIds: Set<string>;
  onTogglePackage: (pkgId: string, checked: boolean) => void;
  readOnly?: boolean;
  onSave: (pkgId: string) => void;
}

export const InspectionQueue: React.FC<InspectionQueueProps> = ({
  packages,
  selections,
  onStatusChange,
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
    <div className="space-y-4">
      {packages.map((pkg) => {
        const selection = selections[pkg.id] ?? { cargoStatus: null, customsStatus: null };
        const canSave = Boolean(selection.cargoStatus && selection.customsStatus);
        const isSelected = selectedPackageIds.has(pkg.id);

        return (
          <div
            key={pkg.id}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-400/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30"
          >
            {/* Row 1: Package Information - Prominent & Clear */}
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    id={`inspect-select-${pkg.id}`}
                    type="checkbox"
                    checked={isSelected}
                    disabled={readOnly}
                    onChange={(event) => onTogglePackage(pkg.id, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
                    aria-label={`Select package ${pkg.packageNo ?? pkg.id} for bulk inspect`}
                  />
                  <label
                    htmlFor={`inspect-select-${pkg.id}`}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Select
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-400/20">
                    <Layers className="h-3.5 w-3.5" />
                    LINE {typeof pkg.lineNo === 'number' ? pkg.lineNo : '—'}
                  </span>
                  {pkg.packageNo && (
                    <span className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20">
                      <Box className="h-3.5 w-3.5" />
                      PKG {pkg.packageNo}
                    </span>
                  )}
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 dark:bg-slate-800/50">
                  TYPE: <strong className="text-slate-700 dark:text-slate-200">{pkg.packageType}</strong>
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 dark:bg-slate-800/50">
                  UNIT: <strong className="text-slate-700 dark:text-slate-200">{pkg.cargoUnit ?? '—'}</strong>
                </span>
              </div>
            </div>

            {/* Row 2: Description + Confirm */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-1">
                <h4 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {pkg.cargoDescription}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pkg.cargoType ?? '—'} · Unit: {pkg.cargoUnit ?? '—'} · Type: {pkg.packageType}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSave(pkg.id)}
                disabled={readOnly || !canSave}
                className="gap-2 font-semibold"
              >
                {canSave ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                <span>Confirm</span>
              </Button>
            </div>

            {/* Row 3: Status Controls */}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <StatusSelector
                title="Cargo Condition"
                name={`cargo-${pkg.id}`}
                options={cargoStatusOptions}
                value={selection.cargoStatus}
                onChange={(value) => onStatusChange(pkg.id, 'cargoStatus', value)}
                disabled={readOnly}
                variantMap={{
                  NORMAL: 'green',
                  PACKAGE_DAMAGED: 'amber',
                  CARGO_DAMAGED: 'red',
                }}
              />
              <StatusSelector
                title="Customs Status"
                name={`customs-${pkg.id}`}
                options={customsStatusOptions}
                value={selection.customsStatus}
                onChange={(value) => onStatusChange(pkg.id, 'customsStatus', value)}
                disabled={readOnly}
                variantMap={{
                  PASSED: 'green',
                  ON_HOLD: 'amber',
                  UNINSPECTED: 'neutral',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InspectionQueue;
