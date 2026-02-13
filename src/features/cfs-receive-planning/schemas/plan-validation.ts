import type {
  ReceivePlan,
  PlanFormData,
  UnplannedContainer,
  ValidationResult,
} from '@/shared/features/plan/types';

// ===========================
// Helper Functions
// ===========================

/**
 * Check if two time ranges overlap
 * Overlap occurs when: start1 <= end2 AND end1 >= start2
 *
 * @param start1 - Start time of first range (ISO string)
 * @param end1 - End time of first range (ISO string)
 * @param start2 - Start time of second range (ISO string)
 * @param end2 - End time of second range (ISO string)
 * @returns true if ranges overlap
 */
export const timesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  // Boundary touch (exact end = start) IS considered overlap
  return s1 <= e2 && e1 >= s2;
};

// ===========================
// Validation Functions
// ===========================

/**
 * Validate that plan end time is after start time
 *
 * @param plannedStart - Plan start time (ISO string)
 * @param plannedEnd - Plan end time (ISO string)
 * @returns Error message if invalid, null if valid
 */
export const validatePlanTimes = (
  plannedStart: string,
  plannedEnd: string,
): string | null => {
  const start = new Date(plannedStart);
  const end = new Date(plannedEnd);

  if (end <= start) {
    return 'End time must be after start time';
  }

  const now = new Date();
  now.setSeconds(0, 0);
  if (start < now) {
    return 'Planned start time cannot be in the past';
  }

  return null;
};

/**
 * Check for time overlap with existing plans based on status policy
 *
 * Policy (RECEIVING):
 * - Compare against plans with status: SCHEDULED, IN_PROGRESS
 * - Ignore plans with status: DONE, PENDING
 * - For IN_PROGRESS plans, use executionStart as the comparison start time
 *
 * @param plan - Plan data to validate (with start/end times)
 * @param existingPlans - Array of existing plans (will filter by policy)
 * @param planIdToExclude - ID of plan being edited (exclude self from overlap check)
 * @returns Error message if overlap detected, null if no overlap
 */
export const checkTimeOverlap = (
  plan: { plannedStart: string; plannedEnd: string },
  existingPlans: ReceivePlan[],
  planIdToExclude?: string,
): string | null => {
  const comparablePlans = existingPlans.filter(
    (p) =>
      (p.status === 'SCHEDULED' || p.status === 'IN_PROGRESS') &&
      p.id !== planIdToExclude,
  );

  for (const existingPlan of comparablePlans) {
    if (existingPlan.status === 'IN_PROGRESS') {
      if (!existingPlan.executionStart) {
        return 'Cannot validate overlap: IN_PROGRESS plan missing executionStart';
      }

      const executionStartMs = new Date(existingPlan.executionStart).getTime();
      const estimatedStartMs = new Date(existingPlan.plannedStart).getTime();
      const estimatedEndMs = new Date(existingPlan.plannedEnd).getTime();

      if (
        Number.isNaN(executionStartMs) ||
        Number.isNaN(estimatedStartMs) ||
        Number.isNaN(estimatedEndMs)
      ) {
        return 'Cannot validate overlap: IN_PROGRESS plan has invalid estimated times';
      }

      const durationMs = estimatedEndMs - estimatedStartMs;
      if (durationMs <= 0) {
        return 'Cannot validate overlap: IN_PROGRESS plan has plannedEnd <= plannedStart';
      }

      const shiftedEnd = new Date(executionStartMs + durationMs).toISOString();

      if (
        timesOverlap(
          plan.plannedStart,
          plan.plannedEnd,
          existingPlan.executionStart,
          shiftedEnd,
        )
      ) {
        return `Plan time overlaps with existing plan ${existingPlan.code}`;
      }

      continue;
    }

    if (
      timesOverlap(
        plan.plannedStart,
        plan.plannedEnd,
        existingPlan.plannedStart,
        existingPlan.plannedEnd,
      )
    ) {
      return `Plan time overlaps with existing plan ${existingPlan.code}`;
    }
  }

  return null;
};

/**
 * Generate deadline warnings for plan (non-blocking)
 *
 * Warnings are shown as toasts after successful save but do not prevent saving.
 *
 * @param plan - Plan data with end time
 * @param containers - Array of containers in the plan
 * @returns Array of warning messages
 */
export const generateDeadlineWarnings = (
  plan: { plannedEnd: string },
  containers: UnplannedContainer[],
): string[] => {
  const warnings: string[] = [];
  const planEnd = new Date(plan.plannedEnd);

  containers.forEach((container) => {
    // Warning: Plan end exceeds extraction deadline
    if (container.extractTo) {
      const extractionDeadline = new Date(container.extractTo);
      if (planEnd > extractionDeadline) {
        warnings.push(
          `Container ${container.containerNo}: Extraction deadline (${new Date(
            container.extractTo,
          ).toLocaleDateString()}) exceeded by plan end time`,
        );
      }
    }

    // Warning: Plan end exceeds free storage deadline
    if (container.yardFreeTo) {
      const freeStorageDeadline = new Date(container.yardFreeTo);
      if (planEnd > freeStorageDeadline) {
        warnings.push(
          `Container ${container.containerNo}: Free storage deadline (${new Date(
            container.yardFreeTo,
          ).toLocaleDateString()}) exceeded by plan end time`,
        );
      }
    }
  });

  return warnings;
};

// ===========================
// Comprehensive Validation
// ===========================

/**
 * Validate plan data comprehensively
 *
 * Returns blocking errors and non-blocking warnings.
 *
 * @param planData - Plan form data to validate
 * @param existingPlans - Array of existing plans for overlap check
 * @param containers - Array of containers in the plan (for deadline warnings)
 * @param planIdToExclude - ID of plan being edited (optional)
 * @returns ValidationResult with errors and warnings
 */
export const validatePlan = (
  planData: PlanFormData & { plannedStart: string; plannedEnd: string },
  existingPlans: ReceivePlan[],
  containers: UnplannedContainer[] = [],
  planIdToExclude?: string,
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Blocking Error: Time range validation
  const timeError = validatePlanTimes(planData.plannedStart, planData.plannedEnd);
  if (timeError) {
    errors.push(timeError);
  }

  // Blocking Error: Time overlap check
  const overlapError = checkTimeOverlap(
    {
      plannedStart: planData.plannedStart,
      plannedEnd: planData.plannedEnd,
    },
    existingPlans,
    planIdToExclude,
  );
  if (overlapError) {
    errors.push(overlapError);
  }

  // Blocking Error: At least one container must be selected
  if (!planData.containerIds || planData.containerIds.length === 0) {
    errors.push('At least one container must be selected');
  }

  // Non-Blocking Warnings: Deadline conflicts
  if (containers.length > 0) {
    const deadlineWarnings = generateDeadlineWarnings(
      { plannedEnd: planData.plannedEnd },
      containers,
    );
    warnings.push(...deadlineWarnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
