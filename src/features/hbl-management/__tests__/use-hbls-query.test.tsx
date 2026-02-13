import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useHBLs,
  useHBL,
  useCreateHBL,
  useUpdateHBL,
  useApproveHBL,
  useMarkHBLDone,
  useDeleteHBL,
  hblQueryKeys,
} from '../hooks/use-hbls-query';
import { hblsApi } from '@/services/apiForwarder';
import type { HouseBill, ApiResponse, PaginatedResponse } from '../types';

// Mock the API
vi.mock('@/services/apiForwarder', () => ({
  hblsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    approve: vi.fn(),
    markDone: vi.fn(),
    delete: vi.fn(),
  },
}));

// Test data
const mockHBL: HouseBill = {
  id: '1',
  code: 'HBL1234565',
  receivedAt: '2024-01-18T00:00:00.000Z',
  document: { id: 'doc-1', name: 'DOC-1234567.pdf', mimeType: 'application/pdf' },
  issuerId: 'fwd-1',
  shipper: 'Pacific Exports Ltd',
  consignee: 'Harbor Imports LLC',
  notifyParty: 'Harbor Imports LLC - LA Branch',
  cargoDescription: 'Consumer electronics',
  packageCount: 120,
  packageType: 'CTN',
  cargoWeight: 2450.75,
  volume: 18.4,
  vesselName: 'Horizon Trader',
  voyageNumber: 'HZ1234',
  pol: 'SGSIN',
  pod: 'USLAX',
  containers: [
    {
      containerNumber: 'MSCU6639871',
      containerTypeCode: '22G1',
      sealNumber: 'SEAL1234567',
    },
  ],
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockHBLs: HouseBill[] = [mockHBL];

const mockPaginatedResponse: PaginatedResponse<HouseBill> = {
  results: mockHBLs,
  total: 1,
};

const mockApiResponse = <T,>(data: T): ApiResponse<T> => ({
  statusCode: 200,
  data,
});

// Wrapper component for tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHBLs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch HBLs successfully', async () => {
    vi.mocked(hblsApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const { result } = renderHook(() => useHBLs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPaginatedResponse);
    expect(hblsApi.getAll).toHaveBeenCalledWith({});
  });

  it('should handle query parameters including issuerId', async () => {
    vi.mocked(hblsApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const params = { page: 1, itemsPerPage: 20, issuerId: 'fwd-1' };
    const { result } = renderHook(() => useHBLs(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(hblsApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should pass container and seal filters to the API', async () => {
    vi.mocked(hblsApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const params = {
      page: 2,
      itemsPerPage: 50,
      containerNumber: 'MSCU6639871',
      sealNumber: 'SEAL123456',
    };

    const { result } = renderHook(() => useHBLs(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(hblsApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should pass receivedAt filter to the API', async () => {
    vi.mocked(hblsApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const params = {
      receivedAt: '2024-07-10',
    };

    const { result } = renderHook(() => useHBLs(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(hblsApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should handle errors', async () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Failed to fetch HBLs');
    vi.mocked(hblsApi.getAll).mockRejectedValue(error);

    const { result } = renderHook(() => useHBLs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });

    expect(result.current.error).toEqual(error);

    consoleError.mockRestore();
  });
});

describe('useHBL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a single HBL', async () => {
    vi.mocked(hblsApi.getById).mockResolvedValue(mockApiResponse(mockHBL));

    const { result } = renderHook(() => useHBL('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockHBL);
    expect(hblsApi.getById).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useHBL(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(hblsApi.getById).not.toHaveBeenCalled();
  });
});

describe('useCreateHBL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new HBL', async () => {
    const newHBL = {
      code: 'HBL999',
      receivedAt: '2024-01-20T00:00:00.000Z',
      document: { id: 'doc-999', name: 'DOC-999.pdf', mimeType: 'application/pdf' },
      issuerId: 'fwd-1',
      shipper: 'Test Shipper',
      consignee: 'Test Consignee',
      notifyParty: 'Test Notify',
      cargoDescription: 'Test Cargo',
      packageCount: 10,
      packageType: 'CTN',
      cargoWeight: 100,
      volume: 5,
      vesselName: 'Test Vessel',
      voyageNumber: 'TV001',
      pol: 'SGSIN',
      pod: 'USLAX',
      containers: [
        {
          containerNumber: 'TEST1234567',
          containerTypeCode: '20GP',
          sealNumber: 'SEAL999',
        },
      ],
    };

    const createdHBL: HouseBill = {
      id: '2',
      ...newHBL,
      status: 'pending',
      createdAt: '2024-01-20T00:00:00.000Z',
      updatedAt: '2024-01-20T00:00:00.000Z',
    };

    vi.mocked(hblsApi.create).mockResolvedValue(mockApiResponse(createdHBL));

    const { result } = renderHook(() => useCreateHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newHBL);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(createdHBL);
    expect(hblsApi.create).toHaveBeenCalledWith(newHBL);
  });
});

describe('useUpdateHBL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an HBL', async () => {
    const updateData = { vesselName: 'Updated Vessel' };
    const updatedHBL: HouseBill = {
      ...mockHBL,
      ...updateData,
      updatedAt: '2024-01-25T00:00:00.000Z',
    };

    vi.mocked(hblsApi.update).mockResolvedValue(mockApiResponse(updatedHBL));

    const { result } = renderHook(() => useUpdateHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: '1', data: updateData });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(updatedHBL);
    expect(hblsApi.update).toHaveBeenCalledWith('1', updateData);
  });
});

describe('useApproveHBL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should approve an HBL', async () => {
    const approvedHBL: HouseBill = {
      ...mockHBL,
      status: 'approved',
      updatedAt: '2024-01-30T00:00:00.000Z',
    };

    vi.mocked(hblsApi.approve).mockResolvedValue(mockApiResponse(approvedHBL));

    const { result } = renderHook(() => useApproveHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(approvedHBL);
    expect(hblsApi.approve).toHaveBeenCalledWith('1');
  });

  it('should handle approval errors and rollback', async () => {
    const error = new Error('Failed to approve HBL');
    vi.mocked(hblsApi.approve).mockRejectedValue(error);

    const { result } = renderHook(() => useApproveHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useMarkHBLDone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark HBL as done', async () => {
    const doneHBL: HouseBill = {
      ...mockHBL,
      status: 'done',
      marked: true,
      updatedAt: '2024-02-01T00:00:00.000Z',
    };

    vi.mocked(hblsApi.markDone).mockResolvedValue(mockApiResponse(doneHBL));

    const { result } = renderHook(() => useMarkHBLDone(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: '1', marked: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(doneHBL);
    expect(hblsApi.markDone).toHaveBeenCalledWith('1', true);
  });

  it('should unmark HBL as done', async () => {
    const unmarkedHBL: HouseBill = {
      ...mockHBL,
      status: 'approved',
      marked: false,
      updatedAt: '2024-02-02T00:00:00.000Z',
    };

    vi.mocked(hblsApi.markDone).mockResolvedValue(mockApiResponse(unmarkedHBL));

    const { result } = renderHook(() => useMarkHBLDone(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: '1', marked: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(unmarkedHBL);
    expect(hblsApi.markDone).toHaveBeenCalledWith('1', false);
  });

  it('should handle mark done errors and rollback', async () => {
    const error = new Error('Failed to mark HBL as done');
    vi.mocked(hblsApi.markDone).mockRejectedValue(error);

    const { result } = renderHook(() => useMarkHBLDone(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: '1', marked: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useDeleteHBL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an HBL', async () => {
    vi.mocked(hblsApi.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(hblsApi.delete).toHaveBeenCalledWith('1');
  });

  it('should handle delete errors', async () => {
    const error = new Error('Failed to delete HBL');
    vi.mocked(hblsApi.delete).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteHBL(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('hblQueryKeys', () => {
  it('should generate correct query keys', () => {
    expect(hblQueryKeys.all).toEqual(['hbls']);
    expect(hblQueryKeys.lists()).toEqual(['hbls', 'list']);
    expect(hblQueryKeys.list({ page: 1 })).toEqual(['hbls', 'list', { page: 1 }]);
    expect(hblQueryKeys.details()).toEqual(['hbls', 'detail']);
    expect(hblQueryKeys.detail('1')).toEqual(['hbls', 'detail', '1']);
    expect(hblQueryKeys.byForwarder('fwd-1')).toEqual(['hbls', 'forwarder', 'fwd-1']);
  });
});
