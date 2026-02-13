import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Package, ChevronDown, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import {
  DynamicFilter,
  type FilterValues,
  type FilterFieldConfig,
} from '@/shared/components/DynamicFilter';
import { useDonePlansHistory } from '@/features/cfs-receive-planning/hooks';
import {
  DONE_PLAN_PAGE_SIZE,
  getDefaultDonePlanFilters,
  mapFiltersToQueryParams,
  type DonePlanFilterState,
} from '../helpers';
import {
  formatDateTimeRange,
  getContainerSizeLabel,
  getContainerTypeCode,
  statusStyles,
} from '@/shared/features/plan/utils/plan-display-helpers';
import type { PlansQueryParams } from '@/shared/features/plan/types';
import { getCargoBadgeClassName, getCargoBadgeConfig } from '@/shared/utils/cargo-badge';
import { getStatusBadgeClassName, getStatusBadgeConfig } from '@/shared/utils/status-badge';

const filterFields: FilterFieldConfig[] = [
  { type: 'date', name: 'plannedStartFrom', label: 'Planned From' },
  { type: 'date', name: 'plannedStartTo', label: 'Planned To' },
  { type: 'date', name: 'executionStartFrom', label: 'Execution From' },
  { type: 'date', name: 'executionStartTo', label: 'Execution To' },
  {
    type: 'text',
    name: 'search',
    label: 'Search',
    placeholder: 'Search order code, container, seal, MBL, or HBL...',
  },
  {
    type: 'select',
    name: 'orderBy',
    label: 'Sort by',
    options: [{ value: 'plannedStart', label: 'Planned Start' }],
    keyField: 'value',
    valueField: 'label',
  },
  {
    type: 'select',
    name: 'orderDir',
    label: 'Order',
    options: [
      { value: 'asc', label: 'Ascending' },
      { value: 'desc', label: 'Descending' },
    ],
    keyField: 'value',
    valueField: 'label',
  },
];

const mapFilterValues = (values: FilterValues): DonePlanFilterState => ({
  plannedStartFrom: values.plannedStartFrom,
  plannedStartTo: values.plannedStartTo,
  executionStartFrom: values.executionStartFrom,
  executionStartTo: values.executionStartTo,
  search: typeof values.search === 'string' ? values.search.trim() : undefined,
  orderBy: (values.orderBy as DonePlanFilterState['orderBy']) ?? 'plannedStart',
  orderDir: (values.orderDir as DonePlanFilterState['orderDir']) ?? 'asc',
});

const buildQueryParams = (filters: DonePlanFilterState, page: number): PlansQueryParams => ({
  status: 'DONE',
  page,
  itemsPerPage: DONE_PLAN_PAGE_SIZE,
  ...mapFiltersToQueryParams(filters),
});

