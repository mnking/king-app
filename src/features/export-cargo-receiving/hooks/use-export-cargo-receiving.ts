import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import { packingListsApi } from '@/services/apiPackingLists';
import { forwardersApi } from '@/services/apiForwarder';
import { exportServiceOrdersApi } from '@/services/apiExportOrders';
import {
  cargoInspectionApi,
  type BusinessFlowConfig,
} from '@/services/apiCargoInspection';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import type { PackageTransaction } from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';
import { buildServiceOrderLookup } from '../helpers';
import type {
  ExportCargoReceivingApiResponse,
  ExportCargoReceivingForwarder,
  ExportCargoReceivingForwarderQueryParams,
  ExportCargoReceivingPackageTransaction,
  ExportCargoReceivingPaginatedResponse,
  ExportCargoReceivingPackingListListItem,
  ExportCargoReceivingQueryParams,
  ExportCargoReceivingServiceOrder,
} from '../types';

export const exportCargoReceivingQueryKeys = {
  all: ['export-cargo-receiving'] as const,
  packingLists: () =>
    [...exportCargoReceivingQueryKeys.all, 'packing-lists'] as const,
  packingList: (filters: Record<string, unknown>) =>
    [...exportCargoReceivingQueryKeys.packingLists(), filters] as const,
  forwarders: (filters: Record<string, unknown>) =>
    [...exportCargoReceivingQueryKeys.all, 'forwarders', filters] as const,
  serviceOrders: (forwarderId: string) =>
    [...exportCargoReceivingQueryKeys.all, 'export-orders', forwarderId] as const,
  packageTransactions: (packingListId: string) =>
    [...exportCargoReceivingQueryKeys.all, 'package-transactions', packingListId] as const,
  packageTransaction: (transactionId: string) =>
    [...exportCargoReceivingQueryKeys.all, 'package-transaction', transactionId] as const,
  flowConfig: (flowName: string) =>
    [...exportCargoReceivingQueryKeys.all, 'flow-config', flowName] as const,
};

const emptyPackingListResponse: ExportCargoReceivingPaginatedResponse<ExportCargoReceivingPackingListListItem> =
  {
    results: [],
    total: 0,
  };

export const useExportCargoReceivingPackingLists = (
  params: ExportCargoReceivingQueryParams,
) =>
  useQuery({
    queryKey: exportCargoReceivingQueryKeys.packingList(params),
    queryFn: async () => {
      const response = (await packingListsApi.getAll(
        params as Parameters<typeof packingListsApi.getAll>[0],
      )) as ExportCargoReceivingApiResponse<
        ExportCargoReceivingPaginatedResponse<ExportCargoReceivingPackingListListItem>
      >;
      return response.data ?? emptyPackingListResponse;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

export const useExportCargoReceivingForwarders = (
  params: ExportCargoReceivingForwarderQueryParams,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: exportCargoReceivingQueryKeys.forwarders(params),
    queryFn: async () => {
      const response = (await forwardersApi.getAll(
        params as Parameters<typeof forwardersApi.getAll>[0],
      )) as ExportCargoReceivingApiResponse<
        ExportCargoReceivingPaginatedResponse<ExportCargoReceivingForwarder>
      >;
      return response.data ?? { results: [], total: 0 };
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
  });

export const useExportCargoReceivingServiceOrderLookup = (
  forwarderIds: string[],
) => {
  const serviceOrderQueries = useQueries({
    queries: forwarderIds.map((forwarderId) => ({
      queryKey: exportCargoReceivingQueryKeys.serviceOrders(forwarderId),
      queryFn: async () => {
        const response = (await exportServiceOrdersApi.getAll({
          page: 1,
          itemsPerPage: 1000,
          status: 'all',
          forwarderId,
        })) as ExportCargoReceivingApiResponse<
          ExportCargoReceivingPaginatedResponse<ExportCargoReceivingServiceOrder>
        >;
        return response.data?.results ?? [];
      },
      enabled: Boolean(forwarderId),
      staleTime: 0,
      gcTime: 0,
      retry: 1,
    })),
  });

  const lookup = useMemo(() => {
    const orders = serviceOrderQueries.flatMap((query) =>
      Array.isArray(query.data)
        ? (query.data as ExportCargoReceivingServiceOrder[])
        : [],
    );
    return buildServiceOrderLookup(orders);
  }, [serviceOrderQueries]);

  return {
    lookup,
    serviceOrderQueries,
  };
};

export const useExportCargoReceivingPackageTransactions = (
  packingListId: string,
) =>
  useQuery({
    queryKey: exportCargoReceivingQueryKeys.packageTransactions(packingListId),
    queryFn: async () => {
      const response = (await packageTransactionsApi.getAll({
        packingListId,
        itemsPerPage: 1000,
        page: 1,
        order: { createdAt: 'DESC' },
      })) as ExportCargoReceivingApiResponse<
        ExportCargoReceivingPaginatedResponse<ExportCargoReceivingPackageTransaction>
      >;
      return response.data ?? { results: [], total: 0 };
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    enabled: Boolean(packingListId),
  });

export const useExportCargoReceivingPackageTransaction = (
  transactionId: string,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: exportCargoReceivingQueryKeys.packageTransaction(transactionId),
    queryFn: async () => {
      const response = await packageTransactionsApi.getById(transactionId);
      return response.data as PackageTransaction;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    enabled: Boolean(transactionId) && (options?.enabled ?? true),
  });

export const useExportCargoReceivingFlowConfig = (
  flowName: string,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: exportCargoReceivingQueryKeys.flowConfig(flowName),
    queryFn: async () => {
      const response = await cargoInspectionApi.getFlowConfig(flowName);
      return response.data as BusinessFlowConfig;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    enabled: Boolean(flowName) && (options?.enabled ?? true),
  });
