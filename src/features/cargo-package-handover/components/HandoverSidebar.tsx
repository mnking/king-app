import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import type {
  PackingListListItem,
  PackingListStatus,
  PackingListWorkingStatus,
} from '@/features/packing-list/types';

import { PackingListCard } from './PackingListCard';
import { handoverDestuffingPlansQueryKey } from '../hooks/use-handover-destuffing-plans';
import { handoverBookingOrdersByIdsQueryKey } from '../hooks/use-booking-orders-by-ids';

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

interface HandoverSidebarProps {
  packingLists: PackingListListItem[];
  selectedPackingListId: string | null;
  onSelect: (id: string | null) => void;
  getBookingOrderCode?: (packingList: PackingListListItem) => string | null;
  className?: string;
  // Map of PackingListID -> Progress info
  progressByPl: Record<string, { completedCount: number; totalTarget: number | string }>;
  isLoadingPlans: boolean;
  isLoadingPackingLists: boolean;
  isPlanError: boolean;
  planError: string | null;
  isPackingListError: boolean;
  packingListError: string | null;
  showNoEligiblePlans: boolean;
}

export const HandoverSidebar: React.FC<HandoverSidebarProps> = ({
  packingLists,
  selectedPackingListId,
  onSelect,
  getBookingOrderCode,
  className = '',
  progressByPl,
  isLoadingPlans,
  isLoadingPackingLists,
  isPlanError,
  planError,
  isPackingListError,
  packingListError,
  showNoEligiblePlans,
}) => {
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const queryClient = useQueryClient();
  const isLoading = isLoadingPlans || isLoadingPackingLists;

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
      queryKey: handoverDestuffingPlansQueryKey,
    });
    queryClient.invalidateQueries({
      queryKey: ['packing-lists-by-hbl-ids'],
    });
    queryClient.invalidateQueries({
      queryKey: ['packing-lists'],
    });
    queryClient.invalidateQueries({
      queryKey: ['cargo-packages-for-handover'],
    });
    queryClient.invalidateQueries({
      queryKey: handoverBookingOrdersByIdsQueryKey,
    });
  };

  const handleClearFilter = () => {
    setFilterValues({});
  };

  return (
    <div className={`h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex flex-col border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Layout className="h-5 w-5 text-gray-500" />
          Package Handover
        </h2>
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

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {isPlanError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
            Failed to load destuffing plans: {planError ?? 'Unknown error'}
          </div>
        ) : null}

        {isPackingListError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
            Failed to load packing lists: {packingListError ?? 'Unknown error'}
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
        ) : null}

        {!isLoading &&
        !isPlanError &&
        !isPackingListError &&
        !showNoEligiblePlans &&
        visiblePackingLists.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
            No matching packing lists found.
          </div>
        ) : null}

        {totalCount > PACKING_LIST_ITEMS_PER_PAGE ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
            Showing first {PACKING_LIST_ITEMS_PER_PAGE} results (total {totalCount}).
          </div>
        ) : null}

        {visiblePackingLists.length > 0
          ? visiblePackingLists.map((pl) => {
              const cachedProgress = progressByPl[pl.id];
              return (
                <PackingListCard
                  key={pl.id}
                  packingList={pl}
                  isSelected={selectedPackingListId === pl.id}
                  onSelect={() => onSelect(pl.id)}
                  handedOverCount={cachedProgress?.completedCount}
                  totalTarget={cachedProgress?.totalTarget}
                  shipper={pl.hblData?.shipper}
                  consignee={pl.hblData?.consignee}
                  bookingOrderCode={getBookingOrderCode?.(pl) ?? null}
                />
              );
            })
          : null}
      </div>
    </div>
  );
};