export const DonePlanHistory: React.FC = () => {
  const defaultFilters = useMemo(() => getDefaultDonePlanFilters(), []);
  const [filters, setFilters] = useState<DonePlanFilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  const queryParams = useMemo(
    () => buildQueryParams(filters, page),
    [filters, page],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDonePlansHistory(queryParams);

  const plans = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DONE_PLAN_PAGE_SIZE));

  const handleApplyFilter = (values: FilterValues) => {
    const nextFilters = mapFilterValues(values);
    setFilters(nextFilters);
    setPage(1);
  };

  const handleClearFilter = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  useEffect(() => {
    setExpandedPlanIds(new Set());
  }, [filters, page]);

  const handleRefresh = () => {
    void refetch({ throwOnError: false });
  };

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const currentInitialValues = useMemo(() => {
    const entries = Object.entries(filters).filter(
      ([, value]) => typeof value === 'string' && value.length > 0,
    );

    return Object.fromEntries(entries) as FilterValues;
  }, [filters]);

  const showingStart =
    plans.length === 0 ? 0 : (page - 1) * DONE_PLAN_PAGE_SIZE + 1;
  const showingEnd = Math.min(total, page * DONE_PLAN_PAGE_SIZE);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Done Plans</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review completed receive plans with backend-powered filters and sorting.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={isFetching}
          className="gap-2 self-start md:self-auto"
        >
          {!isFetching && <RotateCcw className="h-4 w-4" />}
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        <DynamicFilter
          fields={filterFields}
          onApplyFilter={handleApplyFilter}
          onClear={handleClearFilter}
          initialValues={currentInitialValues}
          buttonLabel="Filters"
          className="w-full"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <Loader2 className="h-6 w-6 mr-2 animate-spin" />
            Loading done plans...
          </div>
        ) : isError ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-400 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Unable to load done plans</p>
            <p className="text-sm text-red-500 dark:text-red-300">Please try again later.</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 gap-2">
            <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="font-semibold">No plans match the current filters</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adjust the filters or reset to defaults to broaden the results.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              {plans.map((plan) => {
                const isExpanded = expandedPlanIds.has(plan.id);
                const sizeLabel = `${plan.containers.length} container${plan.containers.length === 1 ? '' : 's'}`;
                const statusBadge = getStatusBadgeConfig(plan.status ?? 'DONE');
                const statusBadgeClassName = getStatusBadgeClassName(plan.status ?? 'DONE');

                return (
                  <div
                    key={plan.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-4 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => togglePlanExpansion(plan.id)}
                      className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-all duration-200"
                      aria-expanded={isExpanded}
                      aria-controls={`done-plan-${plan.id}`}
                      aria-label={`Toggle containers for ${plan.code}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.code}</h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${statusBadgeClassName}`}>
                              {statusBadge.label}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full">
                              <Package className="h-3.5 w-3.5" />
                              {sizeLabel}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            <p>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Planned:</span>{' '}
                              {formatDateTimeRange(plan.plannedStart, plan.plannedEnd)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Executed:</span>{' '}
                              {formatDateTimeRange(plan.executionStart, plan.executionEnd)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-colors duration-150 ${
                                plan.equipmentBooked
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {plan.equipmentBooked ? 'Equipment booked' : 'Equipment pending'}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold transition-colors duration-150 ${
                                plan.portNotified
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {plan.portNotified ? 'Port notified' : 'Port pending'}
                            </span>
                          </div>
                          <div className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        id={`done-plan-${plan.id}`}
                        className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-3"
                      >
                        {plan.containers.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            No containers available for this plan.
                          </div>
                        ) : (
                          plan.containers.map((container) => {
                            const statusClass =
                              statusStyles[container.status] || statusStyles.WAITING;
                            const typeCode = getContainerTypeCode(container);
                            const hblNumbers = (container.orderContainer.hbls || [])
                              .map((hbl) => hbl.hblNo)
                              .filter(Boolean);

                            // Get cargo nature badge from backend summary data (using shared utility)
                            const cargoNature = container.orderContainer.summary?.cargo_nature;
                            const specialCargoBadge = getCargoBadgeConfig(cargoNature);
                            const cargoBadgeClassName = getCargoBadgeClassName(cargoNature);

                            return (
                              <div
                                key={container.id}
                                className={`bg-white dark:bg-gray-800 border rounded-lg p-3 ${
                                  container.status === 'REJECTED'
                                    ? 'border-red-200 dark:border-red-700 shadow-sm'
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass}`}
                                    >
                                      {container.status}
                                    </span>
                                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                      {container.orderContainer.containerNo || 'Unknown container'}
                                    </p>
                                    {specialCargoBadge && (
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-150 ${cargoBadgeClassName}`}>
                                        {specialCargoBadge.icon && <specialCargoBadge.icon className="h-3.5 w-3.5" />}
                                        {specialCargoBadge.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                      Order Code
                                    </span>
                                    {container.orderContainer.bookingOrder?.code ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                        {container.orderContainer.bookingOrder.code}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Type</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{typeCode ?? '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Size</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {getContainerSizeLabel(typeCode)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Seal Number</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {container.orderContainer.sealNumber || '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">MBL Number</p>
                                    {container.orderContainer.mblNumber ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                        {container.orderContainer.mblNumber}
                                      </span>
                                    ) : (
                                      <p className="font-medium text-gray-900 dark:text-gray-100">—</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">HBL Numbers</p>
                                    {hblNumbers.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {hblNumbers.map((hblNo) => (
                                          <span
                                            key={hblNo}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                                          >
                                            {hblNo}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="font-medium text-gray-900 dark:text-gray-100">—</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Showing {showingStart} - {showingEnd} of {total} plans
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    Previous
                  </Button>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="gap-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonePlanHistory;
