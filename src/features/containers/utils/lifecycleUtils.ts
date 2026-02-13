import { ContainerTransaction } from '@/features/containers/types';

export type StageKey = string;

export interface LifecycleStage {
  status: StageKey;
  label: string;
  transactions: ContainerTransaction[];
  isCurrent: boolean;
  firstSeenIndex: number; // For stable ordering
}

export interface LifecycleTransition {
  fromStatus: StageKey;
  toStatus: StageKey;
  eventType: string;
  timestamp?: string;
  isBackward: boolean;
}

export interface LifecycleData {
  stages: LifecycleStage[];
  transitions: LifecycleTransition[];
  currentStage: LifecycleStage | null;
}

 
 


 
const sortTransactions = (transactions: ContainerTransaction[]): ContainerTransaction[] => {
  return [...transactions].sort((a, b) => {
    const timeA = new Date(a.timestamp ?? a.createdAt).getTime();
    const timeB = new Date(b.timestamp ?? b.createdAt).getTime();
    return timeA - timeB;
  });
};

export const processLifecycle = (rawTransactions: ContainerTransaction[]): LifecycleData => {
  if (!rawTransactions || rawTransactions.length === 0) {
    return { stages: [], transitions: [], currentStage: null };
  }

  const sortedTxns = sortTransactions(rawTransactions);
  const stageMap = new Map<StageKey, LifecycleStage>();
  const visitedOrder: StageKey[] = [];
  const transitions: LifecycleTransition[] = [];

  let previousStatus: StageKey | null = null;
  
  // Step 1: Group transactions into stages
  sortedTxns.forEach((txn, index) => {
    const status = txn.status?.trim().toUpperCase();
    
    // Skip transactions without status as they can't be placed in a stage
    if (!status) return;

    if (!stageMap.has(status)) {
      stageMap.set(status, {
        status,
        label: txn.displayStatus || status,
        transactions: [],
        isCurrent: false,
        firstSeenIndex: index, // Captures the "First Appearance" logic
      });
      visitedOrder.push(status);
    }

    const stage = stageMap.get(status)!;
    stage.transactions.push(txn);

    // Step 2: Identify Transitions
    if (previousStatus && previousStatus !== status) {
      // Determine direction
      const fromIndex = visitedOrder.indexOf(previousStatus);
      const toIndex = visitedOrder.indexOf(status);
  
      const isBackward = toIndex < fromIndex;

      transitions.push({
        fromStatus: previousStatus,
        toStatus: status,
        eventType: txn.eventType ?? 'Transition',
        timestamp: txn.timestamp ?? txn.createdAt,
        isBackward,
      });
    }

    previousStatus = status;
  });

  // Convert map to array, respecting the visitedOrder (First Appearance)
  const stages = visitedOrder.map(key => {
    const stage = stageMap.get(key)!;
    // Sort transactions descending (Newest first) for UI display
    stage.transactions.sort((a, b) => {
      const timeA = new Date(a.timestamp ?? a.createdAt).getTime();
      const timeB = new Date(b.timestamp ?? b.createdAt).getTime();
      return timeB - timeA;
    });
    return stage;
  });

  // Mark current stage: the stage containing the LATEST transaction (by timestamp)
  let currentStage: LifecycleStage | null = null;
  if (stages.length > 0) {
    // Find the transaction with the latest timestamp across ALL transactions
    let latestTimestamp = -Infinity;
    let latestStageStatus: StageKey | null = null;

    stages.forEach(stage => {
      stage.transactions.forEach(txn => {
        const txnTime = new Date(txn.timestamp ?? txn.createdAt).getTime();
        if (txnTime > latestTimestamp) {
          latestTimestamp = txnTime;
          latestStageStatus = stage.status;
        }
      });
    });

    // Mark the stage with the latest transaction as current
    if (latestStageStatus && stageMap.has(latestStageStatus)) {
      currentStage = stageMap.get(latestStageStatus)!;
      currentStage.isCurrent = true;
    }
  }

  return {
    stages,
    transitions,
    currentStage,
  };
};
