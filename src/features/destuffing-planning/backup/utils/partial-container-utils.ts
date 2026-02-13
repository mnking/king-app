import type { PartialDestuffingContainer } from '../../types';

type PartialContainerHbl = {
  hblId?: string | null;
};

const filterHbls = (
  hbls: PartialContainerHbl[] | null | undefined,
  excludedIds: Set<string>,
): PartialContainerHbl[] | null | undefined =>
  hbls?.filter((hbl) => hbl?.hblId && !excludedIds.has(hbl.hblId)) ?? hbls;

export const filterPartialContainersByPlannedHbls = (
  containers: PartialDestuffingContainer[],
  excludedHblIds: string[] | Set<string>,
): PartialDestuffingContainer[] => {
  const excludedSet = Array.isArray(excludedHblIds)
    ? new Set(excludedHblIds.filter(Boolean))
    : excludedHblIds;

  return containers
    .map((container) => {
      const nextOrderHbls = filterHbls(container.orderContainer?.hbls, excludedSet);
      const nextHbls = filterHbls(container.hbls, excludedSet);
      const hblCount = (nextOrderHbls?.length ?? 0) + (nextHbls?.length ?? 0);

      if (hblCount === 0) {
        return null;
      }

      return {
        ...container,
        orderContainer: container.orderContainer
          ? {
              ...container.orderContainer,
              hbls: nextOrderHbls,
            }
          : container.orderContainer,
        hbls: nextHbls,
      };
    })
    .filter((container): container is PartialDestuffingContainer => Boolean(container));
};
