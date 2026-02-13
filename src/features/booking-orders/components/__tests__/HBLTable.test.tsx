import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import type { ReactElement } from 'react';
import { HBLTable } from '../HBLTable';
import type { ContainerFormData } from '../../types';

vi.mock('@/shared/services/toast', () => ({
  toastAdapter: {
    confirm: vi.fn().mockResolvedValue(true),
    success: vi.fn(),
  },
}));

// Test wrapper component with React Hook Form
const TestWrapper = ({
  containerIndex = 0,
  isReadOnly = false,
  isImportFlow = false,
  isLoadingHBLs = false,
  containerNumber = 'MSCU1234567',
  sealNumber = 'SEAL123',
  defaultHBLs = [],
  onRefresh,
  isRefreshing = false,
}: {
  containerIndex?: number;
  isReadOnly?: boolean;
  isImportFlow?: boolean;
  isLoadingHBLs?: boolean;
  containerNumber?: string;
  sealNumber?: string;
  defaultHBLs?: any[];
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}): ReactElement => {
  const methods = useForm({
    defaultValues: {
      containers: [
        {
          containerNo: containerNumber,
          sealNumber: sealNumber,
          hbls: defaultHBLs,
        },
      ] as ContainerFormData[],
    },
  });

  return (
    <FormProvider {...methods}>
      <HBLTable
        containerIndex={containerIndex}
        isReadOnly={isReadOnly}
        isImportFlow={isImportFlow}
        isLoadingHBLs={isLoadingHBLs}
        containerNumber={containerNumber}
        sealNumber={sealNumber}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
    </FormProvider>
  );
};

