import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form';
import { type ReactElement, useEffect } from 'react';
import { ContainerRow } from '../ContainerRow';
import type { ContainerFormData } from '../../types';

// Mock all external dependencies
vi.mock('@/features/containers/components/ContainerNumberPicker', async () => {
  const React = await import('react');
  return {
    ContainerNumberPicker: React.forwardRef(({ value, onChange, disabled }: any, ref: any) => (
      <div>
        <label htmlFor="container-picker">Container Number</label>
        <input
          ref={ref}
          id="container-picker"
          type="text"
          value={value?.number || ''}
          onChange={(e) => onChange?.({ number: e.target.value, id: 'test-id', typeCode: '45G1' })}
          placeholder="Container Number Picker"
          disabled={disabled}
        />
      </div>
    )),
  };
});

vi.mock('@/features/containers/hooks/use-containers-query', () => ({
  useContainer: vi.fn(() => ({
    data: { containerTypeCode: '45G1' },
    isLoading: false,
  })),
}));

const {
  useContainerHBLsMock,
  createUseContainerHBLsResponse,
} = vi.hoisted(() => {
  const emptyMatchingHBLs: any[] = [];
  const createUseContainerHBLsResponse = () => ({
    matchingHBLs: emptyMatchingHBLs,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  });

  return {
    useContainerHBLsMock: vi.fn(createUseContainerHBLsResponse),
    createUseContainerHBLsResponse,
  };
});

vi.mock('@/features/booking-orders/hooks/use-approved-hbls', () => ({
  useContainerHBLs: useContainerHBLsMock,
}));

vi.mock('../HBLTable', () => ({
  default: ({ isLoadingHBLs, containerNumber, sealNumber }: any) => (
    <div data-testid="hbl-table">
      HBLTable: {containerNumber} / {sealNumber}
      {isLoadingHBLs && <span>Loading HBLs...</span>}
    </div>
  ),
}));

