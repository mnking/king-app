import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';

import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import {
  exportCargoReceivingQueryKeys,
  useExportCargoReceivingForwarders,
  useExportCargoReceivingPackingLists,
  useExportCargoReceivingServiceOrderLookup,
} from '../hooks';
import type {
  ExportCargoReceivingListItem,
  ExportCargoReceivingOrderBy,
  ExportCargoReceivingOrderDir,
  ExportCargoReceivingPackingListListItem,
  ExportCargoReceivingStatus,
  ExportCargoReceivingWorkingStatus,
} from '../types';
import ExportCargoReceivingTable from './ExportCargoReceivingTable';

const WORKING_STATUSES: ExportCargoReceivingWorkingStatus[] = [
  'INITIALIZED',
  'IN_PROGRESS',
];

const STATUS_FILTER_OPTIONS: { value: ExportCargoReceivingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' }, // TODO(i18n)
  { value: 'PARTIAL', label: 'Partial' }, // TODO(i18n)
  { value: 'APPROVED', label: 'Approved' }, // TODO(i18n)
  { value: 'DONE', label: 'Done' }, // TODO(i18n)
];

export const ExportCargoReceivingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      search:
        typeof filterValues.search === 'string' && filterValues.search.trim()
          ? filterValues.search.trim()
          : undefined,
      forwarderId:
        typeof filterValues.forwarderId === 'string'
          ? filterValues.forwarderId
          : undefined,
      status:
        typeof filterValues.status === 'string' && filterValues.status
          ? (filterValues.status as ExportCargoReceivingStatus)
          : undefined,
      containerNumber:
        typeof filterValues.containerNumber === 'string' &&
        filterValues.containerNumber.trim()
          ? filterValues.containerNumber.trim()
          : undefined,
      directionFlow: 'EXPORT' as const,
      workingStatus: WORKING_STATUSES,
      orderBy:
        typeof filterValues.orderBy === 'string' && filterValues.orderBy
          ? (filterValues.orderBy as ExportCargoReceivingOrderBy)
          : undefined,
      orderDir:
        typeof filterValues.orderDir === 'string' && filterValues.orderDir
          ? (filterValues.orderDir as ExportCargoReceivingOrderDir)
          : undefined,
    }),
    [
      filterValues.containerNumber,
      filterValues.forwarderId,
      filterValues.orderBy,
      filterValues.orderDir,
      filterValues.search,
      filterValues.status,
      pagination.pageIndex,
      pagination.pageSize,
    ],
  );

  const {
    data: packingListResponse,
    isLoading,
    isFetching,
    error,
  } = useExportCargoReceivingPackingLists(queryParams);

  const packingLists = useMemo<ExportCargoReceivingPackingListListItem[]>(
    () => packingListResponse?.results ?? [],
    [packingListResponse?.results],
  );

  const totalCount = packingListResponse?.total ?? 0;

  const forwarderIds = useMemo(
    () =>
      Array.from(
        new Set(
          packingLists
            .map((item) => item.forwarderId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [packingLists],
  );

  const { data: forwardersResponse } = useExportCargoReceivingForwarders(
    { itemsPerPage: 100 },
    { enabled: true },
  );
  const forwarders = useMemo(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse?.results],
  );
  const forwarderNameById = useMemo(
    () => new Map(forwarders.map((forwarder) => [forwarder.id, forwarder.name])),
    [forwarders],
  );

  const { lookup: serviceOrderLookup } =
    useExportCargoReceivingServiceOrderLookup(forwarderIds);

  const tableRows = useMemo<ExportCargoReceivingListItem[]>(
    () =>
      packingLists.map((item) => ({
        ...item,
        forwarderName:
          forwarderNameById.get(item.forwarderId) ??
          item.hblData?.forwarderName ??
          null,
        serviceOrderNumber: serviceOrderLookup.get(item.id) ?? null,
      })),
    [forwarderNameById, packingLists, serviceOrderLookup],
  );

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'search',
        label: 'Search', // TODO(i18n)
        placeholder: 'Search MBL, HBL, container, forwarder, consignee...', // TODO(i18n)
      },
      {
        type: 'select' as const,
        name: 'forwarderId',
        label: 'Forwarder',
        options: forwarders,
        keyField: 'id' as const,
        valueField: 'name' as const,
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status', // TODO(i18n)
        options: STATUS_FILTER_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'Select status', // TODO(i18n)
      },
      {
        type: 'text' as const,
        name: 'containerNumber',
        label: 'Container Number', // TODO(i18n)
        placeholder: 'Search container number...', // TODO(i18n)
      },
      {
        type: 'select' as const,
        name: 'orderBy',
        label: 'Sort By', // TODO(i18n)
        options: [
          { value: 'updatedAt', label: 'Last Updated' }, // TODO(i18n)
          { value: 'createdAt', label: 'Created' }, // TODO(i18n)
          { value: 'packingListNumber', label: 'Packing List #' }, // TODO(i18n)
          { value: 'eta', label: 'ETA' }, // TODO(i18n)
          { value: 'status', label: 'Status' }, // TODO(i18n)
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
      {
        type: 'select' as const,
        name: 'orderDir',
        label: 'Order', // TODO(i18n)
        options: [
          { value: 'asc', label: 'Ascending' }, // TODO(i18n)
          { value: 'desc', label: 'Descending' }, // TODO(i18n)
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
      },
    ],
    [forwarders],
  );

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues({
      search: values.search,
      forwarderId: values.forwarderId,
      status: values.status,
      containerNumber: values.containerNumber,
      orderBy: values.orderBy,
      orderDir: values.orderDir,
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    queryClient.invalidateQueries({
      queryKey: exportCargoReceivingQueryKeys.packingLists(),
    });
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    queryClient.invalidateQueries({
      queryKey: exportCargoReceivingQueryKeys.packingLists(),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0">
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-shrink-0 flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  buttonLabel="Filters"
                  className="flex-1"
                  initialValues={filterValues}
                />
              </div>
            </div>

            <ExportCargoReceivingTable
              packingLists={tableRows}
              loading={isLoading}
              fetching={isFetching}
              error={error instanceof Error ? error.message : null}
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCargoReceivingManagement;
