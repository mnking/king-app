import React from 'react';

import type { StuffedLineGroup } from '../../helpers/groupStuffedByLine';
import { cargoStatusOptions, customsStatusOptions } from '../../helpers/status-options';
import type { CargoStatus, CustomsStatus } from '../../types';
import StatusBadge from './StatusBadge';

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

interface StuffedTableProps {
  groups: StuffedLineGroup[];
}

export const StuffedTable: React.FC<StuffedTableProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No stuffed packages yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
          <tr>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Line</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Package</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Description</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Cargo Type</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Cargo Unit</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Pkg Type</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Cargo Status</th>
            <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Customs Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {groups.map((group) => {
            const lineLabel = group.lineNo ?? '—';
            return (
              <React.Fragment key={`line-${lineLabel}`}>
                <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                  <td colSpan={8} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Line {lineLabel}
                  </td>
                </tr>
                {group.packages.map((pkg) => {
                  const cargoLabel = pkg.cargoStatus
                    ? cargoStatusOptions.find(opt => opt.value === pkg.cargoStatus)?.label ?? pkg.cargoStatus
                    : '—';
                  const customsLabel = pkg.customsStatus
                    ? customsStatusOptions.find(opt => opt.value === pkg.customsStatus)?.label ?? pkg.customsStatus
                    : '—';

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Line {lineLabel}</td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{pkg.packageNo ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{pkg.cargoDescription}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{pkg.cargoType ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{pkg.cargoUnit ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{pkg.packageType}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={cargoLabel}
                          tone={pkg.cargoStatus ? cargoStatusTone[pkg.cargoStatus] : 'neutral'}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={customsLabel}
                          tone={pkg.customsStatus ? customsStatusTone[pkg.customsStatus] : 'neutral'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StuffedTable;
