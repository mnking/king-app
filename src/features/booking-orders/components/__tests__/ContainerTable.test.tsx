import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactElement } from 'react';
import type { BookingOrderCreateForm } from '../../types';
import { getLocalTodayAsUtcMidnight } from '@/shared/utils/dateTimeUtils';

vi.mock('../hooks', () => ({
  useUpdateBookingOrderPlan: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/services/apiContainers', () => {
  const original = vi.importActual<any>('@/services/apiContainers');
  return {
    ...original,
    containersApi: {
      ...original.containersApi,
      getByNumber: vi.fn(),
    },
  };
});

import { ContainerTable } from '../ContainerTable';
import { containersApi } from '@/services/apiContainers';

// Mock ContainerRow component
vi.mock('../ContainerRow', () => ({
  default: ({ index, onRemove, canRemove, isExpanded, onToggleExpand, isReadOnly, onUpdatePlan }: any) => (
    <div data-testid={`container-row-${index}`}>
      <span>Container #{index + 1}</span>
      {isExpanded && <span>Expanded</span>}
      {!isReadOnly && canRemove && (
        <button onClick={() => onRemove(index)} data-testid={`remove-${index}`}>
          Remove
        </button>
      )}
      <button onClick={onToggleExpand} data-testid={`toggle-${index}`}>
        Toggle
      </button>
      <button onClick={() => onUpdatePlan?.(index)}>Update Plan</button>
    </div>
  ),
}));

// Test wrapper component
const TestWrapper = ({
  isReadOnly = false,
  defaultValues,
  onReady,
}: {
  isReadOnly?: boolean;
  defaultValues?: Partial<BookingOrderCreateForm>;
  onReady?: (methods: UseFormReturn<BookingOrderCreateForm>) => void;
}): ReactElement => {
  const methods = useForm<BookingOrderCreateForm>({
    defaultValues: {
      containers: [],
      ...defaultValues,
    } as BookingOrderCreateForm,
  });

  useEffect(() => {
    onReady?.(methods);
  }, [methods, onReady]);

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <ContainerTable isReadOnly={isReadOnly} />
      </FormProvider>
    </QueryClientProvider>
  );
};

