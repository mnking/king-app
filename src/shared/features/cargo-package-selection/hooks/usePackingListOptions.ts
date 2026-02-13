import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { packingListsApi } from '@/services/apiPackingLists';
import type { PackingListWorkingStatus } from '@/features/packing-list/types';
import type { PackingListSelectionItem } from '../types';

const defaultStatuses: PackingListWorkingStatus[] = ['IN_PROGRESS', 'DONE'];

export const usePackingListOptions = (
  statuses: PackingListWorkingStatus[] = defaultStatuses,
  itemsPerPage = 100,
) => {
  const normalizedStatuses = useMemo(
    () => Array.from(new Set(statuses)).sort(),
    [statuses],
  );

  const query = useQuery({
    queryKey: ['packing-lists-selection', normalizedStatuses, itemsPerPage],
    queryFn: async () => {
      const requests = normalizedStatuses.map((status) =>
        packingListsApi.getAll({
          workingStatus: status,
          itemsPerPage,
          page: 1,
        }),
      );
      const responses = await Promise.all(requests);

      const dedup = new Map<string, PackingListSelectionItem>();
      responses.forEach((res) => {
        const list = res.data?.results ?? [];
        list.forEach((item) => {
          if (!dedup.has(item.id)) {
            dedup.set(item.id, item as PackingListSelectionItem);
          }
        });
      });

      return Array.from(dedup.values());
    },
  });

  const packingLists: PackingListSelectionItem[] = query.data ?? [];

  return {
    packingLists,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
