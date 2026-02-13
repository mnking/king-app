import React, { useState, useMemo, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FilterTextbox } from '@/shared/components/FilterTextbox';
import type { EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import type { EnrichedReceivePlan } from '../hooks/use-plans-query';
import { useAssignContainer, useUnassignContainer } from '../hooks';

interface ContainerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EnrichedReceivePlan;
  availableContainers: EnrichedUnplannedContainer[];
  canWrite?: boolean;
}

/**
 * ContainerAssignmentModal - Manage container assignments for a plan
 *
 * Features:
 * - Show merged list of unplanned + plan's current containers
 * - FilterTextbox for searching
 * - Immediate API calls on check/uncheck
 * - Individual success toasts for each operation
 * - Auto-refresh via React Query cache invalidation
 */
export const ContainerAssignmentModal: React.FC<ContainerAssignmentModalProps> = ({
  isOpen,
  onClose,
  plan,
  availableContainers,
  canWrite = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Track containers being removed to handle stale data between mutation and cache refresh
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const assignContainerMutation = useAssignContainer();
  const unassignContainerMutation = useUnassignContainer();

  // Filter containers by search term (case-insensitive, partial match)
  const filteredContainers = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableContainers;
    }

    const lowerTerm = searchTerm.toLowerCase();

    return availableContainers.filter((container) => {
      // Search in direct fields
      const directFields = [
        container.containerNo,
        container.sealNumber,
        container.mblNumber,
      ];

      // Search in HBL numbers
      const hblNumbers = [
        ...(container.hbls?.map((h) => h.hblNo) || []),
        ...(container.enrichedHbls?.map((h) => h.hblNo) || []),
      ];

      // Search in booking order fields
      const orderFields = [
        container.bookingOrder?.code,
        container.bookingOrder?.agentCode,
        container.bookingOrder?.vesselCode,
        container.bookingOrder?.voyage,
      ];

      const allFields = [...directFields, ...hblNumbers, ...orderFields]
        .filter(Boolean)
        .map((f) => f!.toLowerCase());

      return allFields.some((field) => field.includes(lowerTerm));
    });
  }, [availableContainers, searchTerm]);

  // Clear pending removals when modal closes or when plan changes
  useEffect(() => {
    setPendingRemovals(new Set());
  }, [isOpen, plan.id]);

  // Clear pending removals for containers that are no longer in the plan
  // This syncs pending state with refreshed plan data after mutations
  useEffect(() => {
    if (pendingRemovals.size === 0) return;

    const containerIdsInPlan = new Set(
      plan.containers.map((c) => c.orderContainer.id)
    );

    setPendingRemovals((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        // Keep only if container is still in plan (stale data case)
        if (containerIdsInPlan.has(id)) {
          next.add(id);
        }
        // If container is no longer in plan, it was successfully removed
        // so we don't need to track it as pending anymore
      }
      return next;
    });
  }, [plan.containers, pendingRemovals.size]);

  const handleToggleContainer = async (containerId: string, checked: boolean) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    // Prevent concurrent mutations to avoid race conditions
    if (assignContainerMutation.isPending || unassignContainerMutation.isPending) {
      return;
    }
    if (checked) {
      // Assign container to plan
      try {
        await assignContainerMutation.mutateAsync({
          planId: plan.id,
          orderContainerId: containerId,
        });
        toast.success('Container assigned');
      } catch {
        // Error already handled by mutation hook
      }
    } else {
      // Skip if this container is already being removed (prevents duplicate unassign during stale data window)
      if (pendingRemovals.has(containerId)) {
        return;
      }

      // Prevent removing the last container - use effective count accounting for pending removals
      // This handles stale data between mutation completion and cache refresh
      const effectiveCount = plan.containers.length - pendingRemovals.size;
      if (effectiveCount <= 1) {
        toast.error('Cannot remove the last container. A plan must have at least one container.');
        return;
      }

      // Find the assignment to remove
      const assignment = plan.containers.find(
        (c) => c.orderContainer.id === containerId
      );
      if (assignment) {
        // Mark as pending removal to handle stale data window
        setPendingRemovals((prev) => new Set(prev).add(containerId));
        try {
          await unassignContainerMutation.mutateAsync({
            planId: plan.id,
            assignmentId: assignment.id,
          });
          toast.success('Container removed');
          // Keep in pending until plan data refreshes (cleared by useEffect below)
        } catch {
          // Clear from pending on error since no actual change occurred
          setPendingRemovals((prev) => {
            const next = new Set(prev);
            next.delete(containerId);
            return next;
          });
        }
      }
    }
  };

  const isContainerInPlan = (containerId: string): boolean => {
    return plan.containers.some((c) => c.orderContainer.id === containerId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Containers of plan {plan.code}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage container assignments for this plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search Filter */}
          <FilterTextbox
            fields={['containerNo', 'sealNumber', 'mblNumber', 'hblNo', 'orderCode', 'agentCode', 'vesselCode', 'voyage']}
            placeholder="Search containers"
            onSearch={(term) => setSearchTerm(term)}
            onClear={() => setSearchTerm('')}
          />

          {/* Container List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {filteredContainers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">No containers found</p>
                <p className="text-xs text-gray-500 mt-1">
                  {searchTerm ? 'Try adjusting your search term' : 'No containers available'}
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {filteredContainers.map((container) => {
                  const isSelected = isContainerInPlan(container.id);
                  const containerType = container.enrichedHbls?.[0]?.containerTypeCode || 'N/A';
                  const hblNumbers = [
                    ...(container.hbls?.map((h) => h.hblNo) || []),
                    ...(container.enrichedHbls?.map((h) => h.hblNo) || []),
                  ];
                  const uniqueHbls = Array.from(new Set(hblNumbers));

                  return (
                    <div
                      key={container.id}
                      className={`
                        grid grid-cols-[2fr_2fr_auto] gap-4 p-4 border-b border-gray-200 last:border-b-0
                        ${isSelected ? 'bg-blue-50' : 'bg-white'}
                      `}
                    >
                      {/* Column 1: Container Info */}
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-gray-900">{container.containerNo}</div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{containerType}</span>
                          {container.sealNumber && (
                            <span className="ml-2">• Seal: {container.sealNumber}</span>
                          )}
                        </div>
                      </div>

                      {/* Column 2: MBL / HBLs */}
                      <div className="flex flex-col gap-1">
                        {container.mblNumber && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">MBL:</span>{' '}
                            <span className="text-gray-900">{container.mblNumber}</span>
                          </div>
                        )}
                        {uniqueHbls.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">HBLs:</span>{' '}
                            <span className="text-gray-900">{uniqueHbls.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Checkbox */}
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleContainer(container.id, e.target.checked)}
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <p className="text-sm text-gray-600 mr-auto">
            {plan.containers.length} container{plan.containers.length !== 1 ? 's' : ''} assigned
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
