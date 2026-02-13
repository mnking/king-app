import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { HouseBill } from '@/features/hbl-management/types';
import { useApprovedHBLs, useContainerHBLs } from '../use-approved-hbls';
import { hblsApi } from '@/services/apiForwarder';

vi.mock('@/services/apiForwarder', () => ({
  hblsApi: {
    getAll: vi.fn(),
  },
}));

const mockHBLs: HouseBill[] = [
  {
    id: 'hbl-1',
    code: 'HBL001',
    receivedAt: '2025-01-01',
    document: 'doc.pdf',
    issuerId: 'issuer-1',
    shipper: 'Shipper A',
    consignee: 'Consignee A',
    notifyParty: 'Notify A',
    cargoDescription: 'Cargo A',
    packageCount: 10,
    packageType: 'CTN',
    cargoWeight: 100,
    volume: 1,
    vesselName: 'Vessel A',
    voyageNumber: 'V001',
    pol: 'VNHPH',
    pod: 'USLAX',
    containers: [{ containerNumber: 'MSCU1234567', containerTypeCode: '22G1', sealNumber: 'SEAL123' }],
    status: 'approved',
    marked: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  } as HouseBill,
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('use-approved-hbls hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useApprovedHBLs', () => {
    it('fetches approved HBLs with default params', async () => {
      vi.mocked(hblsApi.getAll).mockResolvedValue({
        data: { results: mockHBLs },
      } as any);

      const { result } = renderHook(() => useApprovedHBLs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(hblsApi.getAll).toHaveBeenCalledWith({
        status: 'Approved',
        itemsPerPage: 1000,
      });
      expect(result.current.data).toEqual(mockHBLs);
    });

    it('passes custom filters to the API', async () => {
      vi.mocked(hblsApi.getAll).mockResolvedValue({
        data: { results: mockHBLs },
      } as any);

      const filters = {
        issuerId: 'issuer-99',
        keywords: 'ABC',
        containerNumber: 'CONT1',
        sealNumber: 'SEAL1',
        sortField: 'code' as const,
        sortOrder: 'ASC' as const,
        page: 2,
        itemsPerPage: 25,
      };

      const { result } = renderHook(() => useApprovedHBLs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(hblsApi.getAll).toHaveBeenCalledWith({
        ...filters,
        status: 'Approved',
      });
    });
  });

  describe('useContainerHBLs', () => {
    it('does not fetch when container or seal is missing', async () => {
      const { result } = renderHook(() => useContainerHBLs('', ''), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.matchingHBLs).toEqual([]);
      });

      expect(hblsApi.getAll).not.toHaveBeenCalled();
    });

    it('passes container filters to the API', async () => {
      vi.mocked(hblsApi.getAll).mockResolvedValue({
        data: { results: mockHBLs },
      } as any);

      const filters = {
        issuerId: 'issuer-99',
        keywords: 'FRESH',
        sortField: 'code' as const,
        sortOrder: 'DESC' as const,
        itemsPerPage: 50,
      };

      const { result } = renderHook(
        () => useContainerHBLs('MSCU1234567', 'SEAL123', filters),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.matchingHBLs).toEqual(mockHBLs);
      });

      expect(hblsApi.getAll).toHaveBeenCalledWith({
        containerNumber: 'MSCU1234567',
        sealNumber: 'SEAL123',
        issuerId: 'issuer-99',
        keywords: 'FRESH',
        sortField: 'code',
        sortOrder: 'DESC',
        directionFlow: 'IMPORT',
        itemsPerPage: 50,
      });
    });
  });
});
