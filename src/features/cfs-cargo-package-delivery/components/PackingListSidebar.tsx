import React from 'react';

import type {
  PackingListListItem,
  PackingListStatus,
  PackingListWorkingStatus,
} from '@/features/packing-list/types';
import { useQueryClient } from '@tanstack/react-query';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

import { DeliveryPackingListCard } from './DeliveryPackingListCard';
import { usePackingListsByHblIds } from '../hooks/use-packing-lists-by-hbl-ids';
import { useBookingOrdersByIds } from '../hooks/use-booking-orders-by-ids';
import {
  deliveryDestuffingPlansQueryKey,
  useDeliveryDestuffingPlans,
} from '../hooks/use-delivery-destuffing-plans';

const PACKING_LIST_ITEMS_PER_PAGE = 1000;

const DEFAULT_SORT = {
  orderBy: 'updatedAt',
  orderDir: 'desc',
} as const;

const STATUS_FILTER_OPTIONS: { value: PackingListStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DONE', label: 'Done' },
];

const WORKING_STATUS_FILTER_OPTIONS: {
  value: PackingListWorkingStatus;
  label: string;
}[] = [
  { value: 'INITIALIZED', label: 'Initialized' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

export const PackingListSidebar: React.FC<{
  onSelect: (selection: { id: string; bookingOrderCode: string | null } | null) => void;
  selectedPackingListId: string | null;
}> = ({ onSelect, selectedPackingListId }) => {
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const queryClient = useQueryClient();

  const {
    data: inProgressPlans,
    isLoading: isLoadingPlans,
    isError: isPlanError,
    error: planError,
  } = useDeliveryDestuffingPlans();

  const eligibleHblIds = React.useMemo(() => {
    if (!inProgressPlans) return [];
    const ids = new Set<string>();
    inProgressPlans.forEach((plan) => {
      (plan.containers ?? []).forEach((container) => {
        (container.hbls ?? []).forEach((hbl) => {
          if (hbl.hblId) {
            ids.add(hbl.hblId);
          }
        });
      });
    });
    return Array.from(ids);
  }, [inProgressPlans]);

  const hblOrderIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (!inProgressPlans) return map;

    inProgressPlans.forEach((plan) => {
      (plan.containers ?? []).forEach((container) => {
        const orderId = container.orderContainer?.orderId;
        if (!orderId) return;
        (container.hbls ?? []).forEach((hbl) => {
          if (hbl.hblId) {
            map.set(hbl.hblId, orderId);
          }
        });
      });
    });

    return map;
  }, [inProgressPlans]);

  const orderIds = React.useMemo(
    () => Array.from(new Set(Array.from(hblOrderIdMap.values()))),
    [hblOrderIdMap],
  );

  const {
    data: packingLists,
    isLoading: isLoadingPackingLists,
    isError: isPackingListError,
    error: packingListError,
  } = usePackingListsByHblIds(eligibleHblIds);

  const { data: bookingOrderCodes = {} } = useBookingOrdersByIds(orderIds);

  const filteredPackingLists = React.useMemo(() => {
    const searchValue =
      typeof filterValues.search === 'string' ? filterValues.search.trim().toLowerCase() : '';
    const containerValue =
      typeof filterValues.containerNumber === 'string'
        ? filterValues.containerNumber.trim().toLowerCase()
        : '';
    const statusFilter =
      typeof filterValues.status === 'string' && filterValues.status.trim()
        ? (filterValues.status as PackingListStatus)
        : undefined;
    const workingStatusFilter =
      typeof filterValues.workingStatus === 'string' && filterValues.workingStatus.trim()
        ? (filterValues.workingStatus as PackingListWorkingStatus)
        : undefined;

    return (packingLists ?? []).filter((pl) => {
      if (statusFilter && pl.status !== statusFilter) return false;
      if (workingStatusFilter && pl.workingStatus !== workingStatusFilter) return false;
      if (containerValue) {
        const container = pl.hblData?.containerNumber ?? '';
        if (!container.toLowerCase().includes(containerValue)) return false;
      }
      if (searchValue) {
        const haystack = [
          pl.packingListNumber,
          pl.hblData?.hblCode,
          pl.hblData?.containerNumber,
          pl.mbl,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchValue)) return false;
      }
      return true;
    });
  }, [
    filterValues.containerNumber,
    filterValues.search,
    filterValues.status,
    filterValues.workingStatus,
    packingLists,
  ]);

  const { totalCount, visiblePackingLists } = React.useMemo(() => {
    const sorted = filteredPackingLists.slice().sort((a, b) => {
      const at = Date.parse(a.updatedAt);
      const bt = Date.parse(b.updatedAt);
      if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
      return DEFAULT_SORT.orderDir === 'desc' ? bt - at : at - bt;
    });

    return {
      totalCount: sorted.length,
      visiblePackingLists: sorted.slice(0, PACKING_LIST_ITEMS_PER_PAGE),
    };
  }, [filteredPackingLists]);

  const getBookingOrderCode = React.useCallback(
    (packingList: PackingListListItem) => {
      const hblId = packingList.hblData?.id;
      if (!hblId) return null;
      const orderId = hblOrderIdMap.get(hblId);
      if (!orderId) return null;
      return bookingOrderCodes[orderId] ?? null;
    },
    [bookingOrderCodes, hblOrderIdMap],
  );

  React.useEffect(() => {
    if (!selectedPackingListId) return;
    const stillExists = visiblePackingLists.some((pl) => pl.id === selectedPackingListId);
    if (!stillExists) {
      onSelect(null);
    }
  }, [onSelect, selectedPackingListId, visiblePackingLists]);

  const filterFields = React.useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'search',
        label: 'Search',
        placeholder: 'Search HBL, container, MBL, packing list...',
      },
      {
        type: 'text' as const,
        name: 'containerNumber',
        label: 'Container Number',
        placeholder: 'e.g., MSCU6639871',
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status',
        options: STATUS_FILTER_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
      {
        type: 'select' as const,
        name: 'workingStatus',
        label: 'Working Status',
        options: WORKING_STATUS_FILTER_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
    ],
    [],
  );

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues({
      search: values.search,
      containerNumber: values.containerNumber,
      status: values.status,
      workingStatus: values.workingStatus,
    });

    queryClient.invalidateQueries({
      queryKey: deliveryDestuffingPlansQueryKey,
    });
    queryClient.invalidateQueries({
      queryKey: ['cfs-packing-lists-by-hbl-ids'],
    });
    queryClient.invalidateQueries({
      queryKey: ['booking-orders-by-ids'],
    });
  };

  const handleClearFilter = () => {
    setFilterValues({});
  };

  const isLoading = isLoadingPlans || isLoadingPackingLists;
  const showNoEligiblePlans =
    !isLoadingPlans && !isPlanError && eligibleHblIds.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Packing Lists</h1>
          <div className="mt-3 flex items-start justify-between gap-4">
            <DynamicFilter
              fields={filterFields}
              onApplyFilter={handleApplyFilter}
              onClear={handleClearFilter}
              buttonLabel="Filters"
              className="flex-1 [&_#filter-panel_.mb-4]:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]"
              initialValues={filterValues}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-3 dark:bg-gray-800">
          {isPlanError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
              Failed to load destuffing plans:{' '}
              {(planError as Error | undefined)?.message ?? 'Unknown error'}
            </div>
          ) : null}

          {isPackingListError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
              {(packingListError as Error | undefined)?.message ??
                'Failed to load packing lists'}
            </div>
          ) : null}

          {showNoEligiblePlans ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
              No in-progress destuffing plans with eligible packing lists.
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <LoadingSpinner size="sm" /> Loading packing lists...
            </div>
          ) : visiblePackingLists.length === 0 &&
            !isPlanError &&
            !isPackingListError &&
            !showNoEligiblePlans ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
              No matching packing lists found.
            </div>
          ) : (
            <div className="space-y-3">
              {totalCount > PACKING_LIST_ITEMS_PER_PAGE ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
                  Showing first {PACKING_LIST_ITEMS_PER_PAGE} results (total {totalCount}).
                </div>
              ) : null}

              {visiblePackingLists.map((packingList: PackingListListItem) => (
                <DeliveryPackingListCard
                  key={packingList.id}
                  packingList={packingList}
                  isSelected={selectedPackingListId === packingList.id}
                  onSelect={() =>
                    onSelect({
                      id: packingList.id,
                      bookingOrderCode: getBookingOrderCode(packingList),
                    })
                  }
                  bookingOrderCode={getBookingOrderCode(packingList)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
