import React from 'react';
import { ClipboardList, Edit3, Play, Trash2, Unlink } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import EntityTable, { EntityColumn } from '@/shared/components/EntityTable';
import type { ExportPlanContainer, ExportPlanPackingList } from '../types';
import { containerStatusLabel, containerStatusOrder } from '../utils';
import { ContainerStatusBadge } from './PlanAssigningBadges';

interface PlanAssigningPackingListsPanelProps {
  unassignedKey: string;
  selectedContainerKey: string;
  activePackingListLabel: string;
  selectedContainer: ExportPlanContainer | null;

  filteredPackingLists: ExportPlanPackingList[];
  packingListColumns: EntityColumn<ExportPlanPackingList>[];

  assignTargetContainerId: string | null;
  onChangeAssignTargetContainerId: (next: string | null) => void;
  canAssignTargets: boolean;
  sortedContainers: ExportPlanContainer[];

  selectedCount: number;

  onAssign: () => void;
  onUnassign: () => void;
  isAssignPending: boolean;
  canUnassignFromSelected: boolean;

  isSelectedContainerConfirmToggleDisabled: boolean;
  canConfirmSelectedContainer: boolean;
  selectedContainerMissingRequirements: string[];
  onToggleConfirmContainer: (container: ExportPlanContainer, nextChecked: boolean) => void;

  onStartStuffing: (container: ExportPlanContainer) => void;
  isStartStuffingPending: boolean;

  areSelectedContainerActionsDisabled: boolean;
  onEditSelectedContainer: () => void;
  onDeleteSelectedContainer: () => void;
  isDeletePending: boolean;
  canDeleteSelectedContainer: boolean;
}

export const PlanAssigningPackingListsPanel: React.FC<PlanAssigningPackingListsPanelProps> = ({
  unassignedKey,
  selectedContainerKey,
  activePackingListLabel,
  selectedContainer,
  filteredPackingLists,
  packingListColumns,
  assignTargetContainerId,
  onChangeAssignTargetContainerId,
  canAssignTargets,
  sortedContainers,
  selectedCount,
  onAssign,
  onUnassign,
  isAssignPending,
  canUnassignFromSelected,
  isSelectedContainerConfirmToggleDisabled,
  canConfirmSelectedContainer,
  selectedContainerMissingRequirements,
  onToggleConfirmContainer,
  onStartStuffing,
  isStartStuffingPending,
  areSelectedContainerActionsDisabled,
  onEditSelectedContainer,
  onDeleteSelectedContainer,
  isDeletePending,
  canDeleteSelectedContainer,
}) => {
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:top-0 lg:z-20 lg:bg-white dark:border-gray-800 dark:bg-gray-900 dark:lg:bg-gray-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Packing Lists
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {filteredPackingLists.length} packing list{filteredPackingLists.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500 sm:justify-end">
              <span>Container:</span>
              <span
                className="min-w-0 truncate text-gray-700 dark:text-gray-200"
                title={activePackingListLabel}
              >
                {activePackingListLabel}
              </span>
              {selectedContainer && <ContainerStatusBadge status={selectedContainer.status} />}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {selectedContainerKey === unassignedKey ? (
                <>
                  <select
                    value={assignTargetContainerId ?? ''}
                    onChange={(event) => onChangeAssignTargetContainerId(event.target.value || null)}
                    disabled={!canAssignTargets}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 sm:w-auto"
                    aria-label="Assign target container"
                  >
                    <option value="">Select target container</option>
                    {sortedContainers
                      .filter(
                        (container) =>
                          containerStatusOrder[container.status] <
                          containerStatusOrder.CONFIRMED,
                      )
                      .map((container) => (
                        <option key={container.id} value={container.id}>
                          {container.containerNumber ?? 'Container'} ({container.containerTypeCode ?? '-'}) - {containerStatusLabel[container.status]}
                        </option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onAssign}
                    disabled={selectedCount === 0 || !assignTargetContainerId || isAssignPending}
                    className="flex w-full items-center gap-2 sm:w-auto"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Assign
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onUnassign}
                  disabled={!canUnassignFromSelected || selectedCount === 0 || isAssignPending}
                  className="flex w-full items-center gap-2 sm:w-auto"
                >
                  <Unlink className="h-4 w-4" />
                  Unassign
                </Button>
              )}

              <span className="text-xs text-gray-500">Selected: {selectedCount}</span>
            </div>

            {selectedContainer && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => onStartStuffing(selectedContainer)}
                  disabled={
                    areSelectedContainerActionsDisabled ||
                    isStartStuffingPending ||
                    selectedContainer.status !== 'CONFIRMED'
                  }
                  className="w-full sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start Stuffing
                  </span>
                </Button>

                <div className="flex flex-col gap-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={
                        selectedContainer.status === 'CONFIRMED' ||
                        selectedContainer.status === 'IN_PROGRESS' ||
                        selectedContainer.status === 'STUFFED'
                      }
                      disabled={
                        areSelectedContainerActionsDisabled ||
                        isSelectedContainerConfirmToggleDisabled
                      }
                      onChange={(event) => onToggleConfirmContainer(selectedContainer, event.target.checked)}
                    />
                    Confirmed
                  </label>
                  {selectedContainer.status === 'SPECIFIED' && !canConfirmSelectedContainer && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      Missing: {selectedContainerMissingRequirements.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onEditSelectedContainer}
                    disabled={areSelectedContainerActionsDisabled}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDeleteSelectedContainer}
                    disabled={
                      areSelectedContainerActionsDisabled ||
                      !canDeleteSelectedContainer ||
                      isDeletePending
                    }
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <EntityTable
          entities={filteredPackingLists}
          loading={false}
          error={null}
          entityName="packing list"
          entityNamePlural="packing lists"
          getId={(packingList) => packingList.id}
          columns={packingListColumns}
          actions={[]}
          canBulkEdit={false}
          enablePagination={false}
          className="h-full [&>div:first-child]:hidden [&>div:last-child]:border-0 [&>div:last-child]:rounded-none [&>div:last-child>div]:overflow-x-auto [&>div:last-child>div]:overflow-y-visible [&_thead]:!static [&_thead]:!top-auto"
          emptyStateMessage="No packing lists for this selection."
        />
      </div>
    </div>
  );
};
