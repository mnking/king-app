import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getEmptyContainers, returnEmptyContainers } from '@/services/apiCFS';
import type {
  Container,
  PaginatedResponse,
} from '@/features/containers/types';

export interface EmptyContainersQueryParams {
  page?: number;
  itemsPerPage?: number;
}

export const emptyContainerQueryKeys = {
  all: ['containers', 'empty'] as const,
  lists: () => [...emptyContainerQueryKeys.all, 'list'] as const,
  list: (params: EmptyContainersQueryParams) =>
    [...emptyContainerQueryKeys.lists(), params] as const,
};

interface UseEmptyContainerOptions {
  enabled?: boolean;
}

export function useEmptyContainerOperations(
  params: EmptyContainersQueryParams = {},
  options?: UseEmptyContainerOptions,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: emptyContainerQueryKeys.list(params),
    queryFn: async () => {
      const response = await getEmptyContainers(params);
      return response.data as PaginatedResponse<Container>;
    },
staleTime:0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });

  const returnMutation = useMutation({
    mutationFn: async (containerNumbers: string[]) => {
      const response = await returnEmptyContainers(containerNumbers);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emptyContainerQueryKeys.lists() });
    },
  });

  return { query, returnMutation };
}
