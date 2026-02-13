import React from 'react';
import { Box, Check, ClipboardList, Package, Plus, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import type { ExportPlanContainer } from '../types';
import { ContainerStatusBadge } from './PlanAssigningBadges';

interface PlanAssigningSidebarProps {
  unassignedKey: string;
  selectedContainerKey: string;
  onSelectContainerKey: (key: string) => void;
  unassignedPackingListsCount: number;
  totalPackingListsCount: number;
  planHasUnassigned: boolean;
  sortedContainers: ExportPlanContainer[];
  onAddContainer: () => void;
}

const BooleanChip: React.FC<{
  value?: boolean;
  label: string;
  trueText?: string;
  falseText?: string;
}> = ({
  value,
  label,
  trueText = 'Yes',
  falseText = 'No',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${value
      ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      }`}
  >
    {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    {label} {value ? trueText : falseText}
  </span>
);

export const PlanAssigningSidebar: React.FC<PlanAssigningSidebarProps> = ({
  unassignedKey,
  selectedContainerKey,
  onSelectContainerKey,
  unassignedPackingListsCount,
  totalPackingListsCount,
  planHasUnassigned,
  sortedContainers,
  onAddContainer,
}) => {
  const unassignedRatio =
    totalPackingListsCount > 0
      ? Math.min(
        100,
        Math.max(0, Math.round((unassignedPackingListsCount / totalPackingListsCount) * 100)),
      )
      : 0;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-4 lg:self-start dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectContainerKey(unassignedKey)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectContainerKey(unassignedKey);
            }
          }}
          className={`w-full border border-gray-200 dark:border-gray-700 px-4 py-3 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset bg-orange-50 dark:bg-orange-900/10 ${selectedContainerKey === unassignedKey
            ? 'border-l-4 border-l-orange-500'
            : 'border-l-4 border-l-transparent hover:bg-orange-100/70 dark:hover:bg-orange-900/20 hover:border-l-orange-400'
            }`}
        >
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Unassigned packing lists
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <ClipboardList className="h-3 w-3" />
                    {unassignedPackingListsCount}
                  </span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <Package className="h-3 w-3" />
                    {totalPackingListsCount} PLs
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${unassignedRatio}%` }}
                  />
                </div>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Group
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {planHasUnassigned ? 'Assign remaining PLs to proceed.' : 'All PLs assigned.'}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Containers
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Package className="h-3 w-3" />
              {sortedContainers.length}
            </span>
          </div>
          <Button size="sm" onClick={onAddContainer} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add container
          </Button>
        </div>

        <div className="flex flex-col">
          {sortedContainers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No containers yet. Add containers to start assigning packing lists.
            </div>
          ) : (
            sortedContainers.map((container) => {
              const isSelected = container.id === selectedContainerKey;
              return (
                <div
                  key={container.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectContainerKey(container.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectContainerKey(container.id);
                    }
                  }}
                  className={`w-full border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                    : 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {container.containerNumber ?? 'Container'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Type: {container.containerTypeCode ?? '-'}
                        </div>
                      </div>
                    </div>
                    <ContainerStatusBadge status={container.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <Box className="h-3 w-3" />
                      {container.assignedPackingListCount} PLs
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <BooleanChip
                      label="Equipment"
                      value={container.equipmentBooked}
                      trueText="Booked"
                      falseText="Pending"
                    />
                    <BooleanChip
                      label="Appointment"
                      value={container.appointmentBooked}
                      trueText="Booked"
                      falseText="Pending"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
