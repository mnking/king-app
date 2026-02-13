import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test';
import ContainerTypesPage from '../components/container-types/ContainerTypesPage';

const useContainerTypeListMock = vi.fn();
const useContainerTypesCrudMock = vi.fn();
const canMock = vi.fn();

vi.mock('../hooks/use-container-types-query', () => ({
  useContainerTypeList: () => useContainerTypeListMock(),
  useContainerTypes: () => useContainerTypesCrudMock(),
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

vi.mock('../components/container-types/ContainerTypeFormModal', () => ({
  ContainerTypeFormModal: ({ isOpen, onSubmit }: any) =>
    isOpen ? (
      <button onClick={() => onSubmit({ code: '99X1', size: '99ft' })}>
        Save Type
      </button>
    ) : null,
}));

let crudInstance: {
  createEntity: ReturnType<typeof vi.fn>;
  updateEntity: ReturnType<typeof vi.fn>;
  deleteEntity: ReturnType<typeof vi.fn>;
  isCreating: boolean;
  isUpdating: boolean;
};

beforeEach(() => {
  vi.clearAllMocks();
  useContainerTypeListMock.mockReturnValue({
    data: { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  crudInstance = {
    createEntity: vi.fn().mockResolvedValue(undefined),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    isCreating: false,
    isUpdating: false,
  };
  useContainerTypesCrudMock.mockReturnValue(crudInstance);
});

describe('ContainerTypesPage', () => {
  it('calls createEntity when modal submits', async () => {
    const user = userEvent.setup();
    canMock.mockReturnValue(true);

    render(<ContainerTypesPage />);

    await user.click(screen.getByText('New Type'));
    await user.click(screen.getByText('Save Type'));

    expect(crudInstance.createEntity).toHaveBeenCalledWith({ code: '99X1', size: '99ft' });
  });
});
