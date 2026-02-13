import React from 'react';
import { Layers } from 'lucide-react';

import { cargoStatusOptions, customsStatusOptions } from '../../constants';
import type { CheckedLineGroup } from '../../utils';
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

interface CompletedTableProps {
  groups: CheckedLineGroup[];
}

export const CompletedTable: React.FC<CompletedTableProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
        <p className="font-mono text-xs uppercase tracking-wide text-slate-500">No Data</p>
      </div>
    );
  }

  let order = 1;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">#</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Line</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Pkg</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Description</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Type</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Condition</th>
              <th className="px-3 py-2 text-left font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Customs</th>
              <th className="px-3 py-2 text-right font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {groups.map(group => {
              return (
                <React.Fragment key={`line-${group.lineNo}`}>
                  {/* Compact Group Header */}
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                    <td colSpan={8} className="px-3 py-1.5">
                      <span className="flex w-fit items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Layers className="h-3 w-3" />
                        Line {group.lineNo ?? '—'}
                      </span>
                    </td>
                  </tr>

                  {group.packages.map((pkg) => (
                    <tr key={pkg.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-slate-500">{order++}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">Line {group.lineNo ?? '—'}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">{pkg.packageNo ?? '—'}</td>
                      <td className="min-w-[200px] max-w-[400px] px-3 py-2 font-medium text-slate-700 dark:text-slate-300" title={pkg.cargoDescription}>
                        {pkg.cargoDescription}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">{pkg.packageType}</td>
                      <td className="px-3 py-2">
                        {pkg.cargoStatus ? (
                          <StatusBadge
                            label={cargoStatusOptions.find(opt => opt.value === pkg.cargoStatus)?.label ?? pkg.cargoStatus}
                            tone={cargoStatusTone[pkg.cargoStatus]}
                          />
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {pkg.customsStatus ? (
                          <StatusBadge
                            label={customsStatusOptions.find(opt => opt.value === pkg.customsStatus)?.label ?? pkg.customsStatus}
                            tone={customsStatusTone[pkg.customsStatus]}
                          />
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">
                        {pkg.checkedDate ? new Date(pkg.checkedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompletedTable;
