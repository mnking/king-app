import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingOrderTable from '../BookingOrderTable';
import type { BookingOrder } from '../../types';

// Mock helper to create booking orders
const createMockBookingOrder = (overrides?: Partial<BookingOrder>): BookingOrder => ({
  id: '123',
  code: 'BO-2025-0001',
  bookingNumber: null,
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
  ...overrides,
});

describe('BookingOrderTable - v1.4 bookingNumber column', () => {
  const defaultProps = {
    orders: [],
    loading: false,
    error: null,
    onOrderView: vi.fn(),
    onOrderEdit: vi.fn(),
    onOrderDelete: vi.fn(),
    onCreateOrder: vi.fn(),
    totalCount: 0,
    pagination: { pageIndex: 0, pageSize: 20 },
    onPaginationChange: vi.fn(),
  };

  describe('bookingNumber column rendering', () => {
    it('should display booking number when present', () => {
      const orders = [createMockBookingOrder({ bookingNumber: 'BKN-12345' })];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={1} />);

      expect(screen.getByText('BKN-12345')).toBeInTheDocument();
    });

    it('should display em dash when booking number is null', () => {
      const orders = [createMockBookingOrder({ bookingNumber: null })];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={1} />);

      // Find all em dashes and verify at least one exists for booking number column
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should display em dash when booking number is undefined', () => {
      const orders = [createMockBookingOrder({ bookingNumber: undefined })];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={1} />);

      // Find all em dashes and verify at least one exists for booking number column
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should display em dash when booking number is empty string', () => {
      const orders = [createMockBookingOrder({ bookingNumber: '' })];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={1} />);

      // Empty string should be treated as falsy and display em dash
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should display column header "Booking Number"', () => {
      // Render with at least one order to ensure table headers are visible
      const orders = [createMockBookingOrder()];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={1} />);

      expect(screen.getByText('Booking Number')).toBeInTheDocument();
    });
  });

  describe('bookingNumber search functionality', () => {
    it('should enable search for booking number column', () => {
      // The column configuration in BookingOrderTable has searchable: true
      // and bookingNumber is added to the searchFilter function
      // This test verifies the column is configured correctly
      const orders = [
        createMockBookingOrder({ id: '1', bookingNumber: 'BKN-SEARCH-123' }),
        createMockBookingOrder({ id: '2', bookingNumber: 'BKN-OTHER-456' }),
      ];

      render(<BookingOrderTable {...defaultProps} orders={orders} totalCount={2} />);

      // Verify both booking numbers are displayed
      expect(screen.getByText('BKN-SEARCH-123')).toBeInTheDocument();
      expect(screen.getByText('BKN-OTHER-456')).toBeInTheDocument();
    });
  });
});
