import { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { usePackingLists } from '@/features/packing-list/hooks';
import type { PackingListListItem } from '@/features/packing-list/types';
import type { EntityColumn } from '@/shared/components/EntityTable';

interface UsePackingListSelectionTableOptions {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const usePackingListSelectionTable = ({
  selectedId,
  onSelect,
}: UsePackingListSelectionTableOptions) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data, isLoading, isFetching, refetch, error } = usePackingLists({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    orderBy: 'updatedAt',
    orderDir: 'desc',
  });

  const rows = useMemo<PackingListListItem[]>(() => data?.results ?? [], [data?.results]);
  const totalCount = data?.total ?? 0;
  const errorMessage = error instanceof Error ? error.message : null;

  const columns = useMemo<EntityColumn<PackingListListItem>[]>(
    () => [
      {
        key: 'packingListNumber',
        label: 'Packing List #',
        render: (row) => (
          <div className="font-mono text-xs font-semibold text-slate-800">
            {row.packingListNumber || 'N/A'}
          </div>
        ),
      },
      {
        key: 'hblCode',
        label: 'HBL',
        render: (row) => (
          <div className="text-sm text-slate-700">{row.hblData?.hblCode ?? '—'}</div>
        ),
      },
      {
        key: 'containerNumber',
        label: 'Container',
        render: (row) => (
          <div className="text-sm text-slate-700">{row.hblData?.containerNumber ?? '—'}</div>
        ),
      },
      {
        key: 'forwarderName',
        label: 'Forwarder',
        render: (row) => (
          <div className="text-sm text-slate-700">{row.hblData?.forwarderName ?? '—'}</div>
        ),
      },
    ],
    [],
  );

  const handleSelect = (row: PackingListListItem) => {
    const nextId = row.id === selectedId ? null : row.id;
    onSelect(nextId);
  };

  return {
    rows,
    columns,
    pagination,
    setPagination,
    totalCount,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
    handleSelect,
  };
};
