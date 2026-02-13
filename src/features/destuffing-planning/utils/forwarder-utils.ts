import type { UnplannedDestuffingContainer } from '../types';

export const getForwarderIdentifier = (
  container: UnplannedDestuffingContainer,
): string =>
  container.forwarderId ??
  container.bookingOrder?.agentId ??
  container.bookingOrder?.agentCode ??
  container.forwarderName ??
  container.id;

export const shareSameForwarder = (
  containers: UnplannedDestuffingContainer[],
): boolean => {
  if (containers.length <= 1) return true;
  const baseline = getForwarderIdentifier(containers[0]);
  return containers.every((container) => getForwarderIdentifier(container) === baseline);
};
