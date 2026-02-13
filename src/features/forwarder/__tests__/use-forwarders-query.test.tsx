import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useForwarders,
  useForwarder,
  useForwarderByCode,
  useCreateForwarder,
  useUpdateForwarder,
  useDeleteForwarder,
  forwarderQueryKeys,
} from '../hooks/use-forwarders-query';
import { forwardersApi } from '@/services/apiForwarder';
import type { Forwarder, ApiResponse, PaginatedResponse } from '../types';

// Mock the API
vi.mock('@/services/apiForwarder', () => ({
  forwardersApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Test data
const mockForwarder: Forwarder = {
  id: '1',
  code: 'PACFWD',
  name: 'Pacific Forwarding Partners',
  type: 'Forwarder',
  status: 'Active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockForwarders: Forwarder[] = [
  mockForwarder,
  {
    id: '2',
    code: 'EUROFWD',
    name: 'Euro Forwarding Ltd',
    type: 'Forwarder',
    status: 'Active',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockPaginatedResponse: PaginatedResponse<Forwarder> = {
  results: mockForwarders,
  total: 2,
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

describe('useForwarders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch forwarders successfully', async () => {
    vi.mocked(forwardersApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const { result } = renderHook(() => useForwarders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPaginatedResponse);
    expect(forwardersApi.getAll).toHaveBeenCalledWith({});
  });

  it('should handle query parameters', async () => {
    vi.mocked(forwardersApi.getAll).mockResolvedValue(
      mockApiResponse(mockPaginatedResponse),
    );

    const params = { page: 2, itemsPerPage: 10, status: 'Active' };
    const { result } = renderHook(() => useForwarders(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(forwardersApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should handle errors', async () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Failed to fetch forwarders');
    vi.mocked(forwardersApi.getAll).mockRejectedValue(error);

    const { result } = renderHook(() => useForwarders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });

    expect(result.current.error).toEqual(error);

    consoleError.mockRestore();
  });
});

describe('useForwarder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a single forwarder', async () => {
    vi.mocked(forwardersApi.getById).mockResolvedValue(
      mockApiResponse(mockForwarder),
    );

    const { result } = renderHook(() => useForwarder('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockForwarder);
    expect(forwardersApi.getById).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useForwarder(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(forwardersApi.getById).not.toHaveBeenCalled();
  });
});

describe('useForwarderByCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch forwarder by code', async () => {
    vi.mocked(forwardersApi.getByCode).mockResolvedValue(
      mockApiResponse(mockForwarder),
    );

    const { result } = renderHook(() => useForwarderByCode('PACFWD'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockForwarder);
    expect(forwardersApi.getByCode).toHaveBeenCalledWith('PACFWD');
  });
});

describe('useCreateForwarder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new forwarder', async () => {
    const newForwarder = {
      code: 'NEWFWD',
      name: 'New Forwarding',
      type: 'Forwarder' as const,
      status: 'Active' as const,
    };

    const createdForwarder: Forwarder = {
      id: '3',
      ...newForwarder,
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    };

    vi.mocked(forwardersApi.create).mockResolvedValue(
      mockApiResponse(createdForwarder),
    );

    const { result } = renderHook(() => useCreateForwarder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newForwarder);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(createdForwarder);
    expect(forwardersApi.create).toHaveBeenCalledWith(newForwarder);
  });

  it('should handle create errors', async () => {
    const error = new Error('Failed to create forwarder');
    vi.mocked(forwardersApi.create).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateForwarder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: 'TEST',
      name: 'Test',
      type: 'Forwarder',
      status: 'Active',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useUpdateForwarder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a forwarder', async () => {
    const updateData = { name: 'Updated Name' };
    const updatedForwarder: Forwarder = {
      ...mockForwarder,
      ...updateData,
      updatedAt: '2024-01-05T00:00:00.000Z',
    };

    vi.mocked(forwardersApi.update).mockResolvedValue(
      mockApiResponse(updatedForwarder),
    );

    const { result } = renderHook(() => useUpdateForwarder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: '1', data: updateData });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(updatedForwarder);
    expect(forwardersApi.update).toHaveBeenCalledWith('1', updateData);
  });
});

describe('useDeleteForwarder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a forwarder', async () => {
    vi.mocked(forwardersApi.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteForwarder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(forwardersApi.delete).toHaveBeenCalledWith('1');
  });

  it('should handle delete errors', async () => {
    const error = new Error('Failed to delete forwarder');
    vi.mocked(forwardersApi.delete).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteForwarder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('forwarderQueryKeys', () => {
  it('should generate correct query keys', () => {
    expect(forwarderQueryKeys.all).toEqual(['forwarders']);
    expect(forwarderQueryKeys.lists()).toEqual(['forwarders', 'list']);
    expect(forwarderQueryKeys.list({ page: 1 })).toEqual([
      'forwarders',
      'list',
      { page: 1 },
    ]);
    expect(forwarderQueryKeys.details()).toEqual(['forwarders', 'detail']);
    expect(forwarderQueryKeys.detail('1')).toEqual(['forwarders', 'detail', '1']);
    expect(forwarderQueryKeys.byCode('PACFWD')).toEqual([
      'forwarders',
      'code',
      'PACFWD',
    ]);
  });
});
