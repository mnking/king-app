import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import { cargoInspectionQueryKeys } from './use-cargo-inspection-sessions';
import type { PackageStatusUpdate } from '../types';

const normalizePackages = (data: any) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export function useCargoPackages(packingListId: string) {
  return useQuery({
    queryKey: cargoInspectionQueryKeys.packages(packingListId),
    queryFn: async () => {
      const response = await cargoInspectionApi.getCargoPackages(packingListId);
      return normalizePackages(response?.data ?? response?.results ?? response);
    },
    enabled: Boolean(packingListId),
    retry: 1,
  });
}

export function useUpdateCargoPackages() {
  return useMutation({
    mutationFn: async ({
      packingListId,
      packageIds,
      updates,
    }: {
      packingListId: string;
      packageIds: string[];
      updates: PackageStatusUpdate;
    }) =>
      cargoInspectionApi.updateCargoPackages(
        packingListId,
        updates,
        packageIds,
      ),
    onError: (error: Error) => {
      toast.error(error.message || 'Feature coming soon - backend API not ready');
    },
  });
}
