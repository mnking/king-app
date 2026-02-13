import type {
  ContainerWorkingStatus,
  DestuffingPlan,
  DestuffingPlanContainer,
} from '../types';

const getContainerBypassFlag = (container: DestuffingPlanContainer): boolean =>
  container.bypassStorageFlag ?? false;

const mapWorkingStatus = (status?: string | null): ContainerWorkingStatus | undefined => {
  switch (status) {
    case 'WAITING':
      return 'waiting';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'DONE':
      return 'done';
    case 'ON_HOLD':
      return 'on-hold';
    default:
      return undefined;
  }
};

export const normalizeDestuffingPlan = (plan: DestuffingPlan): DestuffingPlan => ({
  ...plan,
  planType: 'DESTUFFING',
  containers: (plan.containers ?? []).map((container) => ({
    ...container,
    workingStatus: container.workingStatus ?? mapWorkingStatus(container.status),
    bypassStorageFlag: getContainerBypassFlag(container),
  })),
});
