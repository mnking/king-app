import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReceivePlan } from '@/shared/features/plan/types';
import { checkTimeOverlap, timesOverlap, validatePlanTimes } from '../plan-validation';

const buildPlan = (overrides: Partial<ReceivePlan>): ReceivePlan =>
  ({
    id: 'plan-1',
    code: 'PLAN-1',
    status: 'SCHEDULED',
    plannedStart: '2024-11-15T08:00:00Z',
    plannedEnd: '2024-11-15T12:00:00Z',
    executionStart: null,
    executionEnd: null,
    equipmentBooked: false,
    portNotified: false,
    containers: [],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
    ...overrides,
  }) as ReceivePlan;

describe('cfs-receive-planning plan-validation', () => {
  describe('timesOverlap', () => {
    it('treats boundary-touch as overlap', () => {
      expect(
        timesOverlap(
          '2024-11-15T08:00:00Z',
          '2024-11-15T10:00:00Z',
          '2024-11-15T10:00:00Z',
          '2024-11-15T12:00:00Z',
        ),
      ).toBe(true);
    });
  });

  describe('checkTimeOverlap', () => {
    it('ignores DONE and PENDING plans', () => {
      const result = checkTimeOverlap(
        { plannedStart: '2024-11-15T10:00:00Z', plannedEnd: '2024-11-15T11:00:00Z' },
        [
          buildPlan({
            id: 'done-1',
            status: 'DONE',
            plannedStart: '2024-11-15T08:00:00Z',
            plannedEnd: '2024-11-15T12:00:00Z',
          }),
          buildPlan({
            id: 'pending-1',
            status: 'PENDING',
            plannedStart: '2024-11-15T08:00:00Z',
            plannedEnd: '2024-11-15T12:00:00Z',
          }),
        ],
      );

      expect(result).toBeNull();
    });

    it('detects overlap against SCHEDULED plans (touch counts)', () => {
      const result = checkTimeOverlap(
        { plannedStart: '2024-11-15T12:00:00Z', plannedEnd: '2024-11-15T14:00:00Z' },
        [
          buildPlan({
            id: 'scheduled-1',
            code: 'PLAN-A',
            status: 'SCHEDULED',
            plannedStart: '2024-11-15T08:00:00Z',
            plannedEnd: '2024-11-15T12:00:00Z',
          }),
        ],
      );

      expect(result).toBe('Plan time overlaps with existing plan PLAN-A');
    });

    it('uses executionStart for IN_PROGRESS plan start time and shifts end by estimated duration', () => {
      const result = checkTimeOverlap(
        // This range overlaps only when IN_PROGRESS end is computed as:
        // executionStart + (plannedEnd - plannedStart) = 10:00 + (12:00 - 08:00) = 14:00
        { plannedStart: '2024-11-15T12:30:00Z', plannedEnd: '2024-11-15T13:30:00Z' },
        [
          buildPlan({
            id: 'in-progress-1',
            code: 'PLAN-IP',
            status: 'IN_PROGRESS',
            executionStart: '2024-11-15T10:00:00Z',
            plannedStart: '2024-11-15T08:00:00Z',
            plannedEnd: '2024-11-15T12:00:00Z',
          }),
        ],
      );

      expect(result).toBe('Plan time overlaps with existing plan PLAN-IP');
    });

    it('blocks validation when an IN_PROGRESS plan is missing executionStart', () => {
      const result = checkTimeOverlap(
        { plannedStart: '2024-11-15T18:00:00Z', plannedEnd: '2024-11-15T19:00:00Z' },
        [
          buildPlan({
            id: 'in-progress-1',
            status: 'IN_PROGRESS',
            executionStart: null,
          }),
        ],
      );

      expect(result).toBe('Cannot validate overlap: IN_PROGRESS plan missing executionStart');
    });

    it('blocks validation when an IN_PROGRESS plan has plannedEnd <= plannedStart', () => {
      const result = checkTimeOverlap(
        { plannedStart: '2024-11-15T18:00:00Z', plannedEnd: '2024-11-15T19:00:00Z' },
        [
          buildPlan({
            id: 'in-progress-1',
            status: 'IN_PROGRESS',
            executionStart: '2024-11-15T10:00:00Z',
            plannedStart: '2024-11-15T12:00:00Z',
            plannedEnd: '2024-11-15T12:00:00Z',
          }),
        ],
      );

      expect(result).toBe('Cannot validate overlap: IN_PROGRESS plan has plannedEnd <= plannedStart');
    });

    it('does not block on missing executionStart when the plan is excluded', () => {
      const result = checkTimeOverlap(
        { plannedStart: '2024-11-15T18:00:00Z', plannedEnd: '2024-11-15T19:00:00Z' },
        [
          buildPlan({
            id: 'in-progress-1',
            status: 'IN_PROGRESS',
            executionStart: null,
          }),
        ],
        'in-progress-1',
      );

      expect(result).toBeNull();
    });
  });

  describe('validatePlanTimes', () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date('2024-11-15T10:00:30Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('blocks plannedStart in the past (minute precision)', () => {
      expect(
        validatePlanTimes('2024-11-15T09:59:00Z', '2024-11-15T11:00:00Z'),
      ).toBe('Planned start time cannot be in the past');
    });

    it('allows plannedStart equal to the current minute', () => {
      expect(
        validatePlanTimes('2024-11-15T10:00:00Z', '2024-11-15T11:00:00Z'),
      ).toBeNull();
    });
  });
});
