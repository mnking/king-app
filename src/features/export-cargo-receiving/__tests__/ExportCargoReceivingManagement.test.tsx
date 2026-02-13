import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/test/utils';

import ExportCargoReceivingManagement from '../components/ExportCargoReceivingManagement';
import { packingListsApi } from '@/services/apiPackingLists';
import { forwardersApi } from '@/services/apiForwarder';
import { exportServiceOrdersApi } from '@/services/apiExportOrders';
import type { ExportCargoReceivingPackingListListItem } from '../types';

vi.mock('@/services/apiPackingLists', () => ({
  packingListsApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/apiForwarder', () => ({
  forwardersApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/apiExportOrders', () => ({
  exportServiceOrdersApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/shared/components/DynamicFilter', () => ({
  DynamicFilter: ({
    onApplyFilter,
  }: {
    onApplyFilter?: (values: Record<string, string>) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onApplyFilter?.({
          search: 'HBL',
          forwarderId: 'fwd-1',
          status: 'APPROVED',
          containerNumber: 'CONT-001',
          orderBy: 'createdAt',
          orderDir: 'asc',
        })
      }
    >
      apply filter
    </button>
  ),
}));

vi.mock('react-hot-toast', () => ({
  toast: vi.fn(),
}));

const basePackingList: ExportCargoReceivingPackingListListItem = {
  id: 'pl-1',
  packingListNumber: 'PL-001',
  forwarderId: 'fwd-1',
  status: 'APPROVED',
  workingStatus: 'IN_PROGRESS',
  hblData: {
    containerNumber: 'CONT-001',
    containerType: '22G1',
    forwarderName: 'Forwarder A',
    consignee: 'Consignee A',
    shipper: 'Shipper A',
  },
  directionFlow: 'EXPORT',
  shippingDetail: {
    shipper: 'Shipper A',
    consignee: 'Consignee A',
    vesselName: null,
    voyageNumber: null,
    etd: null,
    pol: 'POL',
    pod: 'POD',
    directionFlow: 'EXPORT',
  },
};

describe('ExportCargoReceivingManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packingListsApi.getAll).mockResolvedValue({
      data: { results: [], total: 0 },
    } as any);
    vi.mocked(forwardersApi.getAll).mockResolvedValue({
      data: { results: [] },
    } as any);
    vi.mocked(exportServiceOrdersApi.getAll).mockResolvedValue({
      data: { results: [] },
    } as any);
  });

  it('requests export packing lists with initialized and in-progress statuses', async () => {
    render(<ExportCargoReceivingManagement />);

    await waitFor(() => {
      expect(packingListsApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          directionFlow: 'EXPORT',
          workingStatus: ['INITIALIZED', 'IN_PROGRESS'],
        }),
      );
    });
  });

  it('loads export orders for forwarders in the current packing list page', async () => {
    vi.mocked(packingListsApi.getAll).mockResolvedValue({
      data: { results: [basePackingList], total: 1 },
    } as any);

    render(<ExportCargoReceivingManagement />);

    await waitFor(() => {
      expect(exportServiceOrdersApi.getAll).toHaveBeenCalledWith({
        page: 1,
        itemsPerPage: 1000,
        status: 'all',
        forwarderId: 'fwd-1',
      });
    });
  });

  it('applies forwarder filter when requested', async () => {
    render(<ExportCargoReceivingManagement />);

    const user = userEvent.setup();
    const applyButton = await screen.findByRole('button', { name: /apply filter/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(packingListsApi.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'HBL',
          forwarderId: 'fwd-1',
          status: 'APPROVED',
          containerNumber: 'CONT-001',
          orderBy: 'createdAt',
          orderDir: 'asc',
        }),
      );
    });
  });

  it('prefers forwarder name from the forwarder list', async () => {
    vi.mocked(packingListsApi.getAll).mockResolvedValue({
      data: {
        results: [
          {
            ...basePackingList,
            hblData: {
              ...basePackingList.hblData,
              forwarderName: 'HBL Forwarder',
            },
          },
        ],
        total: 1,
      },
    } as any);
    vi.mocked(forwardersApi.getAll).mockResolvedValue({
      data: { results: [{ id: 'fwd-1', name: 'Forwarder A' }] },
    } as any);

    render(<ExportCargoReceivingManagement />);

    expect(await screen.findByText('Forwarder A')).toBeInTheDocument();
  });
});
