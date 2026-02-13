import React from 'react';

export const HBLCargoSummaryCards: React.FC<{
  lineTotals: { numberOfPackages: number; weight: number; volume: number };
}> = ({ lineTotals }) => (
  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Packages
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.numberOfPackages}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Auto-calculated from cargo line items
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Weight (kg)
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.weight.toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sum of gross weights for all lines
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Volume (m³)
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.volume.toFixed(3)}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sum of volumes for all lines
        </div>
      </div>
    </div>
  </div>
);
