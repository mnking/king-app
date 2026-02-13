import { describe, it, expect } from 'vitest';
import type { EnrichedReceivePlan } from '../../hooks/use-plans-query';
import {
  getPendingComparableDate,
  reorderPendingPlanContainers,
  sortPendingPlansByRecency,
} from '../pending-plan-helpers';

const buildPlan = (
  overrides: Partial<EnrichedReceivePlan> = {},
): EnrichedReceivePlan => ({
  id: overrides.id ?? 'plan-1',
  code: overrides.code ?? 'PLAN-1',
  status: 'PENDING',
  plannedStart: '2024-11-01T08:00:00Z',
  plannedEnd: '2024-11-01T17:00:00Z',
  executionStart: '2024-11-01T08:30:00Z',
  executionEnd: overrides.executionEnd ?? '2024-11-01T18:00:00Z',
  pendingDate: overrides.pendingDate ?? '2024-11-02T09:00:00Z',
  equipmentBooked: true,
  portNotified: true,
  createdAt: overrides.createdAt ?? '2024-10-31T10:00:00Z',
  updatedAt: overrides.updatedAt ?? '2024-11-02T08:00:00Z',
  containers:
    overrides.containers ??
    [
      {
        id: 'container-1',
        planId: 'plan-1',
        orderContainerId: 'order-container-1',
        assignedAt: '2024-11-01T08:00:00Z',
        unassignedAt: null,
        status: 'WAITING',
        truckNo: null,
        receivedAt: null,
        rejectedAt: null,
        receivedType: 'NORMAL',
        completed: false,
        notes: null,
        orderContainer: {
          id: 'order-container-1',
          orderId: 'order-1',
          containerId: 'container-1',
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          yardFreeFrom: null,
          yardFreeTo: null,
          extractFrom: null,
          extractTo: null,
          isPriority: false,
          mblNumber: 'MBL123',
          customsStatus: 'PENDING',
          cargoReleaseStatus: 'PENDING',
          summary: { typeCode: '40HC' },
          hbls: [],
          bookingOrder: {
            id: 'order-1',
            code: 'ORD-1',
            agentCode: null,
            eta: '2024-11-01T00:00:00Z',
            vesselCode: null,
            voyage: 'VN001',
          },
          enrichedHbls: [],
          atYard: false,
        },
      },
      {
        id: 'container-2',
        planId: 'plan-1',
        orderContainerId: 'order-container-2',
        assignedAt: '2024-11-01T08:00:00Z',
        unassignedAt: null,
        status: 'REJECTED',
        truckNo: null,
        receivedAt: null,
        rejectedAt: '2024-11-01T10:00:00Z',
        receivedType: 'NORMAL',
        completed: false,
        notes: null,
        orderContainer: {
          id: 'order-container-2',
          orderId: 'order-2',
          containerId: 'container-2',
          containerNo: 'MSCU7654321',
          sealNumber: 'SEAL456',
          yardFreeFrom: null,
          yardFreeTo: null,
          extractFrom: null,
          extractTo: null,
          isPriority: false,
          mblNumber: 'MBL456',
          customsStatus: 'PENDING',
          cargoReleaseStatus: 'PENDING',
          summary: { typeCode: '20GP' },
          hbls: [],
          bookingOrder: {
            id: 'order-2',
            code: 'ORD-2',
            agentCode: null,
            eta: '2024-11-01T00:00:00Z',
            vesselCode: null,
            voyage: 'VN001',
          },
          enrichedHbls: [],
          atYard: false,
        },
      },
    ],
  ...overrides,
});

describe('pending-plan-helpers', () => {
  it('derives comparable date using pending date first', () => {
    const plan = buildPlan({ pendingDate: '2024-11-03T09:00:00Z' });
    expect(getPendingComparableDate(plan)).toBe('2024-11-03T09:00:00Z');
  });

  it('falls back to execution end when pending date missing', () => {
    const plan = buildPlan({ pendingDate: null, executionEnd: '2024-11-02T15:00:00Z' });
    expect(getPendingComparableDate(plan)).toBe('2024-11-02T15:00:00Z');
  });

  it('sorts plans by most recent comparable timestamp', () => {
    const older = buildPlan({ id: 'plan-older', pendingDate: '2024-11-02T09:00:00Z' });
    const newer = buildPlan({ id: 'plan-newer', pendingDate: '2024-11-05T09:00:00Z' });
    const sorted = sortPendingPlansByRecency([older, newer]);
    expect(sorted.map((plan) => plan.id)).toEqual(['plan-newer', 'plan-older']);
  });

  it('reorders containers so rejected entries appear first', () => {
    const plan = buildPlan();
    const reordered = reorderPendingPlanContainers(plan.containers);
    expect(reordered[0].status).toBe('REJECTED');
  });
});

