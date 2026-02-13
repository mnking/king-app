import { useMemo } from 'react';
import { ContainerTransaction } from '@/features/containers/types';
import { processLifecycle, LifecycleData } from '@/features/containers/utils/lifecycleUtils';

export const useContainerLifecycle = (transactions: ContainerTransaction[]): LifecycleData => {
  const lifecycleData = useMemo(() => {
    return processLifecycle(transactions);
  }, [transactions]);

  return lifecycleData;
};
