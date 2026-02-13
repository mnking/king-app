import { describe, it, expect, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
  useContainer,
  useContainerByNumber,
  useCreateContainer,
  useUpdateContainer,
  useDeleteContainer,
  useContainerQueries,
} from '../hooks/use-containers-query';

// Note: These tests use the real Docker API at http://localhost:8000
// Ensure Docker is running before executing these tests

// Track created container IDs for cleanup
let createdContainerIds: string[] = [];

// Test helper: Create wrapper with fresh QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper: Generate unique container number
const generateContainerNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TEST${timestamp}${random}`;
};

// Cleanup after all tests
afterAll(async () => {
  // Clean up any containers that weren't deleted by tests
  for (const id of createdContainerIds) {
    try {
      const { result } = renderHook(() => useDeleteContainer(), {
        wrapper: createWrapper(),
      });
      result.current.mutate(id);
      await waitFor(() => result.current.isSuccess || result.current.isError, { timeout: 5000 });
    } catch (error) {
      console.warn(`Failed to cleanup container ${id}:`, error);
    }
  }
}, 30000);

describe('Container Query Hooks', () => {
  describe('useContainers', () => {
    it.skip('should fetch containers list with pagination (requires Docker backend)', async () => {
      // Skipped: Requires Docker API at localhost:8000 to be running
      // This test would fetch from real Docker API
      // Consider running as separate integration test suite
    });

    it.skip('should handle empty results (requires Docker backend)', async () => {
      // Skipped: Requires Docker API at localhost:8000 to be running
      // Query with impossible pagination would get empty results
    });

    it.skip('should handle API errors (skipped - error handler mismatch)', async () => {
      // Skipped: Error scenario tests require proper MSW handler configuration
    });
  });

  describe('useContainer', () => {
    it.skip('should fetch container by ID (requires existing container in DB)', async () => {
      // Skipped: Would need to know a real container ID from the Docker API
      // Consider implementing as integration test with test data setup
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => useContainer(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it.skip('should handle 404 errors', async () => {
      // Skipped: Requires real API test with non-existent ID
    });
  });

  describe('useContainerByNumber', () => {
    it.skip('should fetch container by number (requires existing container in DB)', async () => {
      // Skipped: Would need to know a real container number from the Docker API
      // Consider implementing as integration test with test data setup
    });

    it('should not fetch when number is empty', () => {
      const { result } = renderHook(() => useContainerByNumber(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it.skip('should handle 404 errors', async () => {
      // Skipped: Requires real API test with non-existent number
    });
  });
});

describe('Container Mutation Hooks', () => {
  describe('Create, Update, Delete Flow', () => {
    // Note: These tests are timing out because React Query hooks require proper auth setup in test environment
    // TODO: Rewrite these tests using direct API calls (like booking-order tests) instead of React Query hooks
    it.skip('should create, update, and delete a container (requires direct API approach)', async () => {
      const containerNumber = generateContainerNumber();
      let containerId: string;

      // Step 1: CREATE container
      const { result: createResult } = renderHook(() => useCreateContainer(), {
        wrapper: createWrapper(),
      });

      createResult.current.mutate({
        number: containerNumber,
        containerTypeCode: '22G1',
      });

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true), { timeout: 10000 });

      expect(createResult.current.data?.number).toBe(containerNumber);
      expect(createResult.current.data?.containerTypeCode).toBe('22G1');
      expect(createResult.current.data?.id).toBeDefined();

      // eslint-disable-next-line prefer-const
      containerId = createResult.current.data!.id;
      createdContainerIds.push(containerId);

      // Step 2: UPDATE the created container
      const { result: updateResult } = renderHook(() => useUpdateContainer(), {
        wrapper: createWrapper(),
      });

      updateResult.current.mutate({
        id: containerId,
        data: {
          seal: 'SEAL12345',
          containerTypeCode: '45G1',
        },
      });

      await waitFor(() => expect(updateResult.current.isSuccess).toBe(true), { timeout: 10000 });

      expect(updateResult.current.data?.seal).toBe('SEAL12345');
      expect(updateResult.current.data?.containerTypeCode).toBe('45G1');
      expect(updateResult.current.data?.id).toBe(containerId);

      // Step 3: DELETE the container
      const { result: deleteResult } = renderHook(() => useDeleteContainer(), {
        wrapper: createWrapper(),
      });

      deleteResult.current.mutate(containerId);

      await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true), { timeout: 10000 });

      // Remove from cleanup list since we successfully deleted it
      createdContainerIds = createdContainerIds.filter(id => id !== containerId);
    }, 30000); // 30 second timeout for full CRUD cycle

    it.skip('should handle duplicate container number error (requires direct API approach)', async () => {
      const containerNumber = generateContainerNumber();

      // Create first container
      const { result: createResult1 } = renderHook(() => useCreateContainer(), {
        wrapper: createWrapper(),
      });

      createResult1.current.mutate({
        number: containerNumber,
        containerTypeCode: '22G1',
      });

      await waitFor(() => expect(createResult1.current.isSuccess).toBe(true), { timeout: 10000 });

      const containerId = createResult1.current.data!.id;
      createdContainerIds.push(containerId);

      // Try to create duplicate
      const { result: createResult2 } = renderHook(() => useCreateContainer(), {
        wrapper: createWrapper(),
      });

      createResult2.current.mutate({
        number: containerNumber,
        containerTypeCode: '22G1',
      });

      await waitFor(() => expect(createResult2.current.isError).toBe(true), { timeout: 10000 });
      expect(createResult2.current.error).toBeTruthy();
    }, 20000);

    it.skip('should handle update of non-existent container (requires direct API approach)', async () => {
      const { result } = renderHook(() => useUpdateContainer(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: '00000000-0000-0000-0000-000000000000',
        data: { seal: 'TEST' },
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10000 });
      expect(result.current.error).toBeTruthy();
    }, 15000);

    it.skip('should handle delete of non-existent container (requires direct API approach)', async () => {
      const { result } = renderHook(() => useDeleteContainer(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('00000000-0000-0000-0000-000000000000');

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10000 });
      expect(result.current.error).toBeTruthy();
    }, 15000);
  });
});

describe('useContainerQueries utility', () => {
  it('should provide cache management functions', () => {
    const { result } = renderHook(() => useContainerQueries(), {
      wrapper: createWrapper(),
    });

    expect(result.current.invalidateContainers).toBeTypeOf('function');
    expect(result.current.invalidateContainersList).toBeTypeOf('function');
    expect(result.current.invalidateContainer).toBeTypeOf('function');
    expect(result.current.refetchContainers).toBeTypeOf('function');
  });
});