describe('HBLTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header and Instructions', () => {
    it('should render header with auto-load explanation', () => {
      render(<TestWrapper />);

      expect(screen.getByText('House Bills of Lading (HBL)')).toBeInTheDocument();
      expect(
        screen.getByText('Auto-loaded based on container + seal combination')
      ).toBeInTheDocument();
    });

    it('should render refresh button when not read-only', () => {
      render(<TestWrapper isReadOnly={false} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should not render refresh button when read-only', () => {
      render(<TestWrapper isReadOnly={true} />);

      const refreshButton = screen.queryByRole('button', { name: /refresh/i });
      expect(refreshButton).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isLoadingHBLs is true', () => {
      render(
        <TestWrapper
          isLoadingHBLs={true}
          sealNumber="SEAL123"
          defaultHBLs={[]}
        />
      );

      expect(screen.getByText(/searching for hbls with seal seal123/i)).toBeInTheDocument();
    });

    it('should not show loading when HBLs already exist', () => {
      const mockHBLs = [
        {
          hblId: 'hbl-1',
          hblNo: 'HBL-001',
          consignee: 'ABC Corp',
          packages: 100,
        },
      ];

      render(
        <TestWrapper
          isLoadingHBLs={true}
          defaultHBLs={mockHBLs}
        />
      );

      expect(screen.queryByText(/searching for hbls/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no container/seal provided', () => {
      render(
        <TestWrapper
          containerNumber=""
          sealNumber=""
          defaultHBLs={[]}
        />
      );

      expect(
        screen.getByText(/enter container number and seal number to load associated hbls/i)
      ).toBeInTheDocument();
    });

    it('should show "no HBLs found" when container and seal provided but no HBLs', () => {
      render(
        <TestWrapper
          containerNumber="MSCU1234567"
          sealNumber="SEAL123"
          defaultHBLs={[]}
          isLoadingHBLs={false}
        />
      );

      expect(
        screen.getByText(/no hbls found for container mscu1234567 with seal seal123/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/hbls must be created and approved in hbl management before saving booking order/i)
      ).toBeInTheDocument();
    });
  });

  describe('HBL Table Display', () => {
    const mockHBLs = [
      {
        hblId: 'hbl-1',
        hblNo: 'HBL-2025-001',
        receivedAt: '2025-01-15',
        issuerName: 'ABC Forwarder',
        shipper: 'XYZ Shipper Co.',
        consignee: 'DEF Consignee Ltd.',
        pol: 'HCMC',
        pod: 'SINGAPORE',
        vesselName: 'MSC VENUS',
        voyageNumber: 'V123',
        packages: 100,
        customsStatus: 'APPROVED',
      },
      {
        hblId: 'hbl-2',
        hblNo: 'HBL-2025-002',
        receivedAt: '2025-01-16',
        issuerName: 'Global Logistics',
        shipper: 'Sample Shipper',
        consignee: 'Sample Consignee',
        pol: 'HANOI',
        pod: 'BANGKOK',
        vesselName: 'MAERSK LINE',
        voyageNumber: 'M456',
        packages: 50,
        customsStatus: 'PENDING',
      },
    ];

    it('should show success message with HBL count', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} />);

      expect(
        screen.getByText(/✓ found 2 hbls for this container/i)
      ).toBeInTheDocument();
    });

    it('should render table with correct headers', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} />);

      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('HBL Code')).toBeInTheDocument();
      expect(screen.getByText('Received Date')).toBeInTheDocument();
      expect(screen.getByText('Issuer (Forwarder)')).toBeInTheDocument();
      expect(screen.getByText('Shipper')).toBeInTheDocument();
      expect(screen.getByText('Consignee')).toBeInTheDocument();
      expect(screen.getByText('POL → POD')).toBeInTheDocument();
      expect(screen.getByText('Vessel / Voyage')).toBeInTheDocument();
      expect(screen.getByText('Customs Status')).toBeInTheDocument();
    });

    it('should render HBL data correctly', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} />);

      // First HBL
      expect(screen.getByText('HBL-2025-001')).toBeInTheDocument();
      expect(screen.getByText('ABC Forwarder')).toBeInTheDocument();
      expect(screen.getByText('XYZ Shipper Co.')).toBeInTheDocument();
      expect(screen.getByText('DEF Consignee Ltd.')).toBeInTheDocument();
      expect(screen.getByText('HCMC → SINGAPORE')).toBeInTheDocument();
      expect(screen.getByText('MSC VENUS / V123')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();

      // Second HBL
      expect(screen.getByText('HBL-2025-002')).toBeInTheDocument();
      expect(screen.getByText('Global Logistics')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should format received date correctly', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} />);

      // Check date formatting (Jan 15, 2025)
      expect(screen.getByText(/jan 15, 2025/i)).toBeInTheDocument();
    });

    it('should handle missing fields with dashes', () => {
      const incompleteHBL = [
        {
          hblId: 'hbl-3',
          hblNo: 'HBL-2025-003',
          // Missing receivedAt, issuerName, shipper, etc.
        },
      ];

      render(<TestWrapper defaultHBLs={incompleteHBL} />);

      // Should show dashes for missing fields
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should render row numbers correctly', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} />);

      // Check first and second row numbers by finding all cells with "#" (row number column)
      const table = screen.getByRole('table');
      const rowNumbers = within(table).getAllByRole('cell', { name: /^\d+$/ });

      // Should have row numbers 1 and 2
      expect(rowNumbers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('HBL Removal', () => {
    const mockHBLs = [
      {
        hblId: 'hbl-1',
        hblNo: 'HBL-2025-001',
        consignee: 'Test Consignee',
        packages: 100,
      },
    ];

    it('should show remove button when not read-only', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} isReadOnly={false} />);

      const removeButtons = screen.getAllByTitle('Remove HBL');
      expect(removeButtons).toHaveLength(1);
    });

    it('should not show remove button when read-only', () => {
      render(<TestWrapper defaultHBLs={mockHBLs} isReadOnly={true} />);

      const removeButtons = screen.queryAllByTitle('Remove HBL');
      expect(removeButtons).toHaveLength(0);
    });

    it('should disable remove button in import flow', async () => {
      const { toastAdapter } = await import('@/shared/services/toast');
      const user = userEvent.setup();

      render(<TestWrapper defaultHBLs={mockHBLs} isReadOnly={false} isImportFlow={true} />);

      const removeButton = screen.getByTitle('Remove HBL');
      expect(removeButton).toBeDisabled();

      await user.click(removeButton);
      expect(toastAdapter.confirm).not.toHaveBeenCalled();
    });

    it('should call confirmation dialog when remove button clicked', async () => {
      const { toastAdapter } = await import('@/shared/services/toast');
      const user = userEvent.setup();

      render(<TestWrapper defaultHBLs={mockHBLs} isReadOnly={false} isImportFlow={false} />);

      const removeButton = screen.getByTitle('Remove HBL');
      await user.click(removeButton);

      expect(toastAdapter.confirm).toHaveBeenCalledWith(
        'Remove HBL HBL-2025-001?',
        { intent: 'danger' }
      );
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh and show success message', async () => {
      const user = userEvent.setup();
      const refreshSpy = vi.fn().mockResolvedValue(undefined);

      // Access mocked toast module
      const toastModule = await import('@/shared/services/toast');

      render(<TestWrapper isReadOnly={false} onRefresh={refreshSpy} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(toastModule.toastAdapter.success).toHaveBeenCalledWith('HBL list refreshed');
        expect(refreshSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('should have refresh button enabled when not refreshing', () => {
      render(<TestWrapper isReadOnly={false} onRefresh={() => {}} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).not.toBeDisabled();
    });

    it('should disable refresh button while loading HBLs', () => {
      render(<TestWrapper isReadOnly={false} isLoadingHBLs={true} onRefresh={() => {}} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });

    it('should disable refresh button when handler is missing', () => {
      render(<TestWrapper isReadOnly={false} onRefresh={undefined} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });

    it('should disable refresh button when container/seal missing', () => {
      render(
        <TestWrapper
          isReadOnly={false}
          containerNumber=""
          sealNumber=""
          onRefresh={() => {}}
        />,
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Single HBL Count', () => {
    it('should use singular "HBL" for single HBL', () => {
      const singleHBL = [
        {
          hblId: 'hbl-1',
          hblNo: 'HBL-2025-001',
          consignee: 'Test',
          packages: 100,
        },
      ];

      render(<TestWrapper defaultHBLs={singleHBL} />);

      expect(
        screen.getByText(/✓ found 1 hbl for this container/i)
      ).toBeInTheDocument();
    });
  });
});
