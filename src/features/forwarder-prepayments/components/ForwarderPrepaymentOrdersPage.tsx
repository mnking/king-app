import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import type { EntityColumn } from '@/shared/components/EntityTable';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import Button from '@/shared/components/ui/Button';
import { forwardersApi } from '@/services/apiForwarder';
import { useBookingOrders, bookingOrderQueryKeys } from '@/features/booking-orders/hooks';
import { useExportPlans, exportPlanQueryKeys } from '@/features/stuffing-planning/hooks';
import { fetchExportOrderById } from '@/features/stuffing-planning/hooks/use-export-orders';
import type { Direction } from '../types';

type OrderRow = {
  id: string;
  direction: Direction;
  reference: string;
  forwarderId?: string | null;
  forwarderCode?: string | null;
  forwarderName?: string | null;
  containerCount: number;
};

const directionOptions: Direction[] = ['IMPORT', 'EXPORT'];

const parseDirection = (value?: string | null): Direction =>
  value === 'EXPORT' ? 'EXPORT' : 'IMPORT';

const parseNumberParam = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const ForwarderPrepaymentOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<Direction>(
    parseDirection(searchParams.get('direction')),
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: parseNumberParam(searchParams.get('page'), 1) - 1,
    pageSize: parseNumberParam(searchParams.get('pageSize'), 10),
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({
    forwarderId: searchParams.get('forwarderId') ?? '',
  });

  useEffect(() => {
    const nextDirection = parseDirection(searchParams.get('direction'));
    const nextPageIndex = parseNumberParam(searchParams.get('page'), 1) - 1;
    const nextPageSize = parseNumberParam(searchParams.get('pageSize'), 10);
    const nextForwarderId = searchParams.get('forwarderId') ?? '';

    if (nextDirection !== direction) {
      setDirection(nextDirection);
    }
    if (nextPageIndex !== pagination.pageIndex || nextPageSize !== pagination.pageSize) {
      setPagination({ pageIndex: nextPageIndex, pageSize: nextPageSize });
    }
    if (nextForwarderId !== (filterValues.forwarderId ?? '')) {
      setFilterValues({ forwarderId: nextForwarderId });
    }
  }, [searchParams, direction, pagination, filterValues.forwarderId]);

  const updateSearchParams = useCallback(
    (updates: {
      direction?: Direction;
      forwarderId?: string;
      pageIndex?: number;
      pageSize?: number;
    }) => {
      const next = new URLSearchParams(searchParams);
      if (updates.direction) {
        next.set('direction', updates.direction);
      }
      if (updates.forwarderId !== undefined) {
        if (updates.forwarderId) {
          next.set('forwarderId', updates.forwarderId);
        } else {
          next.delete('forwarderId');
        }
      }
      if (typeof updates.pageIndex === 'number') {
        next.set('page', String(updates.pageIndex + 1));
      }
      if (typeof updates.pageSize === 'number') {
        next.set('pageSize', String(updates.pageSize));
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const { data: forwardersResponse, isLoading: forwardersLoading } = useQuery({
    queryKey: ['forwarder-prepayments', 'forwarders'],
    queryFn: async () => {
      const response = await forwardersApi.getAll({ page: 1, itemsPerPage: 1000 });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const forwarders = useMemo(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse],
  );
  const forwarderMap = useMemo(
    () => new Map(forwarders.map((item) => [item.id, item])),
    [forwarders],
  );

  const forwarderOptions = useMemo(
    () =>
      forwarders.map((forwarder) => ({
        id: forwarder.id,
        label: `${forwarder.name} (${forwarder.code}) · ${forwarder.status}/${
          forwarder.contractStatus ?? 'N/A'
        }`,
      })),
    [forwarders],
  );

  const filterFields = useMemo(
    () => [
      {
        type: 'select' as const,
        name: 'forwarderId',
        label: 'Forwarder',
        options: forwarderOptions,
        keyField: 'id',
        valueField: 'label',
        placeholder: 'All forwarders',
      },
    ],
    [forwarderOptions],
  );

  const selectedForwarderId =
    typeof filterValues.forwarderId === 'string' ? filterValues.forwarderId : '';
  const bookingOrderParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      orderBy: 'createdAt' as const,
      orderDir: 'desc' as const,
      ...(selectedForwarderId ? { agentId: selectedForwarderId } : {}),
    }),
    [pagination.pageIndex, pagination.pageSize, selectedForwarderId],
  );

  const useBulkExportFetch =
    direction === 'EXPORT' && Boolean(selectedForwarderId);
  const exportPlanParams = useMemo(
    () => ({
      page: useBulkExportFetch ? 1 : pagination.pageIndex + 1,
      itemsPerPage: useBulkExportFetch ? 1000 : pagination.pageSize,
      orderBy: 'createdAt' as const,
      orderDir: 'desc' as const,
    }),
    [useBulkExportFetch, pagination.pageIndex, pagination.pageSize],
  );

  const {
    data: bookingOrdersResponse,
    isLoading: bookingOrdersLoading,
    isFetching: bookingOrdersFetching,
    error: bookingOrdersError,
    refetch: refetchBookingOrders,
  } = useBookingOrders(bookingOrderParams);

  const {
    data: exportPlansResponse,
    isLoading: exportPlansLoading,
    isFetching: exportPlansFetching,
    error: exportPlansError,
    refetch: refetchExportPlans,
  } = useExportPlans(exportPlanParams);

  useEffect(() => {
    if (direction === 'IMPORT') {
      void refetchBookingOrders();
    } else {
      void refetchExportPlans();
    }
  }, [direction, refetchBookingOrders, refetchExportPlans]);

  const bookingOrders = useMemo(
    () => bookingOrdersResponse?.results ?? [],
    [bookingOrdersResponse],
  );
  const exportPlans = useMemo(
    () => exportPlansResponse?.results ?? [],
    [exportPlansResponse],
  );

  const exportOrderQueries = useQueries({
    queries:
      direction === 'EXPORT'
        ? exportPlans.map((plan) => ({
            queryKey: ['forwarder-prepayments', 'export-orders', plan.exportOrderId],
            queryFn: () => fetchExportOrderById(plan.exportOrderId),
            enabled: Boolean(plan.exportOrderId),
            staleTime: 0,
            retry: 1,
          }))
        : [],
  });

  const exportOrderMap = useMemo(() => {
    const map = new Map<string, { forwarderId?: string; forwarderCode?: string }>();
    exportPlans.forEach((plan, index) => {
      const query = exportOrderQueries[index];
      if (plan.exportOrderId && query?.data) {
        map.set(plan.exportOrderId, {
          forwarderId: query.data.forwarderId,
          forwarderCode: query.data.forwarderCode,
        });
      }
    });
    return map;
  }, [exportPlans, exportOrderQueries]);

  const importOrders = useMemo<OrderRow[]>(
    () =>
      bookingOrders.map((order) => {
        const forwarder = forwarderMap.get(order.agentId);
        return {
          id: order.id,
          direction: 'IMPORT',
          reference: order.bookingNumber || order.code || '—',
          forwarderId: order.agentId,
          forwarderCode: order.agentCode ?? forwarder?.code ?? '—',
          forwarderName: forwarder?.name ?? null,
          containerCount: order.containers?.length ?? 0,
        };
      }),
    [bookingOrders, forwarderMap],
  );

  const exportOrders = useMemo<OrderRow[]>(
    () =>
      exportPlans.map((plan) => {
        const exportOrderDetail = exportOrderMap.get(plan.exportOrderId) ?? {};
        const forwarder = exportOrderDetail.forwarderId
          ? forwarderMap.get(exportOrderDetail.forwarderId)
          : undefined;
        return {
          id: plan.id,
          direction: 'EXPORT',
          reference: plan.code || '—',
          forwarderId: exportOrderDetail.forwarderId,
          forwarderCode: exportOrderDetail.forwarderCode ?? forwarder?.code ?? '—',
          forwarderName: forwarder?.name ?? null,
          containerCount: plan.containers?.length ?? 0,
        };
      }),
    [exportPlans, exportOrderMap, forwarderMap],
  );

  const orders = direction === 'IMPORT' ? importOrders : exportOrders;

  const filteredOrders = useMemo(() => {
    if (!selectedForwarderId) return orders;
    return orders.filter((order) => order.forwarderId === selectedForwarderId);
  }, [orders, selectedForwarderId]);

  const totalCount =
    direction === 'IMPORT'
      ? bookingOrdersResponse?.total ?? 0
      : useBulkExportFetch
        ? filteredOrders.length
        : exportPlansResponse?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const clampedPageIndex = Math.min(pagination.pageIndex, totalPages - 1);
  const pageStart = clampedPageIndex * pagination.pageSize;
  const pageEnd = pageStart + pagination.pageSize;
  const pageOrders = useBulkExportFetch
    ? filteredOrders.slice(pageStart, pageEnd)
    : filteredOrders;

  useEffect(() => {
    if (pagination.pageIndex !== clampedPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: clampedPageIndex }));
      updateSearchParams({ pageIndex: clampedPageIndex });
    }
  }, [clampedPageIndex, pagination.pageIndex, updateSearchParams]);

  const columns: EntityColumn<OrderRow>[] = useMemo(() => {
    const referenceLabel =
      direction === 'IMPORT' ? 'Booking number' : 'Export plan code';
    return [
      {
        key: 'reference',
        label: referenceLabel,
        render: (order) => (
          <div className="font-semibold text-gray-900 dark:text-white">
            {order.reference}
          </div>
        ),
      },
      {
        key: 'forwarder',
        label: 'Forwarder',
        render: (order) => (
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div className="font-medium text-gray-900 dark:text-white">
              {order.forwarderCode ?? '—'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {order.forwarderName ?? 'N/A'}
            </div>
          </div>
        ),
      },
      {
        key: 'containers',
        label: 'Containers',
        render: (order) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {order.containerCount}
          </span>
        ),
      },
      {
        key: 'action',
        label: '',
        render: (order) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/forwarder-prepayments/${order.direction}/${order.id}`);
            }}
          >
            View containers
          </Button>
        ),
      },
    ];
  }, [direction, navigate]);

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    updateSearchParams({
      forwarderId: typeof values.forwarderId === 'string' ? values.forwarderId : '',
      pageIndex: 0,
    });
    void queryClient.invalidateQueries({
      queryKey:
        direction === 'IMPORT'
          ? bookingOrderQueryKeys.lists()
          : exportPlanQueryKeys.lists(),
    });
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    updateSearchParams({ forwarderId: '', pageIndex: 0 });
    void queryClient.invalidateQueries({
      queryKey:
        direction === 'IMPORT'
          ? bookingOrderQueryKeys.lists()
          : exportPlanQueryKeys.lists(),
    });
  };

  const handleDirectionChange = (nextDirection: Direction) => {
    setDirection(nextDirection);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    updateSearchParams({ direction: nextDirection, pageIndex: 0 });
  };

  const handlePaginationChange = (nextPagination: PaginationState) => {
    setPagination(nextPagination);
    updateSearchParams({
      pageIndex: nextPagination.pageIndex,
      pageSize: nextPagination.pageSize,
    });
  };

  const isLoading =
    direction === 'IMPORT' ? bookingOrdersLoading : exportPlansLoading;
  const isFetching =
    direction === 'IMPORT' ? bookingOrdersFetching : exportPlansFetching;
  const error =
    direction === 'IMPORT'
      ? bookingOrdersError instanceof Error
        ? bookingOrdersError.message
        : null
      : exportPlansError instanceof Error
        ? exportPlansError.message
        : null;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {directionOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={direction === option ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleDirectionChange(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Receipt className="h-4 w-4" />
                {totalCount} order(s)
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-start md:justify-between">
              <div className="w-full md:flex-1">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  initialValues={filterValues}
                  disableAutoReset={forwardersLoading}
                  className="w-full"
                  buttonLabel="Filters"
                />
              </div>
            </div>

            <EntityTable
              entities={pageOrders}
              loading={isLoading}
              fetching={isFetching}
              error={error}
              entityName="Order"
              entityNamePlural="Orders"
              getId={(order) => order.id}
              columns={columns}
              actions={[]}
              canCreate={false}
              canBulkEdit={false}
              enablePagination
              enableServerSidePagination
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyStateMessage="No orders found for the selected filters."
              emptyStateIcon={<Receipt className="h-12 w-12 text-gray-400" />}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwarderPrepaymentOrdersPage;
