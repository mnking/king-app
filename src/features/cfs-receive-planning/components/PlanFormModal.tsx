import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Calendar, Package, AlertTriangle } from 'lucide-react';
import {
  PlanFormSchema,
  planDefaultValues,
} from '@/shared/features/plan/schemas/receive-plan-schemas';
import type {
  PlanFormData,
  ReceivePlan,
  EnrichedUnplannedContainer,
} from '@/shared/features/plan/types';
import type { EnrichedReceivePlan } from '../hooks/use-plans-query';
import { FormInput, FormCheckbox } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { FilterTextbox } from '@/shared/components/FilterTextbox';
import { validatePlan } from '../schemas';
import { toDateTimeLocalFormat, fromDateTimeLocalFormat } from '@/shared/utils';
import toast from 'react-hot-toast';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  plan?: ReceivePlan | EnrichedReceivePlan | null;
  preSelectedContainerIds?: string[];
  availableContainers: EnrichedUnplannedContainer[];
  existingPlans: ReceivePlan[];
  onSave: (data: PlanFormData) => Promise<void>;
  canWrite?: boolean;
}

/**
 * PlanFormModal - Form for creating/editing receive plans
 *
 * Features:
 * - React Hook Form + Zod validation
 * - Create/Edit modes
 * - Container selection with preview
 * - Time validation (end > start, no overlaps)
 * - Deadline warnings (non-blocking)
 */
