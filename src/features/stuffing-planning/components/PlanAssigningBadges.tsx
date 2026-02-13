import React from 'react';
import { useCargoPackageCount } from '../hooks/use-cargo-package-count';
import type { ExportPlanContainer } from '../types';
import { containerStatusLabel } from '../utils';

const statusBadgeStyles: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  SPECIFIED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  STUFFED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export const ContainerStatusBadge: React.FC<{ status: ExportPlanContainer['status'] }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeStyles[status] ?? statusBadgeStyles.CREATED}`}
  >
    {containerStatusLabel[status] ?? status}
  </span>
);

export const CargoReceivedBadge: React.FC<{ packingListId?: string | null }> = ({
  packingListId,
}) => {
  const { data, isLoading } = useCargoPackageCount(packingListId);
  if (!packingListId) {
    return <span className="text-xs text-gray-400">Unknown</span>;
  }
  if (isLoading) {
    return <span className="text-xs text-gray-400">Loading...</span>;
  }
  const received = (data ?? 0) > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        received
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {received ? 'Received' : 'Not received'}
    </span>
  );
};