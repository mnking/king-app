import type {
  DestuffingHblSelections,
  DestuffingPlan,
  DestuffingPlanContainer,
  DestuffingSelectedHbl,
  UnplannedDestuffingContainer,
} from '../types';
import type { BookingOrderHBL } from '@/features/booking-orders/types';

type RawPlanContainer = DestuffingPlanContainer & {
  hbls?: RawPlanContainerHbl[];
  selectedHbls?: RawPlanContainerHbl[];
};

type RawPlanContainerHbl = Partial<DestuffingSelectedHbl> & {
  id?: string | null;
  hblNo?: string | null;
  orderContainerHblId?: string | null;
  orderContainerHbl?: {
    hblId?: string | null;
    hblNo?: string | null;
    summary?: { packingListNo?: string | null } | null;
  } | null;
  summary?: { packingListNo?: string | null } | null;
};

const normalizePlanContainerHbl = (
  raw: RawPlanContainerHbl | undefined,
): DestuffingSelectedHbl | null => {
  if (!raw) return null;

  const hblId =
    raw.hblId ??
    raw.orderContainerHbl?.hblId ??
    raw.orderContainerHblId ??
    raw.id ??
    null;

  if (!hblId) {
    return null;
  }

  const hblCode = raw.hblCode ?? raw.hblNo ?? raw.orderContainerHbl?.hblNo ?? hblId;
  const packingListNo =
    raw.packingListNo ??
    raw.summary?.packingListNo ??
    raw.orderContainerHbl?.summary?.packingListNo ??
    null;

  return {
    hblId,
    hblCode,
    packingListNo: packingListNo ?? null,
  };
};

const mapWorkingStatus = (
  statusOrWorkingStatus?: string | null,
): ContainerWorkingStatus | undefined => {
  switch (statusOrWorkingStatus) {
    case 'WAITING':
    case 'waiting':
      return 'waiting';
    case 'IN_PROGRESS':
    case 'in-progress':
      return 'in-progress';
    case 'DONE':
    case 'done':
      return 'done';
    case 'ON_HOLD':
    case 'on-hold':
      return 'on-hold';
    default:
      return undefined;
  }
};

const mapOrderContainerHbls = (
  hbls: BookingOrderHBL[] | undefined,
): DestuffingSelectedHbl[] =>
  (hbls ?? [])
    .map((hbl) => {
      if (!hbl.hblId && !hbl.hblNo) return null;
      return {
        hblId: hbl.hblId ?? hbl.hblNo,
        hblCode: hbl.hblNo ?? hbl.hblId,
        packingListNo: hbl.summary?.packingListNo ?? null,
      };
    })
    .filter((item): item is DestuffingSelectedHbl => Boolean(item));

export const normalizeDestuffingPlan = (plan: DestuffingPlan): DestuffingPlan => ({
  ...plan,
  planType: 'DESTUFFING',
  containers: (plan.containers ?? []).map((container) => ({
    ...container,
    workingStatus:
      mapWorkingStatus(container.status) ??
      mapWorkingStatus(container.workingStatus) ??
      container.workingStatus,
  })),
});

export const getPlanContainerSelectedHbls = (
  container: DestuffingPlanContainer,
): DestuffingSelectedHbl[] => {
  const summarySelections = container.summary?.selectedHbls;
  if (summarySelections?.length) {
    return summarySelections;
  }

  const rawSelections =
    (container as RawPlanContainer).selectedHbls ??
    (container as RawPlanContainer).hbls ??
    [];

  const normalized = rawSelections
    .map((hbl) => normalizePlanContainerHbl(hbl))
    .filter((selection): selection is DestuffingSelectedHbl => Boolean(selection));

  if (normalized.length > 0) {
    return normalized;
  }

  // Fallback: use order container HBLs when plan container selections are absent
  return mapOrderContainerHbls(container.orderContainer?.hbls);
};

export const getPlanForwarderKey = (plan: DestuffingPlan): string | null =>
  plan.forwarderId ??
  plan.forwarder?.id ??
  plan.forwarder?.code ??
  plan.forwarder?.name ??
  plan.forwarderName ??
  null;

export const formatForwarderLabel = (
  name?: string | null,
  code?: string | null,
): string | null => {
  if (name && code) {
    return `${name} (${code})`;
  }
  return name ?? code ?? null;
};

export const getPlanForwarderLabel = (plan: DestuffingPlan): string | null =>
  formatForwarderLabel(plan.forwarderName, plan.forwarder?.code) ??
  formatForwarderLabel(plan.forwarder?.name, plan.forwarder?.code) ??
  plan.forwarderName ??
  plan.forwarder?.name ??
  plan.forwarder?.code ??
  null;

export const mapPlanContainersToUnplanned = (
  plan: DestuffingPlan,
): UnplannedDestuffingContainer[] => {
  const normalizedPlan = normalizeDestuffingPlan(plan);
  const { containers = [] } = normalizedPlan;
  const forwarderId = getPlanForwarderKey(plan);
  return containers.map((container) => {
    const orderContainer = container.orderContainer;
    return {
      ...orderContainer,
      id: container.orderContainerId ?? orderContainer.id,
      planContainerId: container.id,
      planId: plan.id,
      forwarderId: plan.forwarderId ?? orderContainer.bookingOrder?.agentId ?? forwarderId,
      forwarderName:
        plan.forwarderName ??
        plan.forwarder?.name ??
        plan.forwarder?.code ??
        orderContainer.bookingOrder?.agentCode ??
        null,
      priorityScore: null,
      lastDestuffedAt: null,
    } as UnplannedDestuffingContainer;
  });
};

export const extractPlanHblSelections = (
  plan: DestuffingPlan,
): DestuffingHblSelections => {
  const selections: DestuffingHblSelections = {};
  (plan.containers ?? []).forEach((container: DestuffingPlanContainer) => {
    const orderContainerId = container.orderContainerId ?? container.orderContainer.id;
    selections[orderContainerId] = getPlanContainerSelectedHbls(container);
  });
  return selections;
};
