import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useReceiveEmptyContainers,
  useReceiveEmptyContainer,
  useReceiveContainer,
  useRejectContainer,
  useUpdateMoveInfo,
  useUpdateCheckingInfo,
  useDeclareGetInEmptyContainer,
  receiveEmptyContainerQueryKeys,
} from '../use-receive-empty-container-query';
import {
  fetchReceiveEmptyContainers,
  receiveEmptyContainerApi,
  setReceiveEmptyContainerCache,
} from '@/services/apiReceiveEmptyContainer';
import { exportPlansApi } from '@/services/apiExportPlans';
import type {
  EmptyContainerReceivingListItem,
  ReceiveEmptyContainerQueryResult,
  StuffingContainerListItem,
} from '../../types';

vi.mock('@/services/apiReceiveEmptyContainer', () => ({
  fetchReceiveEmptyContainers: vi.fn(),
  receiveEmptyContainerApi: {
    getById: vi.fn(),
    receiveContainer: vi.fn(),
    rejectContainer: vi.fn(),
    updateMoveInfo: vi.fn(),
  },
  setReceiveEmptyContainerCache: vi.fn(),
}));

vi.mock('@/services/apiExportPlans', () => ({
  exportPlansApi: {
    updateContainer: vi.fn(),
    declareContainerCustoms: vi.fn(),
  },
}));

const mockFetchReceiveEmptyContainers = vi.mocked(fetchReceiveEmptyContainers);
const mockReceiveEmptyContainerApi = vi.mocked(receiveEmptyContainerApi, true);
const mockSetReceiveEmptyContainerCache = vi.mocked(setReceiveEmptyContainerCache);
const mockExportPlansApi = vi.mocked(exportPlansApi, true);

