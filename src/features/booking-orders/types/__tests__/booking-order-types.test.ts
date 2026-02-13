import { describe, it, expect } from 'vitest';
import type { BookingOrder } from '../booking-order-types';

describe('BookingOrder Types - v1.4 bookingNumber field', () => {
  describe('bookingNumber field validation', () => {
    it('should accept bookingNumber as optional string', () => {
      const order: BookingOrder = {
        id: '123',
        code: 'BO-2025-0001',
        bookingNumber: 'BKN-12345',
        status: 'APPROVED',
        enteredAt: '2025-10-14',
        agentId: 'agent-1',
        agentCode: 'AG001',
        eta: '2025-10-20',
        vesselId: 'vessel-1',
        vesselCode: 'VSL001',
        voyage: 'V001',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: null,
        approvedBy: 'user-1',
        approvedAt: '2025-10-14',
        containers: [],
        createdAt: '2025-10-14T10:00:00Z',
        updatedAt: '2025-10-14T10:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      expect(order.bookingNumber).toBe('BKN-12345');
      expect(typeof order.bookingNumber).toBe('string');
    });

    it('should accept bookingNumber as null', () => {
      const order: BookingOrder = {
        id: '123',
        code: null,
        bookingNumber: null,
        status: 'DRAFT',
        enteredAt: null,
        agentId: 'agent-1',
        agentCode: 'AG001',
        eta: '2025-10-20',
        vesselId: 'vessel-1',
        vesselCode: 'VSL001',
        voyage: 'V001',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: null,
        approvedBy: null,
        approvedAt: null,
        containers: [],
        createdAt: '2025-10-14T10:00:00Z',
        updatedAt: '2025-10-14T10:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      expect(order.bookingNumber).toBeNull();
    });

    it('should accept bookingNumber as undefined', () => {
      const order: BookingOrder = {
        id: '123',
        code: null,
        // bookingNumber intentionally omitted
        status: 'DRAFT',
        enteredAt: null,
        agentId: 'agent-1',
        agentCode: 'AG001',
        eta: '2025-10-20',
        vesselId: 'vessel-1',
        vesselCode: 'VSL001',
        voyage: 'V001',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: null,
        approvedBy: null,
        approvedAt: null,
        containers: [],
        createdAt: '2025-10-14T10:00:00Z',
        updatedAt: '2025-10-14T10:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      expect(order.bookingNumber).toBeUndefined();
    });

    it('should verify TypeScript type inference works correctly', () => {
      const order: BookingOrder = {
        id: '123',
        code: 'BO-2025-0001',
        bookingNumber: 'BKN-12345',
        status: 'APPROVED',
        enteredAt: '2025-10-14',
        agentId: 'agent-1',
        agentCode: 'AG001',
        eta: '2025-10-20',
        vesselId: 'vessel-1',
        vesselCode: 'VSL001',
        voyage: 'V001',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: null,
        approvedBy: 'user-1',
        approvedAt: '2025-10-14',
        containers: [],
        createdAt: '2025-10-14T10:00:00Z',
        updatedAt: '2025-10-14T10:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      // TypeScript should infer bookingNumber can be string | null | undefined
      const bookingNumber = order.bookingNumber;

      // This should compile without errors
      if (bookingNumber) {
        expect(typeof bookingNumber).toBe('string');
      } else {
        expect(bookingNumber === null || bookingNumber === undefined).toBe(true);
      }
    });
  });
});