export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  plan,
  preSelectedContainerIds = [],
  availableContainers,
  existingPlans,
  onSave,
  canWrite = true,
}) => {
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<PlanFormData>({
    resolver: zodResolver(PlanFormSchema),
    defaultValues: planDefaultValues,
  });

  // Initialize form data - runs when modal opens or plan changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit') {
      if (!plan) {
        // Edge case: plan is undefined (async load not complete)
        // Reset to defaults to avoid stale UI
        reset(planDefaultValues);
        setSelectedContainerIds(new Set());
        return;
      }

      // Handle edit mode with optional chaining for safety
      // NOTE: API returns orderContainerId as null, actual ID is in orderContainer.id
      const containerIds = (plan.containers ?? []).map((c) => c.orderContainer?.id).filter(Boolean) as string[];

      if (plan.plannedStart && plan.plannedEnd) {
        // Split datetime into date and time parts (UTC)
        const startDateTime = toDateTimeLocalFormat(plan.plannedStart);
        const endDateTime = toDateTimeLocalFormat(plan.plannedEnd);

        const [startDate, startTime] = startDateTime.split('T');
        const [endDate, endTime] = endDateTime.split('T');

        // Reset form with plan data
        reset({
          plannedStart: startDate,
          plannedStartTime: startTime,
          plannedEnd: endDate,
          plannedEndTime: endTime,
          equipmentBooked: plan.equipmentBooked,
          portNotified: plan.portNotified,
          containerIds: containerIds,
        });
      } else {
        // Plan missing required dates - reset to defaults with containerIds
        reset({
          ...planDefaultValues,
          containerIds: containerIds,
        });
      }

      // Set selected containers state
      setSelectedContainerIds(new Set(containerIds));
    } else if (mode === 'create') {
      // Create mode: use pre-selected containers
      reset({
        ...planDefaultValues,
        containerIds: preSelectedContainerIds,
      });
      setSelectedContainerIds(new Set(preSelectedContainerIds));
    }
  }, [isOpen, mode, plan, preSelectedContainerIds, reset]);

  // Filter containers by search term (case-insensitive, partial match)
  // Sort selected containers to the top for easy tracking
  const filteredContainers = useMemo(() => {
    let containers = availableContainers;

    // Filter by search term if provided
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();

      containers = availableContainers.filter((container) => {
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
    }

    // Sort: selected containers first, then unselected
    return [...containers].sort((a, b) => {
      const aSelected = selectedContainerIds.has(a.id);
      const bSelected = selectedContainerIds.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [availableContainers, searchTerm, selectedContainerIds]);

  const handleSelectContainer = (containerId: string, selected: boolean) => {
    setSelectedContainerIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(containerId);
      } else {
        newSet.delete(containerId);
      }
      // Update form value
      setValue('containerIds', Array.from(newSet), { shouldValidate: true });
      return newSet;
    });
  };

  const onSubmit = async (data: PlanFormData) => {
    // Prevent concurrent saves
    if (isSaving) {
      return;
    }

    if (!canWrite) {
      toast.error('You do not have permission to modify receive plans.');
      return;
    }
    // Step 1: Combine date and time fields into datetime-local format (e.g., "2025-10-22T17:30")
    const combinedDateTimeData = {
      ...data,
      plannedStart: `${data.plannedStart}T${data.plannedStartTime}`,
      plannedEnd: `${data.plannedEnd}T${data.plannedEndTime}`,
    };

    // Step 2: Create validation data with UTC format (for accurate time overlap checking)
    const validationData = {
      ...combinedDateTimeData,
      plannedStart: fromDateTimeLocalFormat(combinedDateTimeData.plannedStart),
      plannedEnd: fromDateTimeLocalFormat(combinedDateTimeData.plannedEnd),
    };

    // Get selected containers for deadline warning validation
    const selectedContainers = availableContainers.filter((c) =>
      data.containerIds.includes(c.id),
    );

    // Comprehensive validation (uses UTC format for accurate comparison)
    const validation = validatePlan(
      validationData,
      existingPlans,
      selectedContainers,
      mode === 'edit' && plan ? plan.id : undefined,
    );

    // Show blocking errors
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        toast.error(error);
      });
      return;
    }

    try {
      setIsSaving(true);
      // Pass combinedDateTimeData to onSave - let handleSavePlan do the UTC conversion
      await onSave(combinedDateTimeData);

      // Show warnings after successful save (non-blocking)
      // REMOVED: Deadline warnings to reduce toast clutter
      // if (validation.warnings.length > 0) {
      //   validation.warnings.forEach((warning) => {
      //     toast(warning, {
      //       icon: '⚠️',
      //       duration: 6000,
      //     });
      //   });
      // }

      onClose();
    } catch {
      // Error toast is handled by the mutation hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      reset();
      setSelectedContainerIds(new Set());
      setSearchTerm('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Create Receive Plan' : `Edit plan ${plan?.code || ''}`}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {mode === 'create' ? 'Schedule containers for receiving' : 'Update plan details'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-900 dark:text-gray-100">
            {/* Time Range Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Schedule
              </h3>
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
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.plannedStart.message}</p>
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
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.plannedEnd.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Flags Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Prerequisites
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormCheckbox
                  name="equipmentBooked"
                  control={control}
                  label="Equipment Booked"
                  helpText="Has necessary equipment been reserved for this plan?"
                />
                <FormCheckbox
                  name="portNotified"
                  control={control}
                  label="Port Notified"
                  helpText="Has the port been notified of this receiving schedule?"
                />
              </div>
            </div>

            {/* Container Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Containers
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <Package className="h-4 w-4" />
                  {selectedContainerIds.size} selected
                </span>
              </div>

              {errors.containerIds?.message && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{errors.containerIds.message}</p>
                </div>
              )}

              {/* Search Filter */}
              <FilterTextbox
                fields={['containerNo', 'sealNumber', 'mblNumber', 'hblNo', 'orderCode', 'agentCode', 'vesselCode', 'voyage']}
                placeholder="Search containers"
                onSearch={(term) => setSearchTerm(term)}
                onClear={() => setSearchTerm('')}
              />

              {/* Container List - Simplified 3-column layout */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {filteredContainers.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No containers found</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {searchTerm ? 'Try adjusting your search term' : 'No containers available'}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {filteredContainers.map((container) => {
                      const isSelected = selectedContainerIds.has(container.id);
                      const containerType = container.enrichedHbls?.[0]?.containerTypeCode || 'N/A';
                      const hblNumbers = [
                        ...(container.hbls?.map((h) => h.hblNo) || []),
                        ...(container.enrichedHbls?.map((h) => h.hblNo) || []),
                      ];
                      const uniqueHbls = Array.from(new Set(hblNumbers));

                      return (
                        <div
                          key={container.id}
                          onClick={() => handleSelectContainer(container.id, !isSelected)}
                          className={`
                            grid grid-cols-[2fr_2fr_auto] gap-4 p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0
                            cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800
                            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-900'}
                          `}
                        >
                          {/* Column 1: Container Info */}
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{container.containerNo}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
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
                                <span className="font-medium text-gray-700 dark:text-gray-300">MBL:</span>{' '}
                                <span className="text-gray-900 dark:text-gray-100">{container.mblNumber}</span>
                              </div>
                            )}
                            {uniqueHbls.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">HBLs:</span>{' '}
                                <span className="text-gray-900 dark:text-gray-100">{uniqueHbls.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Column 3: Checkbox */}
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectContainer(container.id, e.target.checked);
                              }}
                              className="h-5 w-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3 flex-shrink-0">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              disabled={isSaving || !canWrite}
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
