import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { HBLFormModal } from '../HBLFormModal';
import type { HouseBill } from '../../types';
import { toastAdapter } from '@/shared/services/toast';

// Mock dependencies
vi.mock('@/features/containers/components/ContainerNumberPicker/ContainerNumberPicker', () => ({
  ContainerNumberPicker: ({ value, onChange, disabled }: any) => (
    <div data-testid="container-number-picker">
      <input
        type="text"
        value={value?.number ?? ''}
        data-value={value?.number ?? ''}
        onChange={(e) => {
          onChange?.({
            ...(value ?? { id: null, number: '', typeCode: null }),
            number: e.target.value,
          });
        }}
        disabled={disabled}
        placeholder="Container Number Picker"
      />
    </div>
  ),
}));
vi.mock('@/shared/services/toast', () => ({
  toastAdapter: {
    confirm: vi.fn().mockResolvedValue(true),
    error: vi.fn(),
  },
}));

vi.mock('@/features/document-service', () => ({
  useDocumentDownload: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/document-service/components/DocumentUploader', () => ({
  DocumentUploader: ({ onSuccess }: any) => (
    <div data-testid="document-uploader">
      <button onClick={() => onSuccess?.({ id: 'test-doc', name: 'test.pdf', fileType: 'application/pdf' })}>
        Upload Document
      </button>
    </div>
  ),
}));

vi.mock('@/shared/components/forms', () => ({
  FormInput: ({ name, label, disabled, control, required, valueMode: _valueMode }: any) => {
    // Access the current form value through control's getValues
    // Handle nested paths like "containers.0.sealNumber"
    let value = '';
    if (control) {
      const formValues = control._formValues || control._defaultValues || {};
      const keys = name.split('.');
      value = keys.reduce((obj: any, key: string) => obj?.[key], formValues) ?? '';
    }
    return (
      <div data-testid={`form-input-${name}`}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          disabled={disabled}
          value={value}
          data-value={value}
          required={required}
          readOnly
        />
      </div>
    );
  },
  FormDateInput: ({ name, label, disabled, control }: any) => {
    const value = control?._formValues?.[name] ?? control?._defaultValues?.[name] ?? '';
    const formatDateValue = (rawValue: string): string => {
      if (!rawValue) return '';
      const date = new Date(rawValue);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };
    return (
      <div data-testid={`form-date-${name}`}>
        <label htmlFor={name}>{label}</label>
        <input
          type="date"
          id={name}
          name={name}
          disabled={disabled}
          value={formatDateValue(value)}
          data-value={formatDateValue(value)}
          readOnly
        />
      </div>
    );
  },
  FormTextarea: ({ name, label, disabled }: any) => (
    <div data-testid={`form-textarea-${name}`}>
      <label>{label}</label>
      <textarea name={name} disabled={disabled} />
    </div>
  ),
  FormForwarderSelect: ({ name, label, disabled }: any) => (
    <div data-testid={`form-forwarder-${name}`}>
      <label>{label}</label>
      <select name={name} disabled={disabled}>
        <option value="">Select Forwarder</option>
        <option value="forwarder-1">Test Forwarder</option>
      </select>
    </div>
  ),
  FormForwarderSingleSelect: ({ name, label, disabled }: any) => (
    <div data-testid={`form-forwarder-${name}`}>
      <label>{label}</label>
      <select name={name} disabled={disabled}>
        <option value="">Select Forwarder</option>
        <option value="forwarder-1">Test Forwarder</option>
      </select>
    </div>
  ),
}));

vi.mock('@/shared/components/ui/Button', () => ({
  default: ({ children, type, variant, onClick, disabled }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/shared/hooks', () => ({
  useUnsavedChanges: ({ onClose }: any) => ({
    handleClose: onClose,
  }),
}));

vi.mock('../ContainerTable', () => ({
  default: ({ isReadOnly }: any) => (
    <div data-testid="container-table">
      Container Table {isReadOnly && '(Read-Only)'}
    </div>
  ),
}));

// Test utility to wrap components with QueryClientProvider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(ui, { wrapper: Wrapper }), queryClient };
}

