import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test';
import ContainerCyclesPage from '../components/container-cycles/ContainerCyclesPage';

const useContainerCycleListMock = vi.fn();
const useContainerCyclesMock = vi.fn();
const useContainerCycleMock = vi.fn();
const canMock = vi.fn();

vi.mock('../hooks/use-container-cycles', () => ({
  useContainerCycleList: () => useContainerCycleListMock(),
  useContainerCycles: () => useContainerCyclesMock(),
  useContainerCycle: () => useContainerCycleMock(),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    can: canMock,
  }),
}));

vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useContainerCycleListMock.mockReturnValue({
    data: { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  useContainerCyclesMock.mockReturnValue({
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    isCreating: false,
    isUpdating: false,
  });
  useContainerCycleMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
  });
});

describe('ContainerCyclesPage', () => {
  it('does not render the New Cycle action even for users with manage rights', () => {
    canMock.mockReturnValue(true);

    render(<ContainerCyclesPage />);

    expect(screen.queryByText('New Cycle')).not.toBeInTheDocument();
  });
});
