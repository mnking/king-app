import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useMoveLoadedContainerTable } from '../use-move-loaded-container-table';
import type { StuffedContainerMoveOutListItem } from '../../types';
import { StuffedMoveWorkingResultStatus } from '../../types';

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

vi.mock('../use-move-loaded-container-query', () => ({
  useMoveLoadedContainers: vi.fn(),
  useDeclareGetOutToCustoms: vi.fn(),
}));

import {
  useMoveLoadedContainers,
  useDeclareGetOutToCustoms,
} from '../use-move-loaded-container-query';

const mockUseMoveLoadedContainers = vi.mocked(useMoveLoadedContainers);
const mockUseDeclareGetOutToCustoms = vi.mocked(useDeclareGetOutToCustoms);

const baseRecord: StuffedContainerMoveOutListItem = {
  id: 'record-1',
  containerId: 'container-1',
  planStuffingId: 'plan-1',
  workingResultStatus: StuffedMoveWorkingResultStatus.MOVED,
  getOutContainerStatus: false,
  estimateMoveTime: '2026-01-17T04:09:00.000Z',
  etd: '2026-01-18T04:10:00.000Z',
  actualMoveTime: '2026-01-17T04:10:00.000Z',
  truck: {
    plateNumber: null,
    driverName: null,
  },
  customsDeclaration: {
    declaredAt: null,
    declaredBy: null,
    referenceNo: null,
  },
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-01-17T04:07:49.622Z',
  updatedAt: '2026-01-17T04:07:49.622Z',
  containerNumber: 'MSCU8149487',
  containerTypeCode: '22F1',
  containerSize: '22',
  planStuffingNumber: 'EPL260006',
  forwarder: 'FWD',
};

describe('use-move-loaded-container-table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMoveLoadedContainers.mockReturnValue({
      data: { results: [baseRecord], total: 1 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as any);
  });

  it('declares get-out on action', async () => {
    const declareMock = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mockUseDeclareGetOutToCustoms.mockReturnValue(declareMock as any);

    const { result } = renderHook(() =>
      useMoveLoadedContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    const declareAction = result.current.actions.find((action) => action.key === 'declare');
    expect(declareAction).toBeDefined();

    await declareAction?.onClick(baseRecord);

    expect(declareMock.mutateAsync).toHaveBeenCalledWith({
      id: baseRecord.id,
      payload: {},
    });
    expect(toast.success).toHaveBeenCalledWith('Get-out declared');
  });

  it('disables declare action for non-moved or declared containers', () => {
    mockUseDeclareGetOutToCustoms.mockReturnValue({ mutateAsync: vi.fn() } as any);

    const { result } = renderHook(() =>
      useMoveLoadedContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    const declareAction = result.current.actions.find((action) => action.key === 'declare');
    expect(declareAction).toBeDefined();

    const notMoved = { ...baseRecord, workingResultStatus: StuffedMoveWorkingResultStatus.RECEIVED };
    const alreadyDeclared = { ...baseRecord, getOutContainerStatus: true };

    expect(declareAction?.disabled?.(notMoved)).toBe(true);
    expect(declareAction?.disabled?.(alreadyDeclared)).toBe(true);
  });

  it('applies container and plan stuffing filters to the query params', async () => {
    mockUseDeclareGetOutToCustoms.mockReturnValue({ mutateAsync: vi.fn() } as any);

    const { result } = renderHook(() =>
      useMoveLoadedContainerTable({ canRead: false, canCheck: false, canWrite: true }),
    );

    result.current.handleApplyFilter({
      containerNumber: ['MSCU8149487', 'MSCU1234567'],
      planCode: ['EPL260006', 'EPL260007'],
    });

    await waitFor(() => {
      expect(mockUseMoveLoadedContainers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          itemsPerPage: 100,
          sortBy: 'planner',
          containerNumber: ['MSCU8149487', 'MSCU1234567'],
          planCode: ['EPL260006', 'EPL260007'],
        }),
        { enabled: true },
      );
    });
  });
});
