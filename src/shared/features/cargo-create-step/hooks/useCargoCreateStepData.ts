import { useQuery } from '@tanstack/react-query';

import { packingListsApi } from '@/services/apiPackingLists';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import { useForwarder } from '@/features/forwarder/hooks/use-forwarders-query';
import type { PackingListDetail, PackingListLineResponseDto } from '@/features/packing-list/types';
import type { PackageTransaction } from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';
import type { CargoPackageRecord } from '@/features/cargo-package-storage/types';

const queryKeys = {
  packingList: (packingListId: string) => ['cargo-create-step', 'packing-list', packingListId] as const,
  lines: (packingListId: string) => ['cargo-create-step', 'lines', packingListId] as const,
  transaction: (transactionId: string) => ['cargo-create-step', 'transaction', transactionId] as const,
  cargoPackages: (packingListId: string) => ['cargo-create-step', 'cargo-packages', packingListId] as const,
};

const normalizePaginated = <T,>(payload: unknown): { results: T[]; total: number } => {
  if (!payload || typeof payload !== 'object') {
    return { results: [], total: 0 };
  }

  const maybeData = 'data' in payload ? (payload as { data?: unknown }).data : payload;
  if (!maybeData || typeof maybeData !== 'object') {
    return { results: [], total: 0 };
  }

  const results = Array.isArray((maybeData as { results?: T[] }).results)
    ? (maybeData as { results?: T[] }).results ?? []
    : [];
  const total = typeof (maybeData as { total?: number }).total === 'number'
    ? (maybeData as { total?: number }).total ?? results.length
    : results.length;

  return { results, total };
};

const fetchAllPackingListLines = async (packingListId: string): Promise<PackingListLineResponseDto[]> => {
  const itemsPerPage = 200;
  let page = 1;
  let total = 0;
  const results: PackingListLineResponseDto[] = [];

  while (true) {
    const response = await packingListsApi.lines.getAll(
      packingListId,
      page,
      itemsPerPage,
    );
    const parsed = normalizePaginated<PackingListLineResponseDto>(response);
    const pageResults = parsed.results;
    const pageTotal = parsed.total;

    if (!total) {
      total = pageTotal;
    }

    results.push(...pageResults);

    const isLastPage = results.length >= pageTotal || pageResults.length < itemsPerPage;
    if (isLastPage) {
      break;
    }

    page += 1;
  }

  return results;
};

export const useCargoCreateStepData = (
  packingListId: string,
  packageTransactionId: string,
) => {
  const packingListQuery = useQuery({
    queryKey: queryKeys.packingList(packingListId),
    queryFn: async (): Promise<PackingListDetail> => {
      const response = await packingListsApi.getById(packingListId);
      return response.data;
    },
    enabled: Boolean(packingListId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const linesQuery = useQuery({
    queryKey: queryKeys.lines(packingListId),
    queryFn: () => fetchAllPackingListLines(packingListId),
    enabled: Boolean(packingListId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const transactionQuery = useQuery({
    queryKey: queryKeys.transaction(packageTransactionId),
    queryFn: async (): Promise<PackageTransaction> => {
      const response = await packageTransactionsApi.getById(packageTransactionId);
      return response.data;
    },
    enabled: Boolean(packageTransactionId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const cargoPackagesQuery = useQuery({
    queryKey: queryKeys.cargoPackages(packingListId),
    queryFn: async (): Promise<CargoPackageRecord[]> => {
      const response = await cargoPackagesApi.fetchByPackingList({ packingListId });
      return response.results;
    },
    enabled: Boolean(packingListId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const forwarderId = packingListQuery.data?.forwarderId ?? '';
  const forwarderQuery = useForwarder(forwarderId);

  return {
    packingListQuery,
    linesQuery,
    transactionQuery,
    cargoPackagesQuery,
    forwarderQuery,
  };
};

export const cargoCreateStepQueryKeys = queryKeys;