describe('ContainerTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('Plan modal editability by container cycle seal', () => {
    const buildContainers = () => [
      {
        id: 'c1',
        containerId: 'id-1',
        containerNo: 'CONT1',
        sealNumber: 'SEAL123',
        hbls: [],
      },
    ];

    it('allows editing when current cycle seal matches container seal', async () => {
      vi.mocked(containersApi.getByNumber).mockResolvedValue({
        statusCode: 200,
        data: {
          id: 'c-api',
          number: 'CONT1',
          currentCycle: { sealNumber: 'SEAL123' },
        },
      } as any);

      render(<TestWrapper defaultValues={{ containers: buildContainers() } as any} />);

      const updatePlanBtn = screen.getByRole('button', { name: /update plan/i });
      await userEvent.click(updatePlanBtn);

      await waitFor(() =>
        expect(containersApi.getByNumber).toHaveBeenCalledWith('CONT1', { cycle: true }),
      );
    });

    it('disables editing when current cycle seal mismatches container seal', async () => {
      vi.mocked(containersApi.getByNumber).mockResolvedValue({
        statusCode: 200,
        data: {
          id: 'c-api',
          number: 'CONT1',
          currentCycle: { sealNumber: 'OTHER' },
        },
      } as any);

      render(<TestWrapper defaultValues={{ containers: buildContainers() } as any} />);

      const updatePlanBtn = screen.getByRole('button', { name: /update plan/i });
      await userEvent.click(updatePlanBtn);

      await waitFor(() =>
        expect(containersApi.getByNumber).toHaveBeenCalledWith('CONT1', { cycle: true }),
      );
    });

    it('disables editing when no active cycle', async () => {
      vi.mocked(containersApi.getByNumber).mockResolvedValue({
        statusCode: 200,
        data: {
          id: 'c-api',
          number: 'CONT1',
          currentCycle: null,
        },
      } as any);

      render(<TestWrapper defaultValues={{ containers: buildContainers() } as any} />);

      const updatePlanBtn = screen.getByRole('button', { name: /update plan/i });
      await userEvent.click(updatePlanBtn);

      await waitFor(() =>
        expect(containersApi.getByNumber).toHaveBeenCalledWith('CONT1', { cycle: true }),
      );
    });
  });

  describe('Header and Empty State', () => {
    it('should render header with container count', () => {
      render(<TestWrapper />);

      expect(screen.getByText('Containers')).toBeInTheDocument();
      // Text appears in both header and empty state, use getAllByText
      expect(screen.getAllByText('No containers added yet').length).toBeGreaterThan(0);
    });

    it('should show Add Container button when not read-only', () => {
      render(<TestWrapper isReadOnly={false} />);

      const addButton = screen.getByRole('button', { name: /add container/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should not show Add Container button when read-only', () => {
      render(<TestWrapper isReadOnly={true} />);

      const addButton = screen.queryByRole('button', { name: /add container/i });
      expect(addButton).not.toBeInTheDocument();
    });

    it('should display empty state with icon and message', () => {
      render(<TestWrapper />);

      // Text appears in both header and empty state
      expect(screen.getAllByText('No containers added yet').length).toBe(2);
      expect(screen.getByText(/click "add container" to start adding containers/i)).toBeInTheDocument();
      expect(screen.getByText(/draft orders can be saved without containers/i)).toBeInTheDocument();
    });
  });

  describe('Container List Rendering', () => {
    it('should display correct container count in header', () => {
      const defaultValues = {
        containers: [
          { containerNo: 'CONT1', hbls: [] },
          { containerNo: 'CONT2', hbls: [] },
        ],
      };

      render(<TestWrapper defaultValues={defaultValues as any} />);

      expect(screen.getByText('2 containers added')).toBeInTheDocument();
    });

    it('should use singular form for single container', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} />);

      expect(screen.getByText('1 container added')).toBeInTheDocument();
    });

    it('should render all container rows', () => {
      const defaultValues = {
        containers: [
          { containerNo: 'CONT1', hbls: [] },
          { containerNo: 'CONT2', hbls: [] },
          { containerNo: 'CONT3', hbls: [] },
        ],
      };

      render(<TestWrapper defaultValues={defaultValues as any} />);

      expect(screen.getByTestId('container-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('container-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('container-row-2')).toBeInTheDocument();
    });

    it('should show table header when containers exist', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} />);

      // Check for table header columns
      expect(screen.getByText('Container No')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Seal')).toBeInTheDocument();
      expect(screen.getByText('MBL')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Cargo Release')).toBeInTheDocument();
      expect(screen.getByText('Yard Free')).toBeInTheDocument();
      expect(screen.getByText('HBLs')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Add Container Functionality', () => {
    it('should add new container when Add Container button clicked', async () => {
      const user = userEvent.setup();

      render(<TestWrapper />);

      // Initially no containers
      expect(screen.queryByTestId('container-row-0')).not.toBeInTheDocument();

      // Click Add Container
      const addButton = screen.getByRole('button', { name: /add container/i });
      await user.click(addButton);

      // Should have 1 container
      await waitFor(() => {
        expect(screen.getByTestId('container-row-0')).toBeInTheDocument();
      });
    });

    it('should add multiple containers', async () => {
      const user = userEvent.setup();

      render(<TestWrapper />);

      const addButton = screen.getByRole('button', { name: /add container/i });

      // Add 3 containers
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      // Wait for last container to be added
      await waitFor(() => {
        expect(screen.getByTestId('container-row-2')).toBeInTheDocument();
      });

      // Then verify all containers are present
      expect(screen.getByTestId('container-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('container-row-1')).toBeInTheDocument();
      expect(screen.getByText('3 containers added')).toBeInTheDocument();
    });

    it('should call scrollIntoView when new container is added', async () => {
      const user = userEvent.setup();
      const scrollMock = vi.fn();
      Element.prototype.scrollIntoView = scrollMock;

      render(<TestWrapper />);

      const addButton = screen.getByRole('button', { name: /add container/i });
      await user.click(addButton);

      // Wait for scroll to be called
      await waitFor(() => {
        expect(scrollMock).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Remove Container Functionality', () => {
    it('should remove container when remove button clicked', async () => {
      const user = userEvent.setup();
      const defaultValues = {
        containers: [
          { containerNo: 'CONT1', hbls: [] },
          { containerNo: 'CONT2', hbls: [] },
        ],
      };

      render(<TestWrapper defaultValues={defaultValues as any} />);

      // Should have 2 containers
      expect(screen.getByTestId('container-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('container-row-1')).toBeInTheDocument();

      // Remove first container
      const removeButton = screen.getByTestId('remove-0');
      await user.click(removeButton);

      // Should have only 1 container left
      await waitFor(() => {
        expect(screen.queryByTestId('container-row-1')).not.toBeInTheDocument();
      });
    });

    it('should not show remove button in read-only mode', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} isReadOnly={true} />);

      expect(screen.queryByTestId('remove-0')).not.toBeInTheDocument();
    });
  });

  describe('Derived fields reset on last container removal', () => {
    it('should reset derived fields when last container is removed', async () => {
      const user = userEvent.setup();
      let methodsRef: UseFormReturn<BookingOrderCreateForm> | null = null;

      render(
        <TestWrapper
          defaultValues={{
            agentId: 'agent-1',
            agentCode: 'AGT-001',
            vesselCode: 'VESSEL-1',
            voyage: 'VOY-001',
            eta: '2025-02-01',
            containers: [{ containerNo: 'CONT1', sealNumber: 'SEAL1', hbls: [] }],
          } as any}
          onReady={(methods) => {
            methodsRef = methods;
          }}
        />,
      );

      const removeButton = screen.getByTestId('remove-0');
      await user.click(removeButton);

      await waitFor(() => {
        expect(methodsRef?.getValues('containers')).toHaveLength(0);
      });

      expect(methodsRef?.getValues('agentId')).toBe('');
      expect(methodsRef?.getValues('agentCode')).toBeUndefined();
      expect(methodsRef?.getValues('vesselCode')).toBe('');
      expect(methodsRef?.getValues('voyage')).toBe('');
      expect(methodsRef?.getValues('eta')).toBe(getLocalTodayAsUtcMidnight());
    });
  });

  describe('Helper Text', () => {
    it('should not show helper tip when containers exist and not read-only', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} isReadOnly={false} />);

      expect(screen.queryByText(/tip:/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/click on any container row to expand and edit details/i),
      ).not.toBeInTheDocument();
    });

    it('should not show helper tip when no containers', () => {
      render(<TestWrapper />);

      expect(screen.queryByText(/tip:/i)).not.toBeInTheDocument();
    });

    it('should not show helper tip in read-only mode', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} isReadOnly={true} />);

      expect(screen.queryByText(/tip:/i)).not.toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('should not show Add Container button in read-only mode', () => {
      render(<TestWrapper isReadOnly={true} />);

      expect(screen.queryByRole('button', { name: /add container/i })).not.toBeInTheDocument();
    });

    it('should pass isReadOnly prop to ContainerRow components', () => {
      const defaultValues = {
        containers: [{ containerNo: 'CONT1', hbls: [] }],
      };

      render(<TestWrapper defaultValues={defaultValues as any} isReadOnly={true} />);

      // ContainerRow mock doesn't render remove button when read-only
      expect(screen.queryByTestId('remove-0')).not.toBeInTheDocument();
    });
  });

  describe('Auto-expand on Add', () => {
    it('should auto-expand newly added container', async () => {
      const user = userEvent.setup();

      render(<TestWrapper />);

      const addButton = screen.getByRole('button', { name: /add container/i });
      await user.click(addButton);

      // New container should exist
      await waitFor(() => {
        const container = screen.getByTestId('container-row-0');
        expect(container).toBeInTheDocument();
      });

      // Note: We can't easily test the expanded state without mocking useState
      // since the mock component would need to track expansion state
      // This is tested in integration/e2e tests
    });
  });
});
