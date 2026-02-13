import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchReceiveEmptyContainers,
  setReceiveEmptyContainerCache,
  receiveEmptyContainerApi,
} from '../apiReceiveEmptyContainer';
import { apiFetch } from '@/shared/utils/api-client';
import type { EmptyContainerReceivingListItem } from '@/features/receive-empty-container/types';

vi.mock('@/shared/utils/api-client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

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

describe('apiReceiveEmptyContainer', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds query params with multiple statuses', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { results: [], total: 0 } }),
    } as any);

    await fetchReceiveEmptyContainers({
      page: 2,
      itemsPerPage: 20,
      search: 'MSCU',
      containerNumber: ['MSCU8149487', 'MSCU1234567'],
      planCode: ['EPL260006', 'EPL260007'],
      workingResultStatus: 'received',
      estimatedStuffingFrom: '2026-01-01',
      estimatedStuffingTo: '2026-01-31',
      sortBy: 'gate',
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockApiFetch.mock.calls[0];
    expect(url).toContain('/api/cfs/v1/export-plans/stuffing-containers?');
    expect(url).toContain('status=SPECIFIED');
    expect(url).toContain('status=CONFIRMED');
    expect(url).toContain('workingResultStatus=RECEIVED');
    expect(url).toContain('page=2');
    expect(url).toContain('itemsPerPage=20');
    expect(url).toContain('search=MSCU');
    expect(url).toContain('containerNumber=MSCU8149487');
    expect(url).toContain('containerNumber=MSCU1234567');
    expect(url).toContain('planCode=EPL260006');
    expect(url).toContain('planCode=EPL260007');
    expect(url).toContain('estimatedStuffingFrom=2026-01-01');
    expect(url).toContain('estimatedStuffingTo=2026-01-31');
    expect(url).toContain('sortBy=gate');
    expect(options).toMatchObject({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('returns cached record by id', async () => {
    setReceiveEmptyContainerCache([baseRecord]);

    return receiveEmptyContainerApi.getById('record-1').then((result) => {
      expect(result).toEqual(baseRecord);
      expect(result).not.toBe(baseRecord);
    });
  });

  it('submits checking result and updates cached status', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-17T06:00:00.000Z'));

    setReceiveEmptyContainerCache([baseRecord]);
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    const result = await receiveEmptyContainerApi.submitCheckingResult(
      baseRecord,
      'RECEIVE',
      {
        note: 'OK',
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
        plateNumber: '51C-888.99',
        driverName: 'Pham Van A',
      },
    );

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockApiFetch.mock.calls[0];
    expect(url).toContain('/api/cfs/v1/export-plans/plan-1/containers/container-1/checking-result');
    expect(options).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = JSON.parse(String((options as any).body));
    expect(body).toMatchObject({
      action: 'RECEIVE',
      checkingResult: {
        truckNumber: '51C-888.99',
        driverName: 'Pham Van A',
        note: 'OK',
        document: { id: 'doc-1', url: 'https://example.com/doc.pdf', name: 'doc.pdf' },
        image: { id: 'img-1', url: 'https://example.com/img.png', name: 'img.png' },
      },
    });

    expect(result.workingResultStatus).toBe('received');
    expect(result.receiveTime).toBe('2026-01-17T06:00:00.000Z');
  });

  it('updates move info and cache', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-17T06:10:00.000Z'));

    setReceiveEmptyContainerCache([baseRecord]);
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    const result = await receiveEmptyContainerApi.updateMoveInfo(baseRecord, {
      plateNumber: '51C-000.01',
      driverName: 'Driver B',
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockApiFetch.mock.calls[0];
    expect(url).toContain('/api/cfs/v1/export-plans/plan-1/containers/container-1/move');
    expect(options).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(result.truck).toEqual({
      plateNumber: '51C-000.01',
      driverName: 'Driver B',
    });
  });

  it('receiveContainer delegates to submitCheckingResult', async () => {
    const spy = vi.spyOn(receiveEmptyContainerApi, 'submitCheckingResult');
    spy.mockResolvedValue({ ...baseRecord, workingResultStatus: 'received' });

    await receiveEmptyContainerApi.receiveContainer(baseRecord, {
      plateNumber: '51C-000.01',
    });

    expect(spy).toHaveBeenCalledWith(baseRecord, 'RECEIVE', { plateNumber: '51C-000.01' });
  });

  it('rejectContainer delegates to submitCheckingResult', async () => {
    const spy = vi.spyOn(receiveEmptyContainerApi, 'submitCheckingResult');
    spy.mockResolvedValue({ ...baseRecord, workingResultStatus: 'rejected' });

    await receiveEmptyContainerApi.rejectContainer(baseRecord, {
      note: 'Reject',
    });

    expect(spy).toHaveBeenCalledWith(baseRecord, 'REJECT', { note: 'Reject' });
  });
});