const baseRecord: EmptyContainerReceivingListItem = {
  id: 'record-1',
  containerId: 'container-1',
  planStuffingId: 'plan-1',
  workingResultStatus: 'waiting',
  getInEmptyContainerStatus: false,
  receiveTime: null,
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

const baseListItem: StuffingContainerListItem = {
  id: 'container-1',
  planId: 'plan-1',
  planCode: 'EPL260006',
  containerNumber: 'MSCU8149487',
  containerTypeCode: '22F1',
  workingResultStatus: 'RECEIVED',
  isContainerOut: false,
  isContainerIn: true,
  actualMoveTime: '2026-01-17T04:10:00.000Z',
  receivedAt: '2026-01-17T04:12:00.000Z',
  estimateMoveTime: '2026-01-17T04:09:00.000Z',
  etd: null,
  forwarderCode: null,
};

const createWrapper = (queryClient: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('use-receive-empty-container-query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps stuffing containers to receive empty container records', async () => {
    mockFetchReceiveEmptyContainers.mockResolvedValue({
      results: [baseListItem],
      total: 1,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useReceiveEmptyContainers({ page: 1, itemsPerPage: 10 }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.results[0]).toMatchObject({
      id: 'container-1',
      planStuffingId: 'plan-1',
      planStuffingNumber: 'EPL260006',
      workingResultStatus: 'received',
      receiveTime: '2026-01-17T04:12:00.000Z',
      getInEmptyContainerStatus: true,
      containerTypeCode: '22F1',
      containerSize: '22',
      estimatedStuffingTime: '2026-01-17T04:09:00.000Z',
    });

    expect(mockSetReceiveEmptyContainerCache).toHaveBeenCalledTimes(1);
  });

  it('does not fetch receive empty container detail without id', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useReceiveEmptyContainer(''), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockReceiveEmptyContainerApi.getById).not.toHaveBeenCalled();
  });

  it('updates cache on receive container mutation', async () => {
    const updatedRecord = { ...baseRecord, workingResultStatus: 'received' };
    mockReceiveEmptyContainerApi.receiveContainer.mockResolvedValue(updatedRecord);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(receiveEmptyContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useReceiveContainer(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      record: baseRecord,
      payload: { note: 'OK' },
    });

    const detail = queryClient.getQueryData<EmptyContainerReceivingListItem>(
      receiveEmptyContainerQueryKeys.detail(baseRecord.id),
    );
    const list = queryClient.getQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
    );

    expect(detail?.workingResultStatus).toBe('received');
    expect(list?.results[0].workingResultStatus).toBe('received');
  });

  it('updates checking info via export plan update', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-17T08:00:00.000Z'));
    mockExportPlansApi.updateContainer.mockResolvedValue({} as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(receiveEmptyContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useUpdateCheckingInfo(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      record: baseRecord,
      payload: {
        note: 'Updated',
        plateNumber: '51C-888.99',
        driverName: 'Pham Van A',
        documents: [
          {
            id: 'doc-1',
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            url: 'https://example.com/doc.pdf',
            sizeBytes: 10,
          },
        ],
        images: [
          {
            id: 'img-1',
            name: 'img.png',
            mimeType: 'image/png',
            url: 'https://example.com/img.png',
            sizeBytes: 10,
          },
        ],
      },
    });

    expect(mockExportPlansApi.updateContainer).toHaveBeenCalledWith('plan-1', 'container-1', {
      checkingResult: {
        truckNumber: '51C-888.99',
        driverName: 'Pham Van A',
        note: 'Updated',
        document: { id: 'doc-1', url: 'https://example.com/doc.pdf', name: 'doc.pdf' },
        image: { id: 'img-1', url: 'https://example.com/img.png', name: 'img.png' },
      },
    });

    const detail = queryClient.getQueryData<EmptyContainerReceivingListItem>(
      receiveEmptyContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.inspection.note).toBe('Updated');
    expect(detail?.truck.plateNumber).toBe('51C-888.99');
  });

  it('declares get-in empty container and updates cache', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-17T08:30:00.000Z'));
    mockExportPlansApi.declareContainerCustoms.mockResolvedValue({} as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(receiveEmptyContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useDeclareGetInEmptyContainer(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(baseRecord);

    expect(mockExportPlansApi.declareContainerCustoms).toHaveBeenCalledWith('plan-1', 'container-1', {
      declarationType: 'GET_IN_EMPTY',
    });

    const detail = queryClient.getQueryData<EmptyContainerReceivingListItem>(
      receiveEmptyContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.getInEmptyContainerStatus).toBe(true);
  });

  it('updates move info in cache via updateMoveInfo', async () => {
    const updatedRecord = {
      ...baseRecord,
      truck: { plateNumber: '51C-000.01', driverName: 'Driver B' },
    };
    mockReceiveEmptyContainerApi.updateMoveInfo.mockResolvedValue(updatedRecord);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(receiveEmptyContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useUpdateMoveInfo(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      record: baseRecord,
      payload: { plateNumber: '51C-000.01', driverName: 'Driver B' },
    });

    const detail = queryClient.getQueryData<EmptyContainerReceivingListItem>(
      receiveEmptyContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.truck.plateNumber).toBe('51C-000.01');
  });

  it('reject container mutation updates cache', async () => {
    const updatedRecord = { ...baseRecord, workingResultStatus: 'rejected' };
    mockReceiveEmptyContainerApi.rejectContainer.mockResolvedValue(updatedRecord);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(receiveEmptyContainerQueryKeys.detail(baseRecord.id), baseRecord);
    queryClient.setQueryData<ReceiveEmptyContainerQueryResult>(
      receiveEmptyContainerQueryKeys.list({ page: 1 }),
      { results: [baseRecord], total: 1 },
    );

    const { result } = renderHook(() => useRejectContainer(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      record: baseRecord,
      payload: { note: 'Reject' },
    });

    const detail = queryClient.getQueryData<EmptyContainerReceivingListItem>(
      receiveEmptyContainerQueryKeys.detail(baseRecord.id),
    );

    expect(detail?.workingResultStatus).toBe('rejected');
  });
});
