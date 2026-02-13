import { useMemo } from 'react';
import { usePackingList, usePackingListLines } from '@/features/packing-list/hooks';
import type { PackingListLineResponseDto } from '@/features/packing-list/types';
import type { DestuffCfsReceiptRenderContext } from '@/shared/features/form-printing';

export const useDestuffReceiptData = (packingListId: string | null) => {
  const detailQuery = usePackingList(packingListId ?? '', { enabled: Boolean(packingListId) });
  const linesQuery = usePackingListLines(packingListId ?? '', 1, 100, {
    enabled: Boolean(packingListId),
  });

  const context: DestuffCfsReceiptRenderContext | null = useMemo(() => {
    if (!detailQuery.data || !linesQuery.data) return null;
    return {
      packingList: detailQuery.data,
      lines: (linesQuery.data?.results ?? linesQuery.data ?? []) as PackingListLineResponseDto[],
    };
  }, [detailQuery.data, linesQuery.data]);

  return {
    context,
    isLoading: detailQuery.isLoading || linesQuery.isLoading,
    isFetching: detailQuery.isFetching || linesQuery.isFetching,
    error: detailQuery.error || linesQuery.error,
    refetch: () => {
      void detailQuery.refetch();
      void linesQuery.refetch();
    },
  };
};
