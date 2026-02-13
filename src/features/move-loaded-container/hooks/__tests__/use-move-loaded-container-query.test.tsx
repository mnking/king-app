import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useDeclareGetOutToCustoms,
  useEditMovedContainerInfo,
  useMoveLoadedContainer,
  useMoveLoadedContainers,
  useMoveContainerToPort,
  moveLoadedContainerQueryKeys,
} from '../use-move-loaded-container-query';
import {
  fetchMoveLoadedContainers,
  moveLoadedContainerApi,
  setMoveLoadedContainerCache,
} from '@/services/apiMoveLoadedContainer';
import { exportPlansApi } from '@/services/apiExportPlans';
import type {
  MoveLoadedContainerQueryResult,
  StuffedContainerMoveOutListItem,
  StuffingContainerListItem,
} from '../../types';
import { StuffedMoveWorkingResultStatus } from '../../types';

vi.mock('@/services/apiMoveLoadedContainer', () => ({
  fetchMoveLoadedContainers: vi.fn(),
  moveLoadedContainerApi: {
    getById: vi.fn(),
    moveContainerToPort: vi.fn(),
    editMovedContainerInfo: vi.fn(),
    declareGetOutToCustoms: vi.fn(),
  },
  setMoveLoadedContainerCache: vi.fn(),
}));

vi.mock('@/services/apiExportPlans', () => ({
  exportPlansApi: {
    updateContainer: vi.fn(),
  },
}));

const mockFetchMoveLoadedContainers = vi.mocked(fetchMoveLoadedContainers);
const mockMoveLoadedContainerApi = vi.mocked(moveLoadedContainerApi, true);
const mockSetMoveLoadedContainerCache = vi.mocked(setMoveLoadedContainerCache);
const mockExportPlansApi = vi.mocked(exportPlansApi, true);

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

const baseListItem: StuffingContainerListItem = {
  id: 'container-1',
  planId: 'plan-1',
  planCode: 'EPL260006',
  containerNumber: 'MSCU8149487',
  containerTypeCode: '22F1',
  workingResultStatus: 'MOVED',
  isContainerOut: true,
  isContainerIn: false,
  actualMoveTime: '2026-01-17T04:10:00.000Z',
  receivedAt: null,
  estimateMoveTime: '2026-01-17T04:09:00.000Z',
  etd: '2026-01-18T04:10:00.000Z',
  forwarderCode: 'FWD',
};

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('use-move-loaded-container-query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps stuffing containers to move loaded container records', async () => {
    mockFetchMoveLoadedContainers.mockResolvedValue({
      results: [baseListItem],
      total: 1,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useMoveLoadedContainers({ page: 1, itemsPerPage: 10 }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.results[0]).toMatchObject({
      id: 'container-1',
      planStuffingId: 'plan-1',
      planStuffingNumber: 'EPL260006',
      workingResultStatus: 'moved',
      getOutContainerStatus: true,
      containerTypeCode: '22F1',
      containerSize: '22',
      estimateMoveTime: '2026-01-17T04:09:00.000Z',
      actualMoveTime: '2026-01-17T04:10:00.000Z',
      forwarder: 'FWD',
    });

    expect(mockSetMoveLoadedContainerCache).toHaveBeenCalledTimes(1);
  });

  it('does not fetch move loaded container detail without id', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useMoveLoadedContainer(''), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockMoveLoadedContainerApi.getById).not.toHaveBeenCalled();
  });

  it('updates cache on move container mutation', async () => {
    const updatedRecord = { ...baseRecord, workingResultStatus: StuffedMoveWorkingResultStatus.MOVED };
    mockMoveLoadedContainerApi.moveContainerToPort.mockResolvedValue(updatedRecord);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(moveLoadedContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<MoveLoadedContainerQueryResult>(
      moveLoadedContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useMoveContainerToPort(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: baseRecord.id,
      payload: { plateNumber: '51C-888.99', driverName: 'Pham Van A' },
    });

    const detail = queryClient.getQueryData<StuffedContainerMoveOutListItem>(
      moveLoadedContainerQueryKeys.detail(baseRecord.id),
    );
    const list = queryClient.getQueryData<MoveLoadedContainerQueryResult>(
      moveLoadedContainerQueryKeys.list({ page: 1 }),
    );

    expect(detail?.workingResultStatus).toBe('moved');
    expect(list?.results[0].workingResultStatus).toBe('moved');
  });

  it('updates cache on edit moved container mutation', async () => {
    mockExportPlansApi.updateContainer.mockResolvedValue({} as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(moveLoadedContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<MoveLoadedContainerQueryResult>(
      moveLoadedContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useEditMovedContainerInfo(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      record: baseRecord,
      payload: { plateNumber: '51C-000.01', driverName: 'Driver B' },
    });

    const detail = queryClient.getQueryData<StuffedContainerMoveOutListItem>(
      moveLoadedContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.truck.plateNumber).toBe('51C-000.01');
  });

  it('updates cache on get-out declaration mutation', async () => {
    const updatedRecord = {
      ...baseRecord,
      getOutContainerStatus: true,
      customsDeclaration: {
        ...baseRecord.customsDeclaration,
        referenceNo: 'REF-1',
      },
    };
    mockMoveLoadedContainerApi.declareGetOutToCustoms.mockResolvedValue(updatedRecord);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(moveLoadedContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<MoveLoadedContainerQueryResult>(
      moveLoadedContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useDeclareGetOutToCustoms(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: baseRecord.id,
      payload: { referenceNo: 'REF-1' },
    });

    const detail = queryClient.getQueryData<StuffedContainerMoveOutListItem>(
      moveLoadedContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.getOutContainerStatus).toBe(true);
  });
});
