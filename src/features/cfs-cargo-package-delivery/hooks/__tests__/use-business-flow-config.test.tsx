import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useBusinessFlowConfig } from '../use-business-flow-config';
import { cargoInspectionApi } from '@/services/apiCargoInspection';

vi.mock('@/services/apiCargoInspection', () => ({
  cargoInspectionApi: {
    getFlowConfig: vi.fn(),
  },
}));

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

describe('useBusinessFlowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches flow configuration successfully', async () => {
    vi.mocked(cargoInspectionApi.getFlowConfig).mockResolvedValue({
      statusCode: 200,
      data: {
        direction: 'import',
        steps: [
          { code: 'inspect', fromStatus: 'CHECK_IN', toStatus: 'CHECKOUT' },
          { code: 'handover', fromStatus: 'CHECKOUT', toStatus: 'DELIVERED' },
        ],
      },
    });

    const { result } = renderHook(() => useBusinessFlowConfig('warehouseDelivery'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.direction).toBe('import');
    expect(cargoInspectionApi.getFlowConfig).toHaveBeenCalledWith(
      'warehouseDelivery',
    );
  });

  it('exposes 404 as an error state', async () => {
    vi.mocked(cargoInspectionApi.getFlowConfig).mockRejectedValue(
      new Error('Business flow "warehouseDelivery" not found'),
    );

    const { result } = renderHook(() => useBusinessFlowConfig('warehouseDelivery'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });

    expect((result.current.error as Error).message).toContain('not found');
  });

  it('does not run when flowName is empty', () => {
    renderHook(() => useBusinessFlowConfig(''), {
      wrapper: createWrapper(),
    });

    expect(cargoInspectionApi.getFlowConfig).not.toHaveBeenCalled();
  });
});