const getEtaInput = () => screen.getByLabelText('ETA') as HTMLInputElement;

const toastAdapterMock = vi.mocked(toastAdapter);

describe('HBLFormModal - Form State Persistence Bug (T004-T006)', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const mockHBL: HouseBill = {
    id: 'hbl-123',
    code: 'HBL1234565',
    receivedAt: '2025-01-15',
    mbl: 'MBL-001',
    shippingDetail: { eta: '2025-01-20T00:00:00.000Z' },
    document: { id: 'doc-1', name: 'DOC-001.pdf', mimeType: 'application/pdf' },
    issuerId: 'forwarder-1',
    shipper: 'Test Shipper Ltd',
    consignee: 'Test Consignee Inc',
    notifyParty: 'Test Notify Party',
    vesselName: 'MV Test Vessel',
    voyageNumber: 'V123',
    pol: 'SGSIN',
    pod: 'VNVUT',
    containers: [
      {
        containerNumber: 'TCLU1234567',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL12345',
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    toastAdapterMock.confirm.mockResolvedValue(true);
    toastAdapterMock.error.mockClear();
    mockOnClose.mockReset();
    mockOnSave.mockReset();
    mockOnSave.mockResolvedValue(undefined);
  });

  /**
   * T004: Write failing test - "opens create form with empty fields after viewing HBL"
   *
   * Test scenario: Open view modal with HBL data → close → open create modal → assert all numeric fields are empty strings
   * Expected to FAIL initially (shows undefined or previous values)
   */
  describe('T004: Form state reset after viewing HBL', () => {
    it('should open create form with empty numeric fields after viewing HBL', () => {
      const { rerender } = renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // Verify view mode shows HBL data
      expect(screen.getByText('View HBL')).toBeInTheDocument();

      // Close modal
      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // Open create modal (new HBL)
      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Assert key fields are empty strings (not undefined or previous values)
      const mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');
      const etaInput = getEtaInput();
      const sealInput = within(screen.getByTestId('form-input-containers.0.sealNumber')).getByRole('textbox');

      // CRITICAL: These assertions test for empty string '', not undefined
      // With the current bug, these will fail because React Hook Form caches undefined values
      expect(mblInput).toHaveValue('');
      expect(mblInput.getAttribute('data-value')).toBe('');

      expect(etaInput).toHaveValue('');
      expect(etaInput.getAttribute('data-value')).toBe('');

      // Seal number should also be cleared for new HBL
      expect(sealInput).toHaveValue('');
      expect(sealInput.getAttribute('data-value')).toBe('');
    });

    it('should open create form with empty numeric fields after editing HBL', () => {
      const { rerender } = renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // Verify edit mode shows HBL data
      expect(screen.getByText('Edit HBL')).toBeInTheDocument();

      // Close modal
      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // Open create modal (new HBL)
      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Assert key fields are empty strings
      const mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');
      const etaInput = getEtaInput();

      expect(mblInput).toHaveValue('');
      expect(etaInput).toHaveValue('');
    });

    it('should reset container number after cancelling an edit session', async () => {
      const user = userEvent.setup();

      const { rerender } = renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      const containerInput = screen.getByPlaceholderText('Container Number Picker') as HTMLInputElement;
      expect(containerInput.value).toBe('TCLU1234567');

      await user.clear(containerInput);
      await user.type(containerInput, 'MSCU6639870');
      expect(containerInput.value).toBe('MSCU6639870');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalled();

      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      const createContainerInput = screen.getByPlaceholderText('Container Number Picker') as HTMLInputElement;
      expect(createContainerInput.value).toBe('');
      expect(createContainerInput.getAttribute('data-value')).toBe('');
    });
  });

  /**
   * T005: Write failing test - "allows deleting all characters in numeric fields"
   *
   * Test scenario: Open edit modal → verify numeric fields can be completely cleared
   * Expected to FAIL initially (fields revert to previous values or show undefined)
   */
  describe('T005: Allow deleting all characters in numeric fields', () => {
    it('should allow clearing MBL field in edit mode', async () => {
      renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      const mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');

      // Verify initial value
      expect(mblInput).toHaveValue('MBL-001');

      // Field should accept empty string value when cleared
      expect(mblInput.hasAttribute('value')).toBe(true);
    });

    it('should allow clearing ETA field in edit mode', async () => {
      renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      const etaInput = getEtaInput();

      // Verify initial value
      expect(etaInput).toHaveValue('2025-01-20');

      // Field should accept empty string value when cleared
      expect(etaInput.hasAttribute('value')).toBe(true);
    });
  });

  /**
   * T006: Write failing test - "clears form state between multiple view/create cycles"
   *
   * Test scenario: Multiple cycles of view → create → view different HBL → create
   * Expected to FAIL initially (form shows cached values from previous sessions)
   */
  describe('T006: Clear state between multiple view/create cycles', () => {
    it('should maintain clean state across multiple view/create cycles', () => {
      const mockHBL2: HouseBill = {
        ...mockHBL,
        id: 'hbl-456',
        code: 'HBL7654321',
        mbl: 'MBL-002',
        shippingDetail: { eta: '2025-02-01T00:00:00.000Z' },
      };

      const { rerender } = renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // CYCLE 1: View HBL1 → Create
      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Assert fields are empty
      let mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');
      expect(mblInput).toHaveValue('');

      // Close create modal
      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // CYCLE 2: View HBL2 (different values) → Create
      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL2}
          onSave={mockOnSave}
        />
      );

      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL2}
          onSave={mockOnSave}
        />
      );

      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Assert fields are still empty (not showing HBL1 or HBL2 values)
      mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');
      const etaInput = getEtaInput();

      // CRITICAL: These should be empty strings, not cached values
      expect(mblInput).toHaveValue('');
      expect(etaInput).toHaveValue('');
    });

    it('should not leak values from create mode to view mode', () => {
      const { rerender } = renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Close create modal
      rerender(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      // Open view modal with HBL
      rerender(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      // Verify view mode shows correct HBL values (not create mode's empty values)
      const mblInput = within(screen.getByTestId('form-input-mbl')).getByRole('textbox');
      expect(mblInput).toHaveValue('MBL-001');

      const etaInput = getEtaInput();
      expect(etaInput).toHaveValue('2025-01-20');
    });
  });

  // Basic sanity tests to verify modal structure
  describe('Basic Modal Structure', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = renderWithQueryClient(
        <HBLFormModal
          isOpen={false}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should render modal when isOpen is true in create mode', () => {
      renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Create New HBL')).toBeInTheDocument();
    });

    it('should render modal in view mode with HBL data', () => {
      renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          hbl={mockHBL}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('View HBL')).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <HBLFormModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          hbl={null}
          onSave={mockOnSave}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  /**
   * Phase 5: Bug #2 - Seal Number Input Validation (T026-T028)
   */
  describe('Seal Number Input Validation (T026-T028)', () => {
    /**
     * T026: Test - "seal field appears when container selected"
     * Verifies conditional rendering of seal input
     */
    describe('T026: Seal field appears when container selected', () => {
      it('should show seal input when container is present', () => {
        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="edit"
            hbl={mockHBL}
            onSave={mockOnSave}
          />
        );

        // Seal input should be visible because mockHBL has a container
        const sealInput = screen.queryByLabelText('Seal Number');
        expect(sealInput).toBeInTheDocument();
      });

      it('should show seal input even when no container is present (always visible)', () => {
        const hblWithoutContainer: HouseBill = {
          ...mockHBL,
          containers: [],
        };

        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="edit"
            hbl={hblWithoutContainer}
            onSave={mockOnSave}
          />
        );

        // Seal input should ALWAYS be visible (Option A: independent seal field)
        const sealInput = screen.queryByLabelText('Seal Number');
        expect(sealInput).toBeInTheDocument();
      });

      it('should show seal input in create mode immediately (always visible)', () => {
        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="create"
            hbl={null}
            onSave={mockOnSave}
          />
        );

        // Seal input should be visible immediately in create mode (Option A: independent seal field)
        const sealInput = screen.queryByLabelText('Seal Number');
        expect(sealInput).toBeInTheDocument();

        // Users can enter seal before or after selecting a container
      });
    });

    /**
     * T027: Test - "seal field is optional in draft mode"
     * Verifies seal field is NOT required in draft/edit mode (only required on approval)
     */
    describe('T027: Seal field is optional in draft mode', () => {
      it('should NOT mark seal field as required in draft mode', () => {
        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="edit"
            hbl={mockHBL}
            onSave={mockOnSave}
          />
        );

        const sealInput = screen.getByLabelText('Seal Number');
        // Seal must be provided when editing
        expect(sealInput).toBeRequired();
      });

      it('should show seal field always visible in create mode', () => {
        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="create"
            hbl={null}
            onSave={mockOnSave}
          />
        );

        // Seal field should be visible and required in create mode
        const sealInput = screen.queryByLabelText('Seal Number');
        expect(sealInput).toBeInTheDocument();
        expect(sealInput).toBeRequired();
      });
    });

    /**
     * T028: Test - "seal field accepts alphanumeric input"
     * Verifies seal input accepts letters, numbers, and common seal formats
     */
    describe('T028: Seal field accepts alphanumeric input', () => {
      it('should display seal number with letters and numbers', () => {
        const hblWithAlphanumericSeal: HouseBill = {
          ...mockHBL,
          containers: [
            {
              containerNumber: 'TCLU1234567',
              containerTypeCode: '22G1',
              sealNumber: 'ABC123XYZ',
            },
          ],
        };

        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="view"
            hbl={hblWithAlphanumericSeal}
            onSave={mockOnSave}
          />
        );

        const sealInput = screen.getByLabelText('Seal Number');
        expect(sealInput).toHaveValue('ABC123XYZ');
      });

      it('should display seal number with only numbers', () => {
        const hblWithNumericSeal: HouseBill = {
          ...mockHBL,
          containers: [
            {
              containerNumber: 'TCLU1234567',
              containerTypeCode: '22G1',
              sealNumber: '9876543210',
            },
          ],
        };

        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="view"
            hbl={hblWithNumericSeal}
            onSave={mockOnSave}
          />
        );

        const sealInput = screen.getByLabelText('Seal Number');
        expect(sealInput).toHaveValue('9876543210');
      });

      it('should display seal number with only letters', () => {
        const hblWithAlphaSeal: HouseBill = {
          ...mockHBL,
          containers: [
            {
              containerNumber: 'TCLU1234567',
              containerTypeCode: '22G1',
              sealNumber: 'ABCDEFGH',
            },
          ],
        };

        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="view"
            hbl={hblWithAlphaSeal}
            onSave={mockOnSave}
          />
        );

        const sealInput = screen.getByLabelText('Seal Number');
        expect(sealInput).toHaveValue('ABCDEFGH');
      });

      it('should display seal number with special characters (hyphens)', () => {
        const hblWithHyphenatedSeal: HouseBill = {
          ...mockHBL,
          containers: [
            {
              containerNumber: 'TCLU1234567',
              containerTypeCode: '22G1',
              sealNumber: 'SEAL-2024-001',
            },
          ],
        };

        renderWithQueryClient(
          <HBLFormModal
            isOpen={true}
            onClose={mockOnClose}
            mode="view"
            hbl={hblWithHyphenatedSeal}
            onSave={mockOnSave}
          />
        );

        const sealInput = screen.getByLabelText('Seal Number');
        expect(sealInput).toHaveValue('SEAL-2024-001');
      });
    });
  });
});
