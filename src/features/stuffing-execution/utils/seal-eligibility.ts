import type { ExportPlanContainer } from '@/features/stuffing-planning';
import type { StuffingPackageTransaction } from '@/features/stuffing-execution/types';

export const isSealEligible = ({
  containerStatus,
  packingListIds,
  transactionsByPackingListId,
}: {
  containerStatus: ExportPlanContainer['status'] | null | undefined;
  packingListIds: string[];
  transactionsByPackingListId: Record<string, StuffingPackageTransaction[]>;
}): boolean => {
  if (containerStatus !== 'IN_PROGRESS') return false;
  if (packingListIds.length === 0) return false;

  return !packingListIds.some((packingListId) =>
    (transactionsByPackingListId[packingListId] ?? []).some(
      (transaction) => transaction.status === 'IN_PROGRESS',
    ),
  );
};
