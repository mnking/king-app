import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { documentApi } from '@/services/apiDocument';
import { documentConfig } from '../config';
import { documentListQueryKey } from './query-keys';

interface UseDocumentListOptions {
  ownerId: string;
  initialPage?: number;
  initialPageSize?: number;
  enabled?: boolean;
  search?: string;
}

export const useDocumentList = ({
  ownerId,
  initialPage = 1,
  initialPageSize = documentConfig.defaultPageSize,
  enabled = true,
  search,
}: UseDocumentListOptions) => {
  const [page, setPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize);

  const queryKey = useMemo(
    () => documentListQueryKey(ownerId, page, itemsPerPage, search),
    [ownerId, page, itemsPerPage, search],
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      documentApi.listDocuments({
        ownerId,
        page,
        itemsPerPage,
        search,
      }),
    enabled: Boolean(ownerId) && enabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const resetPagination = () => {
    setPage(initialPage);
    setItemsPerPage(initialPageSize);
  };

  return {
    ...query,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    resetPagination,
    queryKey,
  };
};
