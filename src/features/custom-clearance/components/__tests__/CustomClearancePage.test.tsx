import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomClearancePage from '../CustomClearancePage';
import { useAuth } from '@/features/auth/useAuth';

const mockUseHBLs = vi.fn();
const mockUseUpdateHBL = vi.fn();
const mockUseForwarders = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/hbl-management/hooks/use-hbls-query', () => ({
  useHBLs: (...args: unknown[]) => mockUseHBLs(...args),
  useUpdateHBL: (...args: unknown[]) => mockUseUpdateHBL(...args),
}));

vi.mock('@/features/forwarder/hooks/use-forwarders-query', () => ({
  useForwarders: (...args: unknown[]) => mockUseForwarders(...args),
}));

vi.mock('../CustomClearanceTable', () => ({
  __esModule: true,
  default: ({ onEdit, canEdit }: { onEdit: () => void; canEdit?: boolean }) => (
    <button type="button" onClick={onEdit} disabled={!canEdit}>
      Edit
    </button>
  ),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe('CustomClearancePage RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHBLs.mockReturnValue({
      data: {
        results: [
          {
            id: 'hbl-1',
            code: 'HBL-001',
            issuerId: 'fwd-1',
            customsStatus: 'PENDING',
            document: null,
            createdAt: null,
            createdBy: null,
            updatedAt: null,
            updatedBy: null,
          },
        ],
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseUpdateHBL.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseForwarders.mockReturnValue({
      data: { results: [] },
    });
  });

  it('disables edit when missing write permission', () => {
    mockedUseAuth.mockReturnValue({
      can: vi.fn().mockReturnValue(false),
    } as any);

    render(<CustomClearancePage />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  it('enables edit when write permission is granted', () => {
    mockedUseAuth.mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    } as any);

    render(<CustomClearancePage />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeEnabled();
  });
});
