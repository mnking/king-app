import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HBLTable } from '../HBLTable';
import type { HouseBill } from '../../types';

describe('HBLTable - Seal Column (T020-T023)', () => {
  const mockOnHBLView = vi.fn();
  const mockOnHBLEdit = vi.fn();
  const mockOnHBLDelete = vi.fn();
  const mockOnHBLMarkDone = vi.fn();
  const mockOnHBLManageCustomsDeclarations = vi.fn();
  const mockOnCreateHBL = vi.fn();
  const mockOnPaginationChange = vi.fn();

  const mockHBLWithSeal: HouseBill = {
    id: 'hbl-1',
    code: 'HBL001',
    receivedAt: '2025-01-15',
    document: { id: 'doc-1', name: 'DOC-001.pdf', mimeType: 'application/pdf' },
    issuerId: 'forwarder-1',
    shipper: 'Test Shipper Ltd',
    consignee: 'Test Consignee Inc',
    notifyParty: 'Test Notify Party',
    cargoDescription: 'Electronics',
    packageCount: 100,
    packageType: 'CTN',
    cargoWeight: 1500,
    volume: 45,
    vesselName: 'MV Test Vessel',
    voyageNumber: 'V123',
    pol: 'SGSIN',
    pod: 'VNVUT',
    containers: [
      {
        containerNumber: 'TCLU1234567',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL001234',
      },
    ],
    status: 'pending',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  };

  const mockHBLWithoutSeal: HouseBill = {
    ...mockHBLWithSeal,
    id: 'hbl-2',
    code: 'HBL002',
    containers: [
      {
        containerNumber: 'TCLU9876543',
        containerTypeCode: '22G1',
        sealNumber: '',
      },
    ],
  };

  const mockHBLWithLongSeal: HouseBill = {
    ...mockHBLWithSeal,
    id: 'hbl-3',
    code: 'HBL003',
    containers: [
      {
        containerNumber: 'TCLU1111111',
        containerTypeCode: '22G1',
        sealNumber: 'VERYLONGSEAL12345678901234567890123456789012345678',
      },
    ],
  };

  const defaultProps = {
    hbls: [],
    loading: false,
    fetching: false,
    error: null,
    onHBLView: mockOnHBLView,
    onHBLEdit: mockOnHBLEdit,
    onHBLDelete: mockOnHBLDelete,
    onHBLMarkDone: mockOnHBLMarkDone,
    onHBLManageCustomsDeclarations: mockOnHBLManageCustomsDeclarations,
    onCreateHBL: mockOnCreateHBL,
    totalCount: 0,
    pagination: { pageIndex: 0, pageSize: 10 },
    onPaginationChange: mockOnPaginationChange,
  };

  /**
   * T020: Test - "displays Seal column after Container column"
   * Expected to FAIL initially (column doesn't exist)
   */
  describe('T020: Display Seal column after Container column', () => {
    it('should display Seal column header', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal]} />);

      // Verify "Seal" column header exists
      const sealHeader = screen.getByText('Seal');
      expect(sealHeader).toBeInTheDocument();
    });

    it('should position Seal column after Container column', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal]} />);

      // Get all column headers
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);

      // Find indices
      const containerIndex = headerTexts.findIndex((text) => text?.includes('Container'));
      const sealIndex = headerTexts.findIndex((text) => text?.includes('Seal'));

      // Seal should come immediately after Container
      expect(containerIndex).toBeGreaterThanOrEqual(0);
      expect(sealIndex).toBe(containerIndex + 1);
    });
  });

  /**
   * T021: Test - "displays seal number when present"
   * Expected to FAIL initially
   */
  describe('T021: Display seal number when present', () => {
    it('should display seal number for HBL with seal', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal]} />);

      // Verify seal number is displayed
      expect(screen.getByText('SEAL001234')).toBeInTheDocument();
    });

    it('should display correct seal number for multiple HBLs', () => {
      const hblWithDifferentSeal: HouseBill = {
        ...mockHBLWithSeal,
        id: 'hbl-4',
        code: 'HBL004',
        containers: [
          {
            containerNumber: 'TCLU2222222',
            containerTypeCode: '22G1',
            sealNumber: 'SEAL999888',
          },
        ],
      };

      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal, hblWithDifferentSeal]} />);

      // Both seal numbers should be visible
      expect(screen.getByText('SEAL001234')).toBeInTheDocument();
      expect(screen.getByText('SEAL999888')).toBeInTheDocument();
    });
  });

  /**
   * T022: Test - "displays em dash when seal number missing"
   * Expected to FAIL initially
   */
  describe('T022: Display em dash when seal missing', () => {
    it('should display em dash when seal number is empty', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithoutSeal]} />);

      // Get all table cells and check for em dash in seal column
      // Since we can't target specific column directly, we look for em dash character
      const emDashes = screen.getAllByText('—');

      // Should have at least one em dash (for missing seal)
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should display em dash when container has no seal property', () => {
      const hblNoSealProperty: HouseBill = {
        ...mockHBLWithSeal,
        id: 'hbl-5',
        code: 'HBL005',
        containers: [
          {
            containerNumber: 'TCLU3333333',
            containerTypeCode: '22G1',
            sealNumber: '',
          },
        ],
      };

      render(<HBLTable {...defaultProps} hbls={[hblNoSealProperty]} />);

      // Should display em dash for missing seal
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should display em dash when HBL has no containers', () => {
      const hblNoContainers: HouseBill = {
        ...mockHBLWithSeal,
        id: 'hbl-6',
        code: 'HBL006',
        containers: [],
      };

      render(<HBLTable {...defaultProps} hbls={[hblNoContainers]} />);

      // Should display em dash for missing container/seal
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });
  });

  /**
   * T023: Test - "wraps long seal numbers without breaking layout"
   * Expected to FAIL initially
   */
  describe('T023: Wrap long seal numbers', () => {
    it('should display full seal number even when very long', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithLongSeal]} />);

      // Verify full seal number is rendered (not truncated)
      expect(
        screen.getByText('VERYLONGSEAL12345678901234567890123456789012345678')
      ).toBeInTheDocument();
    });

    it('should display both normal and long seal numbers correctly', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal, mockHBLWithLongSeal]} />);

      // Both seal numbers should be visible
      expect(screen.getByText('SEAL001234')).toBeInTheDocument();
      expect(screen.getByText('VERYLONGSEAL12345678901234567890123456789012345678')).toBeInTheDocument();
    });
  });

  // Basic table functionality tests
  describe('Basic table functionality', () => {
    it('should render table with HBL data', () => {
      render(<HBLTable {...defaultProps} hbls={[mockHBLWithSeal]} />);

      // Verify basic HBL info is displayed
      expect(screen.getByText('HBL001')).toBeInTheDocument();
      expect(screen.getByText('Test Shipper Ltd')).toBeInTheDocument();
    });

    it('should render empty state when no HBLs', () => {
      render(<HBLTable {...defaultProps} hbls={[]} />);

      // Verify empty state message
      expect(screen.getByText('No HBLs found')).toBeInTheDocument();
    });
  });
});
