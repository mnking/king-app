import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnplannedContainers, getPlans } from '@/services/apiCFSPlanning';
import { containersApi } from '@/services/apiContainers';
import type { EnrichedUnplannedContainer, ReceivePlan } from '@/shared/features/plan/types';
import { enrichContainers } from '@/shared/features/plan/utils/enrich-containers';

export type ReceivingContainerRow = EnrichedUnplannedContainer & {
  source: 'UNPLANNED' | 'PLAN';
  planId?: string;
  planCode?: string;
  planStatus?: ReceivePlan['status'];
  planContainerId?: string;
  planContainerStatus?: ReceivePlan['containers'][number]['status'];
  planContainerTruckNo?: string | null;
  planContainerReceivedAt?: string | null;
  planContainerReceivedType?: ReceivePlan['containers'][number]['receivedType'];
  planContainerNotes?: string | null;
  isImportFlow?: boolean;
};

const receivingContainersQueryKeys = {
  all: ['cfs-container-receiving', 'containers'] as const,
};

const RECEIVE_PLAN_STATUSES: Array<ReceivePlan['status']> = [
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
];

async function fetchAllReceivingPlansByStatus(status: ReceivePlan['status']) {
  const itemsPerPage = 50;
  let page = 1;
  const aggregated: ReceivePlan[] = [];
  let totalPages = 1;

  do {
    const response = await getPlans({
      status,
      planType: 'RECEIVING',
      page,
      itemsPerPage,
    });

    const responseAny = response as unknown as Record<string, unknown>;
    const results = (responseAny.results ?? []) as ReceivePlan[];
    const total = typeof responseAny.total === 'number' ? responseAny.total : results.length;
    const responseItemsPerPage =
      typeof responseAny.itemsPerPage === 'number' ? responseAny.itemsPerPage : itemsPerPage;
    totalPages =
      typeof responseAny.totalPages === 'number'
        ? responseAny.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, responseItemsPerPage)));

    aggregated.push(...results);
    page += 1;
  } while (page <= totalPages);

  return aggregated;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function mergeContainerPositionStatuses(containers: EnrichedUnplannedContainer[]) {
  const refs = new Map<string, { key: string; containerId?: string; containerNo?: string }>();
  containers.forEach((container) => {
    if (container.containerId) {
      refs.set(`id:${container.containerId}`, { key: `id:${container.containerId}`, containerId: container.containerId });
      return;
    }
    if (container.containerNo) {
      refs.set(`no:${container.containerNo}`, { key: `no:${container.containerNo}`, containerNo: container.containerNo });
    }
  });
  const uniqueRefs = [...refs.values()];
  if (uniqueRefs.length === 0) return containers;

  const statusPairs = await mapWithConcurrency(
    uniqueRefs,
    8,
    async (
      ref,
    ): Promise<[string, { positionStatus: string | null; isImportFlow?: boolean }]> => {
      try {
        const response = ref.containerId
          ? await containersApi.getById(ref.containerId, { cycle: true })
          : await containersApi.getByNumber(ref.containerNo ?? '', { cycle: true });
        const cycle = response.data?.currentCycle ?? null;

        if (!cycle) return [ref.key, { positionStatus: null }];
        if (String(cycle.operationMode ?? '').toUpperCase() !== 'IMPORT') {
          return [ref.key, { positionStatus: null, isImportFlow: false }];
        }

        const isActive =
          String(cycle.status ?? '').toUpperCase() === 'ACTIVE' ||
          cycle.isActive === true;
        if (!isActive) return [ref.key, { positionStatus: null, isImportFlow: true }];

        return [
          ref.key,
          { positionStatus: cycle.containerStatus ?? null, isImportFlow: true },
        ];
      } catch {
        return [ref.key, { positionStatus: null }];
      }
    },
  );

  const statusMap = new Map(statusPairs);
  return containers.map((container) => {
    const key = container.containerId
      ? `id:${container.containerId}`
      : container.containerNo
        ? `no:${container.containerNo}`
        : null;
    if (!key) return container;
    const cycleState = statusMap.get(key);
    return {
      ...container,
      containerStatus: cycleState?.positionStatus ?? container.containerStatus,
      isImportFlow: cycleState?.isImportFlow,
    };
  });
}

export function useReceivingContainers() {
  return useQuery({
    queryKey: receivingContainersQueryKeys.all,
    queryFn: async (): Promise<ReceivingContainerRow[]> => {
      const [unplannedResponse, ...plansByStatus] = await Promise.all([
        getUnplannedContainers(),
        ...RECEIVE_PLAN_STATUSES.map(fetchAllReceivingPlansByStatus),
      ]);

      const planned = plansByStatus.flat();
      const plannedContainers = planned.flatMap((plan) =>
        (plan.containers ?? []).map((planContainer) => ({
          source: 'PLAN' as const,
          planId: plan.id,
          planCode: plan.code,
          planStatus: plan.status,
          planContainerId: planContainer.id,
          planContainerStatus: planContainer.status,
          planContainerTruckNo: planContainer.truckNo,
          planContainerReceivedAt: planContainer.receivedAt,
          planContainerReceivedType: planContainer.receivedType,
          planContainerNotes: planContainer.notes,
          container: planContainer.orderContainer,
        })),
      );

      const unplannedContainers = (unplannedResponse.data ?? []).map((container) => ({
        source: 'UNPLANNED' as const,
        container,
      }));

      const plannedContainerIds = new Set(
        plannedContainers.map((item) => item.container.id),
      );
      const mergedItems = [
        ...plannedContainers,
        ...unplannedContainers.filter((item) => !plannedContainerIds.has(item.container.id)),
      ];

      const enriched = await enrichContainers(mergedItems.map((item) => item.container));
      const enrichedWithPositionStatuses = await mergeContainerPositionStatuses(enriched);
      const enrichedMap = new Map(enrichedWithPositionStatuses.map((container) => [container.id, container]));

      return mergedItems
        .map((item) => {
          const enrichedContainer = enrichedMap.get(item.container.id);
          if (!enrichedContainer) return null;
          return {
            ...enrichedContainer,
            source: item.source,
            ...(item.source === 'PLAN'
              ? {
                  planId: item.planId,
                  planCode: item.planCode,
                  planStatus: item.planStatus,
                  planContainerId: item.planContainerId,
                  planContainerStatus: item.planContainerStatus,
                  planContainerTruckNo: item.planContainerTruckNo,
                  planContainerReceivedAt: item.planContainerReceivedAt,
                  planContainerReceivedType: item.planContainerReceivedType,
                  planContainerNotes: item.planContainerNotes,
                }
              : {}),
          } satisfies ReceivingContainerRow;
        })
        .filter((value): value is ReceivingContainerRow => value !== null);
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useReceivingContainersQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateReceivingContainers: () =>
      queryClient.invalidateQueries({ queryKey: receivingContainersQueryKeys.all }),
    refetchReceivingContainers: () =>
      queryClient.refetchQueries({ queryKey: receivingContainersQueryKeys.all }),
  };
}
