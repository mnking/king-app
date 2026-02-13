import { useMemo } from 'react';
import type { Forwarder } from '@/features/forwarder/types';
import type { ForwarderLookup } from '../types';

export const useForwarderLookup = (forwarders: Forwarder[]): ForwarderLookup => {
  const forwarderMap = useMemo(
    () =>
      forwarders.reduce<Record<string, Forwarder>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [forwarders],
  );

  const getForwarderDisplay = (issuerId: string) => {
    const forwarder = forwarderMap[issuerId];
    if (!forwarder) return issuerId;
    return `${forwarder.code} — ${forwarder.name}`;
  };

  const getForwarder = (issuerId: string) => forwarderMap[issuerId];

  return { getForwarderDisplay, getForwarder };
};