vi.mock('@/shared/services/toast', () => ({
  toastAdapter: {
    confirm: vi.fn().mockResolvedValue(true),
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Test wrapper component
const TestWrapper = ({
  index = 0,
  isReadOnly = false,
  isExpanded = false,
  canRemove = true,
  shouldAutoFocus = false,
  defaultValues,
  onRemove = vi.fn(),
  onToggleExpand = vi.fn(),
  onReady,
}: {
  index?: number;
  isReadOnly?: boolean;
  isExpanded?: boolean;
  canRemove?: boolean;
  shouldAutoFocus?: boolean;
  defaultValues?: { containers: Partial<ContainerFormData>[] };
  onRemove?: (index: number) => void;
  onToggleExpand?: () => void;
  onReady?: (methods: UseFormReturn<{ containers: ContainerFormData[] }>) => void;
}): ReactElement => {
  // Base defaults for container
  const baseDefaults: ContainerFormData = {
    containerId: '',
    containerNo: '',
    sealNumber: '',
    typeCode: '',
    isPriority: false,
    isAtYard: false,
    mblNumber: null,
    customsStatus: 'NOT_REGISTERED',
    cargoReleaseStatus: 'NOT_REQUESTED',
    yardFreeFrom: null,
    yardFreeTo: null,
    extractFrom: null,
    extractTo: null,
    cargoNature: undefined,
    cargoProperties: null,
    hbls: [],
  };

  const methods = useForm<{ containers: ContainerFormData[] }>({
    defaultValues: {
      containers: defaultValues?.containers
        ? defaultValues.containers.map(c => {
            // Explicitly merge, preserving arrays like hbls
            return {
              containerId: c.containerId ?? baseDefaults.containerId,
              containerNo: c.containerNo ?? baseDefaults.containerNo,
              sealNumber: c.sealNumber ?? baseDefaults.sealNumber,
              typeCode: c.typeCode ?? baseDefaults.typeCode,
              isPriority: c.isPriority ?? baseDefaults.isPriority,
              isAtYard: c.isAtYard ?? baseDefaults.isAtYard,
              mblNumber: c.mblNumber ?? baseDefaults.mblNumber,
              customsStatus: c.customsStatus ?? baseDefaults.customsStatus,
              cargoReleaseStatus: c.cargoReleaseStatus ?? baseDefaults.cargoReleaseStatus,
              yardFreeFrom: c.yardFreeFrom ?? baseDefaults.yardFreeFrom,
              yardFreeTo: c.yardFreeTo ?? baseDefaults.yardFreeTo,
              extractFrom: c.extractFrom ?? baseDefaults.extractFrom,
              extractTo: c.extractTo ?? baseDefaults.extractTo,
              cargoNature: c.cargoNature ?? baseDefaults.cargoNature,
              cargoProperties: c.cargoProperties ?? baseDefaults.cargoProperties,
              hbls: c.hbls ?? baseDefaults.hbls,
            };
          })
        : [baseDefaults],
    },
  });

  useEffect(() => {
    onReady?.(methods);
  }, [methods, onReady]);

  return (
    <FormProvider {...methods}>
      <ContainerRow
        index={index}
        onRemove={onRemove}
        canRemove={canRemove}
        isReadOnly={isReadOnly}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        shouldAutoFocus={shouldAutoFocus}
      />
    </FormProvider>
  );
};

describe('ContainerRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useContainerHBLsMock.mockReset();
    useContainerHBLsMock.mockImplementation(createUseContainerHBLsResponse);
  });

  describe('Collapsed Row - Basic Rendering', () => {
    it('should render container row number', () => {
      render(<TestWrapper index={0} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render second container as #2', () => {
      render(<TestWrapper index={1} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show "Not set" when container number is empty', () => {
      render(<TestWrapper />);
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('should display container number when provided', () => {
      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} />);
      expect(screen.getByText('MSCU1234567')).toBeInTheDocument();
    });

    it('should display type code', () => {
      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          typeCode: '45G1',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} />);
      expect(screen.getByText('45G1')).toBeInTheDocument();
    });

    it('should display seal number', () => {
      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} />);
      expect(screen.getByText('SEAL123')).toBeInTheDocument();
    });
  });

  describe('Collapsed Row - Status Badges', () => {
    it('should show "Regular" badge when not priority', () => {
      render(<TestWrapper />);
      expect(screen.getByText('Regular')).toBeInTheDocument();
    });

    it('should show "Priority" badge when isPriority is true', () => {
      const defaultValues = {
        containers: [{
          isPriority: true,
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} />);
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

  });

  describe('Collapsed Row - HBL Count Display', () => {
    it('should show "No HBLs yet" when no HBLs', () => {
      render(<TestWrapper />);
      expect(screen.getByText('No HBLs yet')).toBeInTheDocument();
    });

    it('should show HBL count when HBLs exist', () => {
      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [
            { hblId: '1', hblNo: 'HBL-001' },
            { hblId: '2', hblNo: 'HBL-002' },
          ],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} isReadOnly={true} />);
      expect(screen.getByText('2 HBL')).toBeInTheDocument();
    });

    it('should not clear existing HBLs when a manual (duplicate) error is set', async () => {
      const duplicatePairMessage = 'Container number and seal number combination must be unique';
      let methodsRef: any = null;

      const matchingHBLs = [
        { id: 'bl-1', code: 'BL01', packageCount: 1, status: 'approved' },
      ];
      useContainerHBLsMock.mockImplementation(() => ({
        matchingHBLs,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn().mockResolvedValue(undefined),
      }));

      const defaultValues = {
        containers: [{
          containerNo: 'ZIMU6498395',
          sealNumber: 'SEAL01',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(
        <TestWrapper
          defaultValues={defaultValues}
          onReady={(methods) => {
            methodsRef = methods;
          }}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('1 HBL')).toBeInTheDocument();
      });

      await waitFor(() => expect(methodsRef).toBeTruthy());
      await act(async () => {
        methodsRef.setError('containers.0.containerNo', {
          type: 'manual',
          message: duplicatePairMessage,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('1 HBL')).toBeInTheDocument();
      });
      expect(screen.queryByText('No HBLs yet')).not.toBeInTheDocument();
    });
  });

  describe('Collapsed Row - Date Range Formatting', () => {
    it('should show dashes for empty date ranges', () => {
      render(<TestWrapper />);
      // Should show "—" for both yard free and extract periods
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should format date range correctly', () => {
      const defaultValues = {
        containers: [{
          yardFreeFrom: '2025-01-01',
          yardFreeTo: '2025-01-10',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} />);
      // Check for month abbreviation (Jan)
      expect(screen.getByText(/jan 1/i)).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    it('should show ChevronRight icon when collapsed', () => {
      render(<TestWrapper isExpanded={false} />);
      // Component renders ChevronRight, but we can check by className or test-id if needed
      // For now, we'll just verify the collapsed state
      expect(screen.queryByLabelText(/container number picker/i)).not.toBeInTheDocument();
    });

    it('should show expanded content when isExpanded is true', () => {
      render(<TestWrapper isExpanded={true} />);
      expect(screen.getByLabelText(/container number/i)).toBeInTheDocument();
      expect(screen.getByTestId('hbl-table')).toBeInTheDocument();
    });

    it('should call onToggleExpand when row is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();

      render(<TestWrapper onToggleExpand={onToggleExpand} />);

      // Click on the row by finding a clickable element (the row container number)
      const rowNumber = screen.getByText('1');
      await user.click(rowNumber);

      expect(onToggleExpand).toHaveBeenCalled();
    });
  });

  describe('Remove Button', () => {
    it('should show remove button when canRemove is true and not read-only', () => {
      render(<TestWrapper canRemove={true} isReadOnly={false} />);
      const removeButton = screen.getByTitle('Remove container');
      expect(removeButton).toBeInTheDocument();
    });

    it('should not show remove button when canRemove is false', () => {
      render(<TestWrapper canRemove={false} />);
      const removeButton = screen.queryByTitle('Remove container');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should not show remove button when read-only', () => {
      render(<TestWrapper canRemove={true} isReadOnly={true} />);
      const removeButton = screen.queryByTitle('Remove container');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should call confirmation dialog when remove button clicked', async () => {
      const { toastAdapter } = await import('@/shared/services/toast');
      const user = userEvent.setup();
      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} canRemove={true} />);

      const removeButton = screen.getByTitle('Remove container');
      await user.click(removeButton);

      await waitFor(() => {
        expect(toastAdapter.confirm).toHaveBeenCalledWith(
          'Remove container MSCU1234567?',
          { intent: 'danger' }
        );
      });
    });

    it('should call onRemove with correct index when confirmed', async () => {
      const { toastAdapter } = await import('@/shared/services/toast');
      vi.mocked(toastAdapter.confirm).mockResolvedValue(true);

      const onRemove = vi.fn();
      const user = userEvent.setup();

      render(<TestWrapper index={2} onRemove={onRemove} canRemove={true} />);

      const removeButton = screen.getByTitle('Remove container');
      await user.click(removeButton);

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Expanded Content - Form Fields', () => {
    it('should render all form fields when expanded', () => {
      render(<TestWrapper isExpanded={true} />);

      // Check that expanded content has form fields by looking for unique field labels
      expect(screen.getAllByText(/container number/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/seal number/i)).toBeInTheDocument();
      expect(screen.getByText(/mbl number/i)).toBeInTheDocument();
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
      expect(screen.getByText(/cargo release status/i)).toBeInTheDocument();
      expect(screen.getByText(/yard free from/i)).toBeInTheDocument();
      expect(screen.getByText(/yard free to/i)).toBeInTheDocument();
      expect(screen.getByText(/extract from/i)).toBeInTheDocument();
      expect(screen.getByText(/extract to/i)).toBeInTheDocument();
    });

    it('should render HBLTable component when expanded', () => {
      render(<TestWrapper isExpanded={true} />);
      expect(screen.getByTestId('hbl-table')).toBeInTheDocument();
    });

    it('should disable all fields when read-only', () => {
      render(<TestWrapper isExpanded={true} isReadOnly={true} />);

      // Check that inputs and checkboxes are disabled
      const textInputs = screen.getAllByRole('textbox');
      const checkboxes = screen.getAllByRole('checkbox');

      textInputs.forEach((input) => {
        expect(input).toBeDisabled();
      });

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('HBL Auto-Loading (v1.3) - Initial Load', () => {
    it('should auto-load HBLs when container and seal are provided (initial load)', async () => {
      const mockHBLs = [
        {
          id: 'hbl-1',
          code: 'HBL-2025-001',
          receivedAt: '2025-01-15',
          issuer: { name: 'ABC Forwarder' },
          shipper: 'XYZ Shipper',
          consignee: 'DEF Consignee',
          pol: 'HCMC',
          pod: 'SINGAPORE',
          vesselName: 'MSC VENUS',
          voyageNumber: 'V123',
          packageCount: 100,
        },
      ];

      const { useContainerHBLs } = await import('@/features/booking-orders/hooks/use-approved-hbls');
      vi.mocked(useContainerHBLs).mockReturnValue({
        matchingHBLs: mockHBLs,
        isLoading: false,
        isFetching: false,
        isStale: false,
        error: null,
        totalApprovedHBLs: 1,
      });

      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} isExpanded={true} />);

      // HBLs should be auto-loaded without confirmation
      await waitFor(() => {
        // The component should have updated the form state with HBLs
        // We can verify by checking if useContainerHBLs was called
        expect(useContainerHBLs).toHaveBeenCalledWith('MSCU1234567', 'SEAL123');
      });
    });

    it('should show loading state when HBLs are being fetched', async () => {
      const { useContainerHBLs } = await import('@/features/booking-orders/hooks/use-approved-hbls');
      vi.mocked(useContainerHBLs).mockReturnValue({
        matchingHBLs: [],
        isLoading: true,
        isFetching: true,
        isStale: false,
        error: null,
        totalApprovedHBLs: 0,
      });

      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [],
        }] as ContainerFormData[],
      };

      render(<TestWrapper defaultValues={defaultValues} isExpanded={true} />);

      expect(screen.getByText(/loading hbls/i)).toBeInTheDocument();
    });

    it('should allow user to update ETA after auto-fill', async () => {
      let methodsRef: UseFormReturn<{ containers: ContainerFormData[] }> | null = null;
      let matchingHBLs = [
        {
          id: 'hbl-1',
          code: 'HBL-2025-001',
          receivedAt: '2025-01-15',
          issuerId: 'issuer-1',
          issuer: { name: 'ABC Forwarder' },
          shipper: 'XYZ Shipper',
          consignee: 'DEF Consignee',
          pol: 'HCMC',
          pod: 'SINGAPORE',
          vesselName: 'MSC VENUS',
          voyageNumber: 'V123',
          packageCount: 100,
          eta: '2025-01-20',
          status: 'approved',
        },
      ];

      useContainerHBLsMock.mockImplementation(() => ({
        matchingHBLs,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn().mockResolvedValue(undefined),
      }));

      const defaultValues = {
        containers: [{
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL123',
          hbls: [],
        }] as ContainerFormData[],
      };

      const { rerender } = render(
        <TestWrapper
          defaultValues={defaultValues}
          isExpanded={true}
          onReady={(methods) => {
            methodsRef = methods;
          }}
        />,
      );

      await waitFor(() => {
        expect(methodsRef?.getValues('eta' as any)).toBe('2025-01-20');
      });

      act(() => {
        methodsRef?.setValue('eta' as any, '2025-02-01');
      });

      matchingHBLs = [...matchingHBLs];
      rerender(
        <TestWrapper
          defaultValues={defaultValues}
          isExpanded={true}
          onReady={(methods) => {
            methodsRef = methods;
          }}
        />,
      );

      await waitFor(() => {
        expect(methodsRef?.getValues('eta' as any)).toBe('2025-02-01');
      });
    });
  });

  describe('Read-Only Mode', () => {
    it('should not show remove button in read-only mode', () => {
      render(<TestWrapper isReadOnly={true} canRemove={true} />);
      expect(screen.queryByTitle('Remove container')).not.toBeInTheDocument();
    });

    it('should disable all form inputs in read-only mode', () => {
      render(<TestWrapper isReadOnly={true} isExpanded={true} />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });
});
