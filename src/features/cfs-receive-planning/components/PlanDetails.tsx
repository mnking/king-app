import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2, Play, Package, Calendar, Check, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ReceivePlan, EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import { ContainerCard } from './ContainerCard';
import { ContainerAssignmentModal } from './ContainerAssignmentModal';
import { sortUnplannedContainers, mergeContainersForEdit } from '../helpers';
import {
  PlanHeaderFormSchema,
  planHeaderDefaultValues,
  type PlanHeaderFormData,
} from '@/shared/features/plan/schemas/receive-plan-schemas';
import { FormInput, FormCheckbox } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { FilterTextbox } from '@/shared/components/FilterTextbox';
import { useUpdatePlan } from '../hooks';
import type { EnrichedReceivePlan } from '../hooks/use-plans-query';
import { toDateTimeLocalFormat, fromDateTimeLocalFormat } from '@/shared/utils';
import { formatDateTime } from '@/shared/utils/date-format';
import { checkTimeOverlap, validatePlanTimes } from '../schemas';

interface PlanDetailsProps {
  selectedPlanId: string | 'unplanned' | null;
  plan: ReceivePlan | EnrichedReceivePlan | null;
  unplannedContainers: EnrichedUnplannedContainer[];
  selectedUnplannedContainerIds: Set<string>;
  onToggleUnplannedContainerSelection: (containerId: string, selected: boolean) => void;
  existingPlans: ReceivePlan[];
  onDeletePlan: (planId: string) => void;
  onMarkDoing: (planId: string) => void;
  onPlanSelectionChange: (planId: string | 'unplanned') => void;
  className?: string;
  canWrite?: boolean;
}

/**
 * PlanDetails - Right panel showing plan details
 *
 * Three views:
 * 1. Unplanned View - Sorted container list with checkboxes (selection used when creating a plan)
 * 2. SCHEDULED Plan View - Metadata + actions (Edit, Delete, Mark Doing) + containers
 * 3. DONE Plan View - Metadata + containers (read-only)
 */
