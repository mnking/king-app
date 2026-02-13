import { describe, it, expect } from 'vitest';
import {
  calculateExecutionSummary,
  getNotePreview,
  shouldEnableDone,
  shouldEnablePending,
  partitionContainers,
} from '../plan-execution-helpers';
import type { ExecutionPlan } from '../../hooks/use-plan-execution';

const createContainer = (
  overrides: Partial<ExecutionPlan['containers'][number]> = {},
): ExecutionPlan['containers'][number] => ({
  id: `pc-${Math.random().toString(16).slice(2)}`,
  planId: 'plan-1',
  orderContainerId: `oc-${Math.random().toString(16).slice(2)}`,
  assignedAt: new Date().toISOString(),
  unassignedAt: null,
  status: 'WAITING',
  truckNo: null,
  receivedAt: null,
  rejectedAt: null,
  receivedType: 'NORMAL',
  completed: false,
  notes: null,
  lastActionUser: null,
  lastActionAt: null,
  summary: null,
  rejectDetails: null,
  orderContainer: {
    id: `oc-${Math.random().toString(16).slice(2)}`,
    containerNo: 'CONT001',
    sealNumber: 'SEAL001',
    isPriority: false,
    summary: {
      typeCode: '40HC',
    },
    hbls: [],
    bookingOrderId: 'bo-1',
    orderId: 'bo-1',
    orderCode: 'ORD001',
    mblNumber: 'MBL001',
    hblNumber: 'HBL001',
    extractTo: new Date().toISOString(),
    yardFreeTo: new Date().toISOString(),
    customsStatus: 'PENDING',
    cargoReleaseStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  ...overrides,
});

describe('plan-execution-helpers', () => {
  it('partitions containers into waiting and processed collections', () => {
    const waiting = createContainer({ status: 'WAITING' });
    const deferred = createContainer({ status: 'DEFERRED' });
    const received = createContainer({ status: 'RECEIVED' });
    const rejected = createContainer({ status: 'REJECTED' });

    const result = partitionContainers([waiting, deferred, received, rejected]);

    expect(result.waiting).toHaveLength(2);
    expect(result.processed).toHaveLength(2);
    expect(result.waiting.map((c) => c.status)).toEqual(['WAITING', 'DEFERRED']);
  });

  it('calculates execution summary counts', () => {
    const containers: ExecutionPlan['containers'] = [
      createContainer({ status: 'WAITING' }),
      createContainer({ status: 'DEFERRED' }),
      createContainer({ status: 'RECEIVED' }),
      createContainer({
        status: 'RECEIVED',
        receivedType: 'PROBLEM',
        notes: 'Damaged',
        summary: {
          problem: {
            problemTimestamp: new Date().toISOString(),
            documents: [],
            photos: [],
          },
        },
      }),
      createContainer({
        status: 'RECEIVED',
        receivedType: 'ADJUSTED_DOCUMENT',
        notes: 'Adjusted',
        summary: {
          adjustedDocument: {
            adjustedDocTimestamp: new Date().toISOString(),
            documents: [],
            photos: [],
          },
        },
      }),
      createContainer({ status: 'REJECTED' }),
    ];

    const summary = calculateExecutionSummary(containers);

    expect(summary.total).toBe(6);
    expect(summary.waiting).toBe(1);
    expect(summary.deferred).toBe(1);
    expect(summary.received).toBe(3);
    expect(summary.rejected).toBe(1);
    expect(summary.problem).toBe(1);
    expect(summary.adjusted).toBe(1);
  });

  it('generates note previews with trimming', () => {
    expect(getNotePreview('Short note')).toBe('Short note');
    const longNote = 'x'.repeat(90);
    expect(getNotePreview(longNote)).toMatch(/…$/);
    expect(getNotePreview()).toBe('');
  });

  it('computes completion button states', () => {
    const summary = {
      total: 4,
      waiting: 0,
      received: 3,
      rejected: 1,
      deferred: 0,
      problem: 1,
      adjusted: 0,
    };

    expect(shouldEnableDone(summary)).toBe(false);
    expect(shouldEnablePending(summary)).toBe(true);

    const allReceived = {
      ...summary,
      rejected: 0,
      deferred: 0,
    };

    expect(shouldEnableDone(allReceived)).toBe(true);
    expect(shouldEnablePending(allReceived)).toBe(false);
  });

  it('enables pending when deferred containers exist', () => {
    const summary = {
      total: 2,
      waiting: 0,
      received: 1,
      rejected: 0,
      deferred: 1,
      problem: 0,
      adjusted: 0,
    };

    expect(shouldEnableDone(summary)).toBe(false);
    expect(shouldEnablePending(summary)).toBe(true);
  });
});
