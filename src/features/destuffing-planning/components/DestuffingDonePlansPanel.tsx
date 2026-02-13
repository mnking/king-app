import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Package, ChevronDown, AlertCircle, FileText, Receipt, User, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DynamicFilter, type FilterFieldConfig, type FilterValues } from '@/shared/components/DynamicFilter';
import { useDestuffingPlans } from '../hooks';
import type { DestuffingPlan } from '../types';
import { formatDateTimeRange } from '@/shared/features/plan/utils/plan-display-helpers';
import { getPlanForwarderLabel } from '../utils/plan-transformers';
import {
  createDefaultDonePlansTabState,
  type DonePlansTabFilters,
  type DonePlansTabState,
  DONE_PLANS_PAGE_SIZE,
} from './DestuffingDonePlansState';
import type { PlansQueryParams } from '@/shared/features/plan/types';
import { getCargoBadgeClassName, getCargoBadgeConfig } from '@/shared/utils/cargo-badge';

interface DestuffingDonePlansPanelProps {
  state: DonePlansTabState;
  onStateChange: React.Dispatch<React.SetStateAction<DonePlansTabState>>;
  isActive: boolean;
}

const FILTER_FIELDS: FilterFieldConfig[] = [
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

const buildInitialFilterValues = (filters: DonePlansTabFilters): FilterValues => {
  const entries = Object.entries(filters).filter(
    ([, value]) => typeof value === 'string' && value.length > 0,
  );
  return Object.fromEntries(entries) as FilterValues;
};

const mapFilterValues = (values: FilterValues): DonePlansTabFilters => ({
  plannedStartFrom: values.plannedStartFrom,
  plannedStartTo: values.plannedStartTo,
  executionStartFrom: values.executionStartFrom,
  executionStartTo: values.executionStartTo,
  search: typeof values.search === 'string' ? values.search.trim() : undefined,
  orderBy: (values.orderBy as DonePlansTabFilters['orderBy']) ?? 'plannedStart',
  orderDir: (values.orderDir as DonePlansTabFilters['orderDir']) ?? 'asc',
});

const mapFiltersToQueryParams = (filters: DonePlansTabFilters) => {
  const params: {
    plannedStart?: { from?: string; to?: string };
    executionStart?: { from?: string; to?: string };
    search?: string;
    orderBy?: DonePlansTabFilters['orderBy'];
    orderDir?: 'asc' | 'desc';
  } = {};

  if (filters.plannedStartFrom || filters.plannedStartTo) {
    params.plannedStart = {
      from: filters.plannedStartFrom,
      to: filters.plannedStartTo,
    };
  }

  if (filters.executionStartFrom || filters.executionStartTo) {
    params.executionStart = {
      from: filters.executionStartFrom,
      to: filters.executionStartTo,
    };
  }

  if (filters.search) {
    params.search = filters.search;
  }

  params.orderBy = filters.orderBy;
  params.orderDir = filters.orderDir;

  return params;
};

const getPlanTotals = (plan: DestuffingPlan) => {
  const totalContainers = plan.containers?.length ?? 0;
  const totalHbls = plan.containers?.reduce(
    (sum, container) => sum + (container.hbls?.length ?? 0),
    0,
  ) ?? 0;

  return { totalContainers, totalHbls };
};

export const DestuffingDonePlansPanel: React.FC<DestuffingDonePlansPanelProps> = ({
  state,
  onStateChange,
  isActive,
}) => {
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());
  const [manualRefreshCounter, setManualRefreshCounter] = useState(0);

  const filterInitialValues = useMemo(
    () => buildInitialFilterValues(state.filters),
    [state.filters],
  );

  const queryParams: PlansQueryParams = useMemo(
    () => ({
      status: 'DONE',
      planType: 'DESTUFFING',
      page: state.pagination.page,
      itemsPerPage: state.pagination.limit,
      ...mapFiltersToQueryParams(state.filters),
    }),
    [state],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDestuffingPlans(queryParams, {
    enabled: isActive,
    cacheTime: 0,
    staleTime: 0,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (isError && isActive) {
      toast.error(error?.message ?? 'Unable to load done destuff plans.');
    }
  }, [error, isError, isActive]);

  useEffect(() => {
    setExpandedPlanIds(new Set());
  }, [state.filters, state.pagination.page]);

  const plans = useMemo(() => data?.results ?? [], [data?.results]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DONE_PLANS_PAGE_SIZE));

  const showingStart = plans.length === 0 ? 0 : (state.pagination.page - 1) * DONE_PLANS_PAGE_SIZE + 1;
  const showingEnd = Math.min(total, state.pagination.page * DONE_PLANS_PAGE_SIZE);

  const handleApplyFilters = (values: FilterValues) => {
    const nextFilters = mapFilterValues(values);
    onStateChange((prev) => ({
      ...prev,
      filters: nextFilters,
      pagination: { ...prev.pagination, page: 1 },
    }));
    setManualRefreshCounter((prev) => prev + 1);
  };

  const handleClearFilters = () => {
    const defaults = createDefaultDonePlansTabState().filters;
    onStateChange((prev) => ({
      ...prev,
      filters: defaults,
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  useEffect(() => {
    if (!isActive) return;
    if (manualRefreshCounter === 0) return;
    void refetch({ throwOnError: false });
  }, [isActive, manualRefreshCounter, refetch]);

  const handlePageChange = (nextPage: number) => {
    onStateChange((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: nextPage },
    }));
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

  return (
    <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Done Plans</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review completed destuffing plans with backend-powered filters and sorting.
        </p>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
        <DynamicFilter
          fields={FILTER_FIELDS}
          initialValues={filterInitialValues}
          onApplyFilter={handleApplyFilters}
          onClear={handleClearFilters}
          buttonLabel="Filters"
          className="w-full"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
            <Calendar className="h-6 w-6 mr-2 animate-spin text-gray-500 dark:text-gray-400" />
            Loading done plans...
          </div>
        ) : isError ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-red-600 dark:text-red-300 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Unable to load done plans</p>
            <p className="text-sm text-red-500 dark:text-red-300">Please try again later.</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 gap-2">
            <Calendar className="h-10 w-10 text-gray-400 dark:text-gray-500" />
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
                const { totalContainers, totalHbls } = getPlanTotals(plan);
                const sizeLabel = `${totalContainers} container${totalContainers === 1 ? '' : 's'}`;
                const forwarderLabel = getPlanForwarderLabel(plan) ?? 'Forwarder TBD';

                return (
                  <div
                    key={plan.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => togglePlanExpansion(plan.id)}
                      className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
                      aria-expanded={isExpanded}
                      aria-controls={`done-plan-${plan.id}`}
                      aria-label={`Toggle containers for ${plan.code}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1 text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.code}</h3>
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full">
                              <Package className="h-3.5 w-3.5 mr-1" />
                              {sizeLabel}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                            <p>
                              <span className="font-medium text-gray-700 dark:text-gray-200">Forwarder:</span>{' '}
                              {forwarderLabel}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700 dark:text-gray-200">Planned:</span>{' '}
                              {formatDateTimeRange(plan.plannedStart, plan.plannedEnd)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700 dark:text-gray-200">Executed:</span>{' '}
                              {formatDateTimeRange(plan.executionStart, plan.executionEnd)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200 text-xs font-medium">
                              {totalHbls} HBL{totalHbls === 1 ? '' : 's'}
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
                        className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 space-y-4"
                      >
                        {plan.containers.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            No containers available for this plan.
                          </div>
                        ) : (
                          plan.containers.map((container) => {
                            const hblNumbers = (container.hbls || [])
                              .map((hbl) => hbl.hblNo)
                              .filter(Boolean);
                            const typeCode = container.orderContainer.summary?.typeCode;
                            const orderCode = container.orderContainer.bookingOrder?.code || container.orderContainer.orderCode;
                            const bookingNumber = container.orderContainer.bookingOrder?.bookingNumber;
                            const mblNumber = container.orderContainer.mblNumber;
                            const customsStatus = container.orderContainer.customsStatus;
                            const cargoReleaseStatus = container.orderContainer.cargoReleaseStatus;
                            const isPriority = container.orderContainer.isPriority;
                            const cargoNature = container.orderContainer.summary?.cargo_nature;
                            const cargoBadgeConfig = getCargoBadgeConfig(cargoNature);

                            return (
                              <div
                                key={container.id}
                                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-5"
                              >
                                {/* Header: Container Number + Priority Badge + Type */}
                                <div className="flex items-start gap-3 mb-4">
                                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                                      {container.orderContainer.containerNo || '—'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                      <span className="font-medium">
                                        {typeCode ? typeCode : 'Type: N/A'}
                                      </span>
                                      {container.orderContainer.sealNumber && (
                                        <>
                                          <span>•</span>
                                          <span>Seal: {container.orderContainer.sealNumber || '—'}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {isPriority && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 whitespace-nowrap transition-colors duration-150">
                                        <Zap className="h-3.5 w-3.5" />
                                        High Priority
                                      </span>
                                    )}
                                    {cargoBadgeConfig && (
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${getCargoBadgeClassName(cargoNature)}`}>
                                        {cargoBadgeConfig.icon && <cargoBadgeConfig.icon className="h-3.5 w-3.5" />}
                                        {cargoBadgeConfig.label}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-t dark:border-gray-700 pt-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</p>
                                    <div className="flex items-center gap-1.5">
                                      <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {orderCode || '—'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Booking Number</p>
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {bookingNumber || '—'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MBL</p>
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {mblNumber || '—'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {container.orderContainer.forwarderName || '—'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Status Pills (Customs & Cargo Release) */}
                                {(customsStatus || cargoReleaseStatus) && (
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {customsStatus && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        Customs: {customsStatus}
                                      </span>
                                    )}
                                    {cargoReleaseStatus && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                        Cargo: {cargoReleaseStatus}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* HBLs Section */}
                                {hblNumbers.length > 0 && (
                                  <div className="border-t dark:border-gray-700 pt-4">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                      House B/L ({hblNumbers.length})
                                    </p>
                                    <div className="max-h-32 overflow-y-auto p-1 -m-1">
                                      <div className="flex flex-wrap gap-1.5">
                                        {hblNumbers.map((hblNo) => (
                                          <span
                                            key={hblNo}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-mono font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                          >
                                            {hblNo}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, state.pagination.page - 1))}
                    disabled={state.pagination.page === 1}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="font-medium">
                    Page {state.pagination.page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(totalPages, state.pagination.page + 1))}
                    disabled={state.pagination.page >= totalPages}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
