import { describe, expect, it } from 'vitest';
import { isSealEligible } from '../utils/seal-eligibility';
import type { StuffingPackageTransaction } from '@/features/stuffing-execution/types';

const createTransaction = (
  status: StuffingPackageTransaction['status'],
): StuffingPackageTransaction => ({
  id: 'tx-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  code: 'TX-1',
  packages: [],
  status,
  endedAt: null,
  businessProcessFlow: 'stuffingWarehouse',
  partyName: null,
  partyType: null,
  packingListId: 'pl-1',
});

describe('isSealEligible', () => {
  it('returns false when container is not in progress', () => {
    const result = isSealEligible({
      containerStatus: 'STUFFED',
      packingListIds: ['pl-1'],
      transactionsByPackingListId: {},
    });
    expect(result).toBe(false);
  });

  it('returns false when no packing lists are assigned', () => {
    const result = isSealEligible({
      containerStatus: 'IN_PROGRESS',
      packingListIds: [],
      transactionsByPackingListId: {},
    });
    expect(result).toBe(false);
  });

  it('returns false when any packing list has in-progress transaction', () => {
    const result = isSealEligible({
      containerStatus: 'IN_PROGRESS',
      packingListIds: ['pl-1', 'pl-2'],
      transactionsByPackingListId: {
        'pl-1': [createTransaction('DONE')],
        'pl-2': [createTransaction('IN_PROGRESS')],
      },
    });
    expect(result).toBe(false);
  });

  it('returns true when all packing lists are complete', () => {
    const result = isSealEligible({
      containerStatus: 'IN_PROGRESS',
      packingListIds: ['pl-1'],
      transactionsByPackingListId: {
        'pl-1': [createTransaction('DONE')],
      },
    });
    expect(result).toBe(true);
  });
});
