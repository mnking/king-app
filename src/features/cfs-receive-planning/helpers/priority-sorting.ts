import type { UnplannedContainer } from '@/shared/features/plan/types';

// ===========================
// Helper Functions
// ===========================

/**
 * Calculate days from today until a given date
 * @param dateString - ISO date string
 * @returns Number of days (negative if past, positive if future)
 */
export const calculateDaysUntil = (dateString: string | null): number => {
  if (!dateString) return Infinity; // Treat null dates as far future (low urgency)

  const targetDate = new Date(dateString);
  const today = new Date();

  // Reset time portion for accurate day calculation
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// ===========================
// Priority Scoring Algorithm
// ===========================

/**
 * Calculate priority score for an unplanned container
 *
 * Scoring Factors (in priority order):
 * 1. Cargo release status (APPROVED = highest)
 * 2. Customs status (HAS_CCP > PENDING_APPROVAL > REGISTERED > others)
 * 3. Extraction deadline urgency (sooner = higher)
 * 4. Free storage deadline urgency (sooner = higher)
 * 5. isPriority flag
 * 6. At yard status (ready for processing)
 * 7. Discharge time (arrival date)
 *
 * @param container - Unplanned container to score
 * @returns Numeric score (higher = more urgent)
 */
export const calculateContainerPriority = (container: UnplannedContainer): number => {
  let score = 0;

  // 1. Cargo Release Status (highest priority factor)
  if (container.cargoReleaseStatus === 'APPROVED') {
    score += 1000;
  } else if (container.cargoReleaseStatus === 'REQUESTED') {
    score += 500;
  }
  // NOT_REQUESTED = 0 points

  // 2. Customs Status
  if (container.customsStatus === 'HAS_CCP') {
    score += 800;
  } else if (container.customsStatus === 'PENDING_APPROVAL') {
    score += 400;
  } else if (container.customsStatus === 'REGISTERED') {
    score += 200;
  }
  // NOT_REGISTERED = 0 points, REJECTED = 0 points

  // 3. Extraction Deadline Urgency (inverse days remaining)
  // Closer deadlines get higher scores
  const daysToExtraction = calculateDaysUntil(container.extractTo);
  if (daysToExtraction !== Infinity) {
    // Cap at 100 days to prevent extreme scores
    const extractionUrgency = 100 - Math.min(daysToExtraction, 100);
    score += Math.max(extractionUrgency, 0); // 0-100 points
  }

  // 4. Free Storage Deadline Urgency
  const daysToFreeStorage = calculateDaysUntil(container.yardFreeTo);
  if (daysToFreeStorage !== Infinity) {
    // Cap at 50 days (lower weight than extraction deadline)
    const freeStorageUrgency = 50 - Math.min(daysToFreeStorage, 50);
    score += Math.max(freeStorageUrgency, 0); // 0-50 points
  }

  // 5. Priority Flag (manual override)
  if (container.isPriority) {
    score += 300;
  }

  // 6. At Yard Status (ready for immediate processing)
  // Note: This field may not exist in the API yet, so we'll check safely
  const atYard = (container as any).atYard;
  if (atYard === true) {
    score += 100;
  }

  // 7. Discharge Time / ETA (implicit in booking order)
  // Note: Not currently used in scoring, but can be added if needed

  return score;
};

// ===========================
// Sorting Function
// ===========================

/**
 * Sort unplanned containers by priority score (highest first)
 *
 * @param containers - Array of unplanned containers
 * @returns Sorted array (descending by priority score)
 */
export const sortUnplannedContainers = (
  containers: UnplannedContainer[],
): UnplannedContainer[] => {
  return [...containers].sort((a, b) => {
    const scoreA = calculateContainerPriority(a);
    const scoreB = calculateContainerPriority(b);

    // Sort descending (highest priority first)
    return scoreB - scoreA;
  });
};

