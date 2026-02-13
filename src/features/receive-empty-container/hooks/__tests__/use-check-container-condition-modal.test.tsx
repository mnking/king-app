import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { EmptyContainerReceivingListItem } from '../../types';
import { useCheckContainerConditionModal } from '../use-check-container-condition-modal';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/document-service', () => ({
  useDocumentDownload: () => ({ mutate: vi.fn(), isPending: false }),
  useDocumentUpload: () => ({
    upload: vi.fn(),
    isUploading: false,
    status: 'idle',
  }),
}));

vi.mock('../use-receive-empty-container-query', () => ({
  useReceiveContainer: vi.fn(),
  useRejectContainer: vi.fn(),
  useUpdateCheckingInfo: vi.fn(),
}));

vi.mock('@/features/stuffing-planning/hooks/use-export-plans', () => ({
  useExportPlan: vi.fn(),
}));

import {
  useReceiveContainer,
  useRejectContainer,
  useUpdateCheckingInfo,
} from '../use-receive-empty-container-query';
import { useExportPlan } from '@/features/stuffing-planning/hooks/use-export-plans';

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
    plateNumber: 'OLD-PLATE',
    driverName: 'OLD-DRIVER',
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

describe('use-check-container-condition-modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReceiveContainer).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useRejectContainer).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('prefills document and image from export plan checking result', async () => {
    const updateCheckingInfo = { mutateAsync: vi.fn(), isPending: false };
    vi.mocked(useUpdateCheckingInfo).mockReturnValue(updateCheckingInfo as any);

    vi.mocked(useExportPlan).mockReturnValue({
      data: {
        id: 'plan-1',
        exportOrderId: 'order-1',
        code: 'EPL260006',
        status: 'CREATED',
        loadingBatch: null,
        containers: [
          {
            id: 'container-1',
            planId: 'plan-1',
            containerTypeCode: '22F1',
            containerNumber: 'MSCU8149487',
            status: 'SPECIFIED',
            equipmentBooked: true,
            appointmentBooked: true,
            estimatedStuffingAt: null,
            estimatedMoveAt: null,
            confirmedAt: null,
            stuffedAt: null,
            notes: null,
            assignedPackingListCount: 1,
            checkingResult: {
              note: 'Reject 2',
              document: { id: 'doc-1', url: 'https://example.com/doc.pdf', name: 'doc.pdf' },
              image: { id: 'img-1', url: 'https://example.com/img.png', name: 'img.png' },
              driverName: 'Pham Van A',
              truckNumber: '51C-888.99',
            },
          },
        ],
        packingLists: [],
        createdAt: '2026-01-17T04:07:49.622Z',
        updatedAt: '2026-01-17T04:07:49.622Z',
      },
    } as any);

    const { result } = renderHook(() =>
      useCheckContainerConditionModal({
        open: true,
        mode: 'edit',
        record: baseRecord,
        onClose: vi.fn(),
        canCheck: true,
        canWrite: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.documentFile?.id).toBe('doc-1');
    });

    expect(result.current.imageFile?.id).toBe('img-1');
    expect(result.current.containerLabel).toBe('22F1 (22)');
  });

  it('uses update checking info when saving in edit mode', async () => {
    const updateCheckingInfo = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    vi.mocked(useUpdateCheckingInfo).mockReturnValue(updateCheckingInfo as any);

    vi.mocked(useExportPlan).mockReturnValue({
      data: {
        id: 'plan-1',
        exportOrderId: 'order-1',
        code: 'EPL260006',
        status: 'CREATED',
        loadingBatch: null,
        containers: [
          {
            id: 'container-1',
            planId: 'plan-1',
            containerTypeCode: '22F1',
            containerNumber: 'MSCU8149487',
            status: 'SPECIFIED',
            equipmentBooked: true,
            appointmentBooked: true,
            estimatedStuffingAt: null,
            estimatedMoveAt: null,
            confirmedAt: null,
            stuffedAt: null,
            notes: null,
            assignedPackingListCount: 1,
            checkingResult: {
              note: 'Reject 2',
              document: { id: 'doc-1', url: 'https://example.com/doc.pdf', name: 'doc.pdf' },
              image: { id: 'img-1', url: 'https://example.com/img.png', name: 'img.png' },
              driverName: 'Pham Van A',
              truckNumber: '51C-888.99',
            },
          },
        ],
        packingLists: [],
        createdAt: '2026-01-17T04:07:49.622Z',
        updatedAt: '2026-01-17T04:07:49.622Z',
      },
    } as any);

    const { result } = renderHook(() =>
      useCheckContainerConditionModal({
        open: true,
        mode: 'edit',
        record: baseRecord,
        onClose: vi.fn(),
        canCheck: true,
        canWrite: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.documentFile?.id).toBe('doc-1');
    });

    await result.current.handleSave({
      note: 'Updated',
      plateNumber: '51C-888.99',
      driverName: 'Pham Van A',
      document: null,
      image: null,
    });

    expect(updateCheckingInfo.mutateAsync).toHaveBeenCalledWith({
      record: baseRecord,
      payload: {
        note: 'Updated',
        documents: [
          {
            id: 'doc-1',
            name: 'doc.pdf',
            mimeType: 'application/octet-stream',
            url: 'https://example.com/doc.pdf',
            sizeBytes: 0,
          },
        ],
        images: [
          {
            id: 'img-1',
            name: 'img.png',
            mimeType: 'application/octet-stream',
            url: 'https://example.com/img.png',
            sizeBytes: 0,
          },
        ],
        plateNumber: '51C-888.99',
        driverName: 'Pham Van A',
      },
    });
  });
});
