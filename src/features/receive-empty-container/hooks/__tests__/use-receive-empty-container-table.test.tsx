import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useReceiveEmptyContainerTable } from '../use-receive-empty-container-table';
import type { EmptyContainerReceivingListItem } from '../../types';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../use-receive-empty-container-query', () => ({
  useReceiveEmptyContainers: vi.fn(),
  useDeclareGetInEmptyContainer: vi.fn(),
}));

import {
  useReceiveEmptyContainers,
  useDeclareGetInEmptyContainer,
} from '../use-receive-empty-container-query';

const mockUseReceiveEmptyContainers = vi.mocked(useReceiveEmptyContainers);
const mockUseDeclareGetInEmptyContainer = vi.mocked(useDeclareGetInEmptyContainer);

const baseRecord: EmptyContainerReceivingListItem = {
  id: 'record-1',
  containerId: 'container-1',
  planStuffingId: 'plan-1',
  workingResultStatus: 'received',
  getInEmptyContainerStatus: false,
  receiveTime: '2026-01-17T04:12:00.000Z',
  inspection: {
    note: null,
    documents: [],
    images: [],
  },
  truck: {
    plateNumber: null,
    driverName: null,
  },
  customsDeclaration: {
    declaredAt: null,
    declaredBy: null,
    referenceNo: null,
  },
  createdAt: '2026-01-17T04:07:49.622Z',
  updatedAt: '2026-01-17T04:07:49.622Z',
  containerPositionStatus: null,
  containerNumber: 'MSCU8149487',
  containerTypeCode: '22F1',
  containerSize: '22',
  planStuffingNumber: 'EPL260006',
  estimatedStuffingTime: null,
};

describe('use-receive-empty-container-table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReceiveEmptyContainers.mockReturnValue({
      data: { results: [baseRecord], total: 1 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as any);
  });

  it('invokes customs declaration on get-in action', async () => {
    const declareMock = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mockUseDeclareGetInEmptyContainer.mockReturnValue(declareMock as any);

    const { result } = renderHook(() =>
      useReceiveEmptyContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    const getInAction = result.current.actions.find((action) => action.key === 'get-in');
    expect(getInAction).toBeDefined();

    await getInAction?.onClick(baseRecord);

    expect(declareMock.mutateAsync).toHaveBeenCalledWith(baseRecord);
    expect(toast.success).toHaveBeenCalledWith('Customs declaration submitted.');
  });

  it('disables get-in action for non-received or declared containers', () => {
    mockUseDeclareGetInEmptyContainer.mockReturnValue({ mutateAsync: vi.fn() } as any);

    const { result } = renderHook(() =>
      useReceiveEmptyContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    const getInAction = result.current.actions.find((action) => action.key === 'get-in');
    expect(getInAction).toBeDefined();

    const notReceived = { ...baseRecord, workingResultStatus: 'waiting' };
    const alreadyDeclared = { ...baseRecord, getInEmptyContainerStatus: true };

    expect(getInAction?.disabled?.(notReceived)).toBe(true);
    expect(getInAction?.disabled?.(alreadyDeclared)).toBe(true);
  });

  it('applies container and plan stuffing filters to the query params', async () => {
    mockUseDeclareGetInEmptyContainer.mockReturnValue({ mutateAsync: vi.fn() } as any);

    const { result } = renderHook(() =>
      useReceiveEmptyContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    result.current.handleApplyFilter({
      containerNumber: ['MSCU8149487', 'MSCU1234567'],
      planCode: ['EPL260006', 'EPL260007'],
    });

    await waitFor(() => {
      expect(mockUseReceiveEmptyContainers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          itemsPerPage: 100,
          sortBy: 'planner',
          containerNumber: ['MSCU8149487', 'MSCU1234567'],
          planCode: ['EPL260006', 'EPL260007'],
        }),
      );
    });
  });
});
