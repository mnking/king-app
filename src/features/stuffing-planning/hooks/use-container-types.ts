import { useQuery } from '@tanstack/react-query';
import { listContainerTypes } from '@/services/apiContainerTypes';

const containerTypeQueryKeys = {
  list: () => ['containerTypes', 'list'] as const,
};

export const useContainerTypeList = () =>
  useQuery({
    queryKey: containerTypeQueryKeys.list(),
    queryFn: async () => {
      const response = await listContainerTypes();
      return response.data;
    },
    retry: 1,
  });