export const PlanDetails: React.FC<PlanDetailsProps> = ({
  selectedPlanId,
  plan,
  unplannedContainers,
  selectedUnplannedContainerIds,
  onToggleUnplannedContainerSelection,
  existingPlans,
  onDeletePlan,
  onMarkDoing,
  onPlanSelectionChange,
  className = '',
  canWrite = true,
}) => {
  // State management
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMarkDoingConfirm, setShowMarkDoingConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [displayedPlan, setDisplayedPlan] = useState<ReceivePlan | EnrichedReceivePlan | null>(plan);
  const [pendingPlan, setPendingPlan] = useState<ReceivePlan | EnrichedReceivePlan | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // Mutations
  const updatePlanMutation = useUpdatePlan();

  // React Hook Form for inline edit
  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<PlanHeaderFormData>({
    resolver: zodResolver(PlanHeaderFormSchema),
    defaultValues: planHeaderDefaultValues,
  });

  // Detect plan changes during edit mode and show confirmation
  useEffect(() => {
    // If not editing, just update the displayed plan
    if (!isEditing) {
      setDisplayedPlan(plan);
      return;
    }

    // If editing and plan changed, show confirmation
    if (plan && displayedPlan && plan.id !== displayedPlan.id) {
      setPendingPlan(plan);
      setShowSwitchConfirm(true);
    }
  }, [plan, isEditing, displayedPlan]);

  // Sort unplanned containers by priority
  const sortedUnplannedContainers = useMemo(
    () => sortUnplannedContainers(unplannedContainers),
    [unplannedContainers],
  );

  // Filter containers by search term (case-insensitive, partial match)
  const filteredContainers = useMemo(() => {
    if (!searchTerm.trim()) {
      return sortedUnplannedContainers;
    }

    const lowerTerm = searchTerm.toLowerCase();

    return sortedUnplannedContainers.filter((container) => {
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
  }, [sortedUnplannedContainers, searchTerm]);

  // Helper to check if plan is enriched
  const isEnrichedPlan = (p: ReceivePlan | EnrichedReceivePlan | null): p is EnrichedReceivePlan => {
    return p !== null && 'containers' in p && Array.isArray(p.containers);
  };

  // Get merged containers for container modal (only for enriched plans)
  // useMemo must be called unconditionally (React Hooks rules)
  const availableContainersForModal = useMemo(() => {
    if (!plan || !isEnrichedPlan(plan)) return [];
    return mergeContainersForEdit(unplannedContainers, plan.containers);
  }, [plan, unplannedContainers]);

  const handleSelectContainer = (containerId: string, selected: boolean) => {
    onToggleUnplannedContainerSelection(containerId, selected);
  };

  const handleDeleteConfirm = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    if (plan) {
      onDeletePlan(plan.id);
      setShowDeleteConfirm(false);
    }
  };

  const handleMarkDoingConfirm = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    if (plan) {
      onMarkDoing(plan.id);
      setShowMarkDoingConfirm(false);
    }
  };

  const handleOpenContainerModal = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    setShowContainerModal(true);
  };

  // Edit mode handlers
  const handleEdit = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    if (!plan) return;

    // Convert ISO datetime to date/time inputs
    const startDateTime = toDateTimeLocalFormat(plan.plannedStart);
    const endDateTime = toDateTimeLocalFormat(plan.plannedEnd);

    const [startDate, startTime] = startDateTime.split('T');
    const [endDate, endTime] = endDateTime.split('T');

    // Initialize form with plan data
    reset({
      plannedStart: startDate,
      plannedStartTime: startTime,
      plannedEnd: endDate,
      plannedEndTime: endTime,
      equipmentBooked: plan.equipmentBooked,
      portNotified: plan.portNotified,
    });

    setIsEditing(true);
  };

  const handleSave = async (formData: PlanHeaderFormData) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    if (!plan) return;

    try {
      // Combine date and time fields
      const plannedStart = fromDateTimeLocalFormat(`${formData.plannedStart}T${formData.plannedStartTime}`);
      const plannedEnd = fromDateTimeLocalFormat(`${formData.plannedEnd}T${formData.plannedEndTime}`);

      const timeError = validatePlanTimes(plannedStart, plannedEnd);
      if (timeError) {
        toast.error(timeError);
        return;
      }

      const overlapError = checkTimeOverlap(
        { plannedStart, plannedEnd },
        existingPlans,
        plan.id,
      );
      if (overlapError) {
        toast.error(overlapError);
        return;
      }

      // Update plan header only (no containers)
      await updatePlanMutation.mutateAsync({
        id: plan.id,
        data: {
          plannedStart,
          plannedEnd,
          equipmentBooked: formData.equipmentBooked,
          portNotified: formData.portNotified,
        },
      });

      toast.success('Plan updated successfully');
      setIsEditing(false);
    } catch {
      // Error already handled by mutation hook
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  // Handle plan switch confirmation
  const handleDiscardAndSwitch = () => {
    if (!pendingPlan) return;

    // Exit edit mode
    setIsEditing(false);
    reset();

    // Update displayed plan to the new one
    setDisplayedPlan(pendingPlan);

    // Update form fields with new plan data
    const startDateTime = toDateTimeLocalFormat(pendingPlan.plannedStart);
    const endDateTime = toDateTimeLocalFormat(pendingPlan.plannedEnd);
    const [startDate, startTime] = startDateTime.split('T');
    const [endDate, endTime] = endDateTime.split('T');

    reset({
      plannedStart: startDate,
      plannedStartTime: startTime,
      plannedEnd: endDate,
      plannedEndTime: endTime,
      equipmentBooked: pendingPlan.equipmentBooked,
      portNotified: pendingPlan.portNotified,
    });

    // Clear pending state
    setPendingPlan(null);
    setShowSwitchConfirm(false);
  };

  const handleCancelSwitch = () => {
    if (!displayedPlan) return;

    // Revert selection to the current plan being edited
    onPlanSelectionChange(displayedPlan.id);

    // Clear pending state
    setPendingPlan(null);
    setShowSwitchConfirm(false);
  };

  // ===========================
  // Unplanned View
  // ===========================
  if (selectedPlanId === 'unplanned') {
    return (
      <div className={`h-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Unplanned Containers</h2>
              {searchTerm ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing {filteredContainers.length} of {sortedUnplannedContainers.length} containers
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {sortedUnplannedContainers.length} container{sortedUnplannedContainers.length !== 1 ? 's' : ''} awaiting plan assignment
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filter Textbox */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <FilterTextbox
            fields={['containerNo', 'sealNumber', 'mblNumber', 'hblNo', 'orderCode', 'agentCode', 'vesselCode', 'voyage']}
            placeholder="Search containers"
            onSearch={(term) => setSearchTerm(term)}
            onClear={() => setSearchTerm('')}
          />
        </div>

        {/* Container List */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedUnplannedContainers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">All containers are planned!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                There are no containers awaiting plan assignment.
              </p>
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No matches found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Try adjusting your search term or clear the filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContainers.map((container) => (
                <ContainerCard
                  key={container.id}
                  container={container}
                  selectable
                  selected={selectedUnplannedContainerIds.has(container.id)}
                  onSelect={handleSelectContainer}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================
  // No Selection
  // ===========================
  if (!plan) {
    return (
      <div className={`h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No plan selected</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Select a plan from the list or create a new one
          </p>
        </div>
      </div>
    );
  }

  const isScheduled = plan.status === 'SCHEDULED';
  const isDone = plan.status === 'DONE';
  const canMarkDoing = isScheduled && plan.containers.length > 0;

  // ===========================
  // SCHEDULED / DONE Plan View
  // ===========================
  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.code}</h2>
              {isDone && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  Completed
                </span>
              )}
            </div>

            {/* View Mode: Read-only metadata */}
            {!isEditing && (
              <>
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Planned Start:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formatDateTime(plan.plannedStart)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Planned End:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formatDateTime(plan.plannedEnd)}
                    </span>
                  </div>
                  {isDone && plan.executionEnd && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Completion Time:</span>
                      <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                        {formatDateTime(plan.executionEnd)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-3 mt-3">
                  <span className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                    ${plan.equipmentBooked
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                    }
                  `}>
                    {plan.equipmentBooked ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Equipment {plan.equipmentBooked ? 'Booked' : 'Not Booked'}
                  </span>
                  <span className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                    ${plan.portNotified
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                    }
                  `}>
                    {plan.portNotified ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Port {plan.portNotified ? 'Notified' : 'Not Notified'}
                  </span>
                </div>
              </>
            )}

            {/* Edit Mode: Inline form */}
            {isEditing && (
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4 mt-4">
                {/* Time Range Section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Planned Start */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Planned Start (Local Time) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput
                        name="plannedStart"
                        control={control}
                        type="date"
                        required
                      />
                      <FormInput
                        name="plannedStartTime"
                        control={control}
                        type="time"
                        required
                      />
                    </div>
                    {errors.plannedStart && (
                      <p className="text-sm text-red-600">{errors.plannedStart.message}</p>
                    )}
                  </div>

                  {/* Planned End */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Planned End (Local Time) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput
                        name="plannedEnd"
                        control={control}
                        type="date"
                        required
                      />
                      <FormInput
                        name="plannedEndTime"
                        control={control}
                        type="time"
                        required
                      />
                    </div>
                    {errors.plannedEnd && (
                      <p className="text-sm text-red-600">{errors.plannedEnd.message}</p>
                    )}
                  </div>
                </div>

                {/* Status Flags Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormCheckbox
                    name="equipmentBooked"
                    control={control}
                    label="Equipment Booked"
                    helpText="Has necessary equipment been reserved?"
                  />
                  <FormCheckbox
                    name="portNotified"
                    control={control}
                    label="Port Notified"
                    helpText="Has the port been notified?"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {/* View Mode Buttons (SCHEDULED only) */}
            {!isEditing && isScheduled && (
              <>
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={!canWrite}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="danger"
                  size="sm"
                  type="button"
                  disabled={!canWrite}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                {isEnrichedPlan(plan) && (
                  <Button
                  onClick={handleOpenContainerModal}
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={!canWrite}
                  >
                  <Package className="h-4 w-4 mr-2" />
                  Containers ({plan.containers.length})
                </Button>
              )}
                <Button
                  onClick={() => setShowMarkDoingConfirm(true)}
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={!canWrite || !canMarkDoing}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Mark Doing
                </Button>
            </>
          )}

            {/* Edit Mode Buttons */}
            {isEditing && (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit(handleSave)}
                  variant="primary"
                  size="sm"
                  type="button"
                  loading={updatePlanMutation.isPending}
                  disabled={!canWrite}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Container List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Containers ({plan.containers.length})
          </h3>
        </div>
        <div className="space-y-4">
          {plan.containers.map((planContainer) => (
            <ContainerCard
              key={planContainer.id}
              container={planContainer.orderContainer}
              planContext={{ plannedStart: plan.plannedStart }}
            />
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmDialog
              open={showDeleteConfirm}
              message="Delete Plan"
              description={`Are you sure you want to delete plan ${plan.code}? All containers will return to the unplanned list.`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              intent="danger"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      )}

      {/* Mark Doing Confirmation Dialog */}
      {showMarkDoingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowMarkDoingConfirm(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmDialog
              open={showMarkDoingConfirm}
              message="Start Plan Execution"
              description={`Are you sure you want to start executing plan ${plan.code}? The plan will transition to IN_PROGRESS status.`}
              confirmLabel="Mark Doing"
              cancelLabel="Cancel"
              intent="primary"
              onConfirm={handleMarkDoingConfirm}
              onCancel={() => setShowMarkDoingConfirm(false)}
            />
          </div>
        </div>
      )}

      {/* Container Assignment Modal */}
      {isEnrichedPlan(plan) && (
        <ContainerAssignmentModal
          isOpen={showContainerModal}
          onClose={() => setShowContainerModal(false)}
          plan={plan}
          availableContainers={availableContainersForModal}
          canWrite={canWrite}
        />
      )}

      {/* Plan Switch Confirmation Dialog */}
      {showSwitchConfirm && displayedPlan && pendingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmDialog
              open={showSwitchConfirm}
              message="Unsaved Changes"
              description={`You have unsaved changes to ${displayedPlan.code}. Discard and switch to ${pendingPlan.code}?`}
              confirmLabel="Discard"
              cancelLabel="Cancel"
              intent="warning"
              onConfirm={handleDiscardAndSwitch}
              onCancel={handleCancelSwitch}
            />
          </div>
        </div>
      )}
    </div>
  );
};
