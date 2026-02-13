import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test';
import ContainerListPage from '../components/container-list/ContainerListPage';

const mocks = vi.hoisted(() => ({
  useContainerListMock: vi.fn(),
  useCreateContainerMock: vi.fn(),
  useUpdateContainerMock: vi.fn(),
  useDeleteContainerMock: vi.fn(),
  useContainerTypeListMock: vi.fn(),
  canMock: vi.fn(),
}));

const {
  useContainerListMock,
  useCreateContainerMock,
  useUpdateContainerMock,
  useDeleteContainerMock,
  useContainerTypeListMock,
  canMock,
} = mocks;

vi.mock('../hooks/use-containers-query', () => ({
  useContainerList: () => useContainerListMock(),
  useCreateContainer: () => useCreateContainerMock(),
  useUpdateContainer: () => useUpdateContainerMock(),
  useDeleteContainer: () => useDeleteContainerMock(),
}));

vi.mock('../hooks/use-container-types-query', () => ({
  useContainerTypeList: () => mocks.useContainerTypeListMock(),
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

vi.mock('../components/container-list/ContainerFormModal', () => ({
  ContainerFormModal: ({ isOpen, onSubmit }: any) =>
    isOpen ? (
      <div>
        <button onClick={() => onSubmit({ number: 'TEST0000001', containerTypeCode: '22G1' })}>
          Save Container
        </button>
      </div>
    ) : null,
}));

vi.mock('../components/container-detail/ContainerDetailModal', () => ({
  ContainerDetailModal: () => null,
}));

const baseListResult = {
  data: {
    results: [
      {
        id: '1',
        number: 'MSCU6639870',
        containerTypeCode: '22G1',
        containerType: { code: '22G1', size: '20ft', description: 'Dry', id: 'type-22g1', createdAt: '', updatedAt: '' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ],
    total: 1,
  },
  isLoading: false,
  isFetching: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useContainerListMock.mockReturnValue(baseListResult);
  useContainerTypeListMock.mockReturnValue({ data: { results: [], total: 0 }, isLoading: false });
  useCreateContainerMock.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  });
  useUpdateContainerMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useDeleteContainerMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe('ContainerListPage', () => {
  it('renders container rows without exposing a create action', () => {
    canMock.mockImplementation((permission: string) => permission === 'container_management:read');

    render(<ContainerListPage />);

    expect(screen.getByText('Container Number')).toBeInTheDocument();
    expect(screen.getByText('MSCU6639870')).toBeInTheDocument();
    expect(screen.queryByText('Add container')).not.toBeInTheDocument();
  });
});
