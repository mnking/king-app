import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchMoveLoadedContainers,
  moveLoadedContainerApi,
  setMoveLoadedContainerCache,
} from '../apiMoveLoadedContainer';
import { apiFetch } from '@/shared/utils/api-client';
import type { StuffedContainerMoveOutListItem } from '@/features/move-loaded-container/types';
import { StuffedMoveWorkingResultStatus } from '@/features/move-loaded-container/types';

vi.mock('@/shared/utils/api-client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

const baseRecord: StuffedContainerMoveOutListItem = {
  id: 'record-1',
  containerId: 'container-1',
  planStuffingId: 'plan-1',
  workingResultStatus: StuffedMoveWorkingResultStatus.WAITING,
  getOutContainerStatus: false,
  estimateMoveTime: '2026-01-17T04:10:00.000Z',
  etd: '2026-01-18T04:10:00.000Z',
  actualMoveTime: null,
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

describe('apiMoveLoadedContainer', () => {
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

    await fetchMoveLoadedContainers({
      page: 2,
      itemsPerPage: 20,
      search: 'MSCU',
      containerNumber: ['MSCU8149487', 'MSCU1234567'],
      planCode: ['EPL260006', 'EPL260007'],
      workingResultStatus: StuffedMoveWorkingResultStatus.MOVED,
      estimateMoveFrom: '2026-01-01',
      estimateMoveTo: '2026-01-31',
      sortBy: 'gate',
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockApiFetch.mock.calls[0];
    expect(url).toContain('/api/cfs/v1/export-plans/stuffing-containers?');
    expect(url).toContain('status=STUFFED');
    expect(url).toContain('workingResultStatus=MOVED');
    expect(url).toContain('page=2');
    expect(url).toContain('itemsPerPage=20');
    expect(url).toContain('search=MSCU');
    expect(url).toContain('containerNumber=MSCU8149487');
    expect(url).toContain('containerNumber=MSCU1234567');
    expect(url).toContain('planCode=EPL260006');
    expect(url).toContain('planCode=EPL260007');
    expect(url).toContain('estimateMoveFrom=2026-01-01');
    expect(url).toContain('estimateMoveTo=2026-01-31');
    expect(url).toContain('sortBy=gate');
    expect(options).toMatchObject({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('returns cached record by id', async () => {
    setMoveLoadedContainerCache([baseRecord]);

    return moveLoadedContainerApi.getById('record-1').then((result) => {
      expect(result).toEqual(baseRecord);
      expect(result).not.toBe(baseRecord);
    });
  });

  it('moves container to port and updates cached status', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-17T06:00:00.000Z'));

    setMoveLoadedContainerCache([baseRecord]);
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    const result = await moveLoadedContainerApi.moveContainerToPort('record-1', {
      plateNumber: '51C-888.99',
      driverName: 'Pham Van A',
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockApiFetch.mock.calls[0];
    expect(url).toContain(
      '/api/cfs/v1/export-plans/plan-1/containers/container-1/move',
    );
    expect(options).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result.workingResultStatus).toBe(StuffedMoveWorkingResultStatus.MOVED);
    expect(result.actualMoveTime).toBe('2026-01-17T06:00:00.000Z');
    expect(result.truck).toEqual({
      plateNumber: '51C-888.99',
      driverName: 'Pham Van A',
    });
  });
});
