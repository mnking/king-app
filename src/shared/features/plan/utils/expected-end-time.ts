import type { ReceivePlan } from '../types/receive-plan-types';

/**
 * Calculate expected end time for IN_PROGRESS plan
 *
 * Formula: executionStart + (plannedEnd - plannedStart)
 *
 * @param plan - The receive plan
 * @returns Expected end time string
 *   - If executionStart is null: Returns duration in "X hours Y minutes" format
 *   - If executionStart exists: Returns full datetime in locale format (e.g., "09/10/2025, 18:00")
 */
export function calculateExpectedEndTime(plan: ReceivePlan): string {
  // Calculate planned duration in milliseconds
  const plannedDuration =
    new Date(plan.plannedEnd).getTime() - new Date(plan.plannedStart).getTime();

  // If executionStart is null, show duration format
  if (!plan.executionStart) {
    const hours = Math.floor(plannedDuration / (1000 * 60 * 60));
    const minutes = Math.floor((plannedDuration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours ${minutes} minutes`;
  }

  // Calculate expected end time: executionStart + planned duration
  const expectedEnd = new Date(plan.executionStart).getTime() + plannedDuration;

  // Return full datetime in locale format
  return new Date(expectedEnd).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

