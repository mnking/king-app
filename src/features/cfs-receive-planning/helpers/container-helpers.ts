import type { EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import type { EnrichedReceivePlan } from '../hooks/use-plans-query';

/**
 * Merge unplanned containers with plan's containers for edit mode
 * Returns a deduplicated list of all available containers
 *
 * @param unplannedContainers - Containers not assigned to any plan
 * @param planContainers - Containers currently in the plan
 * @returns Merged and deduplicated list of containers
 */
export const mergeContainersForEdit = (
  unplannedContainers: EnrichedUnplannedContainer[],
  planContainers: EnrichedReceivePlan['containers']
): EnrichedUnplannedContainer[] => {
  // Extract orderContainer from plan's containers
  const planOrderContainers = planContainers.map((pc) => pc.orderContainer);

  // Create a map to deduplicate by container ID
  const containerMap = new Map<string, EnrichedUnplannedContainer>();

  // Add plan's containers first (these take priority)
  planOrderContainers.forEach((container) => {
    containerMap.set(container.id, container);
  });

  // Add unplanned containers (won't overwrite plan's containers)
  unplannedContainers.forEach((container) => {
    if (!containerMap.has(container.id)) {
      containerMap.set(container.id, container);
    }
  });

  return Array.from(containerMap.values());
};

