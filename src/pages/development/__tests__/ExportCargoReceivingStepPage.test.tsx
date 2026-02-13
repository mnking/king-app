import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@/test/utils';

import ExportCargoReceivingStepPage from '../ExportCargoReceivingStepPage';
import { packingListsApi } from '@/services/apiPackingLists';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';

vi.mock('@/services/apiPackingLists', () => ({
  packingListsApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/apiPackageTransactions', () => ({
  packageTransactionsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/shared/hooks', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/shared/features/cargo-create-step', () => ({
  CargoCreateStep: () => <div>cargo-create-step</div>,
}));

describe('ExportCargoReceivingStepPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packingListsApi.getAll).mockResolvedValue({
      data: { results: [] },
    });
    vi.mocked(packageTransactionsApi.getAll).mockResolvedValue({
      data: { results: [] },
    });
  });

  it('requests export packing lists with initialized and in-progress working statuses', async () => {
    render(<ExportCargoReceivingStepPage />);

    await waitFor(() => {
      expect(packingListsApi.getAll).toHaveBeenCalledWith({
        page: 1,
        itemsPerPage: 100,
        directionFlow: 'EXPORT',
        workingStatus: ['INITIALIZED', 'IN_PROGRESS'],
      });
    });
  });
});
