import { describe, it, expect } from 'vitest';
import { processLifecycle } from './lifecycleUtils';
import { ContainerTransaction } from '@/features/containers/types';

// Mock helper
const createTxn = (id: string, status: string, eventType: string, timeOffsetMinutes: number): ContainerTransaction => {
  const baseTime = new Date('2024-01-01T10:00:00Z');
  const timestamp = new Date(baseTime.getTime() + timeOffsetMinutes * 60000).toISOString();
  return {
    id,
    status,
    eventType,
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    containerId: 'c1',
    cycleId: 'cycle1'
  } as ContainerTransaction;
};

describe('processLifecycle', () => {
  it('should handle empty transactions', () => {
    const result = processLifecycle([]);
    expect(result.stages).toEqual([]);
    expect(result.transitions).toEqual([]);
    expect(result.currentStage).toBeNull();
  });

  it('should group transactions by status and order by first appearance', () => {
    const txns = [
      createTxn('1', 'GATE_IN', 'GATE_IN', 0),
      createTxn('2', 'YARD', 'MOVE', 10),
      createTxn('3', 'YARD', 'CHECK', 20),
      createTxn('4', 'GATE_OUT', 'GATE_OUT', 30),
    ];

    const { stages, transitions } = processLifecycle(txns);

    expect(stages).toHaveLength(3);
    expect(stages[0].status).toBe('GATE_IN');
    expect(stages[1].status).toBe('YARD');
    expect(stages[2].status).toBe('GATE_OUT');

    // Check grouping
    expect(stages[1].transactions).toHaveLength(2); // MOVE and CHECK

    // Check transitions
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toMatchObject({ fromStatus: 'GATE_IN', toStatus: 'YARD', isBackward: false });
    expect(transitions[1]).toMatchObject({ fromStatus: 'YARD', toStatus: 'GATE_OUT', isBackward: false });
  });

  it('should detect backward transitions (loops)', () => {
    const txns = [
      createTxn('1', 'YARD', 'ENTER', 0),
      createTxn('2', 'CFS', 'PROCESS', 10),
      createTxn('3', 'YARD', 'RETURN', 20), // Back to YARD
    ];

    const { stages, transitions, currentStage } = processLifecycle(txns);

    // Should only have 2 unique stages
    expect(stages).toHaveLength(2);
    expect(stages[0].status).toBe('YARD');
    expect(stages[1].status).toBe('CFS');

    // YARD should have 2 transactions (RETURN and ENTER) - Sorted Descending
    expect(stages[0].transactions).toHaveLength(2);
    expect(stages[0].transactions[0].eventType).toBe('RETURN');
    expect(stages[0].transactions[1].eventType).toBe('ENTER');

    // Transitions
    expect(transitions).toHaveLength(2);
    // YARD -> CFS (Forward)
    expect(transitions[0]).toMatchObject({ fromStatus: 'YARD', toStatus: 'CFS', isBackward: false });
    // CFS -> YARD (Backward)
    expect(transitions[1]).toMatchObject({ fromStatus: 'CFS', toStatus: 'YARD', isBackward: true });

    // Current stage should be YARD (the last one)
    expect(currentStage?.status).toBe('YARD');
  });

  it('should ignore transactions without status', () => {
    const txns = [

      createTxn('1', '', 'BAD', 0),
      createTxn('2', 'OK', 'GOOD', 10),
    ];

    const { stages } = processLifecycle(txns);
    expect(stages).toHaveLength(1);
    expect(stages[0].status).toBe('OK');
  });
  
  it('should sort transactions by time if provided out of order', () => {
      const txns = [
        createTxn('2', 'SECOND', '2', 20),
        createTxn('1', 'FIRST', '1', 10),
      ];
      
      const { stages } = processLifecycle(txns);
      expect(stages.length).toBe(2);
      expect(stages[0].status).toBe('FIRST');
      expect(stages[1].status).toBe('SECOND');
  });
});



describe('processLifecycle with displayStatus', () => {
  it('should use displayStatus for stage labels if provided', () => {
    const txns = [
      { ...createTxn('1', 'IN_CFS', 'ENTER', 0), displayStatus: 'In CFS' },
      { ...createTxn('2', 'YARD', 'MOVE', 10) }, // No displayStatus
    ];

    const { stages } = processLifecycle(txns);
    expect(stages).toHaveLength(2);
    
    // Check IN_CFS stage
    const cfsStage = stages.find(s => s.status === 'IN_CFS');
    expect(cfsStage).toBeDefined();
    expect(cfsStage?.label).toBe('In CFS');

    // Check YARD stage (should fall back to generic)
    const yardStage = stages.find(s => s.status === 'YARD');
    expect(yardStage).toBeDefined();
    expect(yardStage?.label).toBe('YARD');
  });
});
