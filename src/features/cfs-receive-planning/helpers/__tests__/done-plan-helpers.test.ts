import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DONE_PLAN_PAGE_SIZE,
  getDefaultDonePlanFilters,
  mapFiltersToQueryParams,
} from '../done-plan-helpers';

describe('done-plan-helpers', () => {
  describe('getDefaultDonePlanFilters', () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date('2024-11-18T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('defaults planned range to first day of current month through now', () => {
      const result = getDefaultDonePlanFilters();
      expect(result.plannedStartFrom).toBe('2024-11-01T00:00:00.000Z');
      expect(result.plannedStartTo).toBe('2024-11-18T10:00:00.000Z');
      expect(result.orderBy).toBe('plannedStart');
      expect(result.orderDir).toBe('asc');
    });
  });

  describe('mapFiltersToQueryParams', () => {
    it('maps defined filters to backend query shape', () => {
      const params = mapFiltersToQueryParams({
        plannedStartFrom: '2024-11-01T00:00:00.000Z',
        plannedStartTo: '2024-11-18T23:59:59.000Z',
        executionStartFrom: '2024-11-05T00:00:00.000Z',
        executionStartTo: '2024-11-10T23:59:59.000Z',
        search: 'TEMU3381502',
        orderBy: 'plannedStart',
        orderDir: 'desc',
      });

      expect(params).toEqual({
        plannedStart: {
          from: '2024-11-01T00:00:00.000Z',
          to: '2024-11-18T23:59:59.000Z',
        },
        executionStart: {
          from: '2024-11-05T00:00:00.000Z',
          to: '2024-11-10T23:59:59.000Z',
        },
        search: 'TEMU3381502',
        orderBy: 'plannedStart',
        orderDir: 'desc',
      });
    });

    it('omits optional groups when filters are empty', () => {
      const params = mapFiltersToQueryParams({
        orderBy: 'plannedStart',
        orderDir: 'asc',
      });

      expect(params).toEqual({
        orderBy: 'plannedStart',
        orderDir: 'asc',
      });
    });
  });

  it('exposes the expected backend page size', () => {
    expect(DONE_PLAN_PAGE_SIZE).toBe(50);
  });
});

