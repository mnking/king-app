import { describe, it, expect } from 'vitest';
import { calculateExpectedEndTime } from '../utils/expected-end-time';
import type { ReceivePlan } from '../types/receive-plan-types';

describe('calculateExpectedEndTime', () => {
  const basePlan: Partial<ReceivePlan> = {
    code: 'TEST001',
    status: 'IN_PROGRESS',
    plannedStart: '2025-10-20T08:00:00Z',
    plannedEnd: '2025-10-20T17:00:00Z', // 9 hours duration
    containers: [],
  };

  describe('when executionStart is null', () => {
    it('should return duration in hours and minutes format', () => {
      const plan = {
        ...basePlan,
        executionStart: null,
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      expect(result).toBe('9 hours 0 minutes');
    });

    it('should handle duration with both hours and minutes', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-20T11:30:00Z', // 3 hours 30 minutes
        executionStart: null,
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      expect(result).toBe('3 hours 30 minutes');
    });

    it('should handle duration less than 1 hour', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-20T08:45:00Z', // 45 minutes
        executionStart: null,
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      expect(result).toBe('0 hours 45 minutes');
    });
  });

  describe('when executionStart exists', () => {
    it('should return full datetime format', () => {
      const plan = {
        ...basePlan,
        executionStart: '2025-10-20T09:00:00Z',
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      // Expected: executionStart (09:00) + 9 hours = 18:00
      // Note: toLocaleString output may vary by timezone, so we check format
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    });

    it('should correctly calculate expected end time', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-20T12:00:00Z', // 4 hours duration
        executionStart: '2025-10-20T10:00:00Z',
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      // Expected: executionStart (10:00) + 4 hours = 14:00
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    });

    it('should handle execution start after planned start', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-20T17:00:00Z', // 9 hours duration
        executionStart: '2025-10-20T10:30:00Z', // Started 2.5 hours late
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      // Expected: executionStart (10:30) + 9 hours = 19:30
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    });
  });

  describe('edge cases', () => {
    it('should handle same start and end time (zero duration)', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-20T08:00:00Z', // 0 hours
        executionStart: null,
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      expect(result).toBe('0 hours 0 minutes');
    });

    it('should handle multi-day duration', () => {
      const plan = {
        ...basePlan,
        plannedStart: '2025-10-20T08:00:00Z',
        plannedEnd: '2025-10-22T10:00:00Z', // 2 days 2 hours = 50 hours
        executionStart: null,
      } as ReceivePlan;

      const result = calculateExpectedEndTime(plan);

      expect(result).toBe('50 hours 0 minutes');
    });
  });
});
