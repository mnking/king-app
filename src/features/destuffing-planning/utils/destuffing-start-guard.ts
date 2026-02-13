import type { DestuffingPlan } from '../types';
import { CARGO_RELEASE_STATUS } from '@/shared/constants/container-status';

const MAX_LISTED_CONTAINERS = 8;

const toContainerLabel = (
  container: DestuffingPlan['containers'][number],
): string => {
  const containerNo = container.orderContainer?.containerNo?.trim();
  if (containerNo) {
    return containerNo;
  }
  return `Unknown (${container.orderContainerId ?? container.id})`;
};

export const getBlockedDestuffingContainerLabels = (
  plan: DestuffingPlan | null | undefined,
): string[] => {
  if (!plan) return [];

  const labels = (plan.containers ?? [])
    .filter(
      (container) =>
        container.orderContainer?.allowStuffingOrDestuffing !== true,
    )
    .map(toContainerLabel);

  return [...new Set(labels)];
};

const toNormalizedStatus = (value?: string | null): string | null => {
  if (!value) return null;
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
};

export const getCargoReleaseBlockedContainerLabels = (
  plan: DestuffingPlan | null | undefined,
): string[] => {
  if (!plan) return [];

  const labels = (plan.containers ?? [])
    .filter((container) => {
      const cargoReleaseStatus = container.orderContainer?.cargoReleaseStatus;
      return toNormalizedStatus(cargoReleaseStatus) !== CARGO_RELEASE_STATUS.APPROVED;
    })
    .map(toContainerLabel);

  return [...new Set(labels)];
};

export const formatBlockedDestuffingContainerList = (labels: string[]): string => {
  if (labels.length <= MAX_LISTED_CONTAINERS) {
    return labels.join(', ');
  }

  const shown = labels.slice(0, MAX_LISTED_CONTAINERS);
  const remaining = labels.length - shown.length;
  return `${shown.join(', ')} (+${remaining} more)`;
};

export const buildDestuffingNotAllowedMessage = (labels: string[]): string =>
  `Cannot mark doing. allowStuffingOrDestuffing is disabled for: ${formatBlockedDestuffingContainerList(labels)}.`;

export const buildDestuffingNotAllowedHint = (labels: string[]): string =>
  `Please request F.O to allow destuffing for container: ${formatBlockedDestuffingContainerList(labels)}.`;

export const buildCargoReleaseNotAllowedMessage = (labels: string[]): string =>
  `Cannot mark doing. cargoReleaseStatus is not APPROVED for: ${formatBlockedDestuffingContainerList(labels)}.`;

export const buildCargoReleaseNotAllowedHint = (labels: string[]): string =>
  `Please approve cargo release for container: ${formatBlockedDestuffingContainerList(labels)}.`;
