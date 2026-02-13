import React, { useEffect, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import EntityTable from '@/shared/components/EntityTable';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import ContainerPositionStatusModal from './ContainerPositionStatusModal';
import { useAvailableContainers, useForwardersForContainerPosition } from '../hooks';
import type { ContainerPosition, ContainerPositionRow, PositionStatus } from '../types';
import { bookingOrderContainersApi } from '@/services/apiCFS';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { useAuth } from '@/features/auth/useAuth';

const normalizePositionStatus = (
  status?: ContainerPosition['containerStatus'] | ContainerPosition['positionStatus'],
): PositionStatus => {
  if (!status) return null;
  const normalized = typeof status === 'string' ? status.toUpperCase() : status;
  return normalized === 'AT_PORT' || normalized === 'IN_YARD' ? normalized : null;
};

const formatDateDisplay = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const statusBadges: Record<NonNullable<PositionStatus>, string> = {
  AT_PORT:
    'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-200 dark:bg-amber-900/30 dark:border-amber-800/60',
  IN_YARD:
    'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/60',
};
const statusLabels: Record<NonNullable<PositionStatus>, string> = {
  AT_PORT: 'Discharged',
  IN_YARD: 'Stored',
};

const ContainerPositionStatusPage: React.FC = () => {
  const { can } = useAuth();
  const canWriteContainerStatus = can?.('container_position_status:write') ?? false;
  const [rows, setRows] = useState<ContainerPositionRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeContainer, setActiveContainer] =
    useState<ContainerPositionRow | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const { data: forwardersResponse } = useForwardersForContainerPosition({
    status: 'Active'
  });
  const forwarders = useMemo(() => forwardersResponse?.results ?? [], [forwardersResponse]);

  const filters = useMemo(
    () => ({
      containerNo:
        typeof filterValues.containerNo === 'string' && filterValues.containerNo.trim() !== ''
          ? filterValues.containerNo.trim()
          : undefined,
      forwarderId: typeof filterValues.forwarderId === 'string' ? filterValues.forwarderId : undefined,
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
    }),
    [filterValues, pagination],
  );

  const { data: availableContainers, isLoading, isFetching, error } =
    useAvailableContainers(filters, { keepPreviousData: true });

  useEffect(() => {
    if (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch available containers';
      toast.error(message);
    }
  }, [error]);

  useEffect(() => {
    if (!availableContainers) {
      setRows([]);
      return;
    }

    const results = availableContainers.results ?? [];
    setRows(
      results.map((container: ContainerPosition) => {
        const order = container.order;
        return {
          id: container.id,
          orderId: order?.code ?? container.orderId,
          containerNumber: container.containerNo,
          sealNumber: container.sealNumber ?? '',
          forwarder: order?.agentCode ?? order?.agentId ?? '—',
          eta: order?.eta ?? '',
          positionStatus: normalizePositionStatus(container.containerStatus),
        };
      }),
    );
  }, [availableContainers]);

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'containerNo',
        label: 'Container No.',
        placeholder: 'Enter container number',
      },
      {
        type: 'select' as const,
        name: 'forwarderId',
        label: 'Forwarder',
        options: forwarders,
        keyField: 'id' as const,
        valueField: 'name' as const,
        placeholder: 'All forwarders',
      },
    ],
    [forwarders],
  );

  const renderStatus = (status: PositionStatus) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          N/A
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadges[status]}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {statusLabels[status]}
      </span>
    );
  };

  const columns = useMemo(
    () => [
      {
        key: 'orderId',
        label: 'Order',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {row.orderId}
          </span>
        ),
      },
      {
        key: 'containerNumber',
        label: 'Container',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {row.containerNumber}
          </span>
        ),
      },
      {
        key: 'sealNumber',
        label: 'Seal',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <span className="text-gray-700 dark:text-gray-200">
            {row.sealNumber || '—'}
          </span>
        ),
      },
      {
        key: 'forwarder',
        label: 'Forwarder',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <span className="text-gray-700 dark:text-gray-200">
            {row.forwarder}
          </span>
        ),
      },
      {
        key: 'eta',
        label: 'ETA',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <span className="text-gray-700 dark:text-gray-200">
            {formatDateDisplay(row.eta)}
          </span>
        ),
      },
      {
        key: 'positionStatus',
        label: 'Position Status',
        sortable: true,
        render: (row: ContainerPositionRow) => (
          <div className="flex items-center gap-2">
            {renderStatus(row.positionStatus)}
          </div>
        ),
      },
    ],
    [],
  );

  const openModal = (row: ContainerPositionRow, mode: 'view' | 'edit') => {
    if (mode === 'edit' && !canWriteContainerStatus) {
      toast.error('You do not have permission to modify container positions.');
      return;
    }
    setActiveContainer(row);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleSave = async (
    payload: Pick<ContainerPositionRow, 'id' | 'sealNumber' | 'eta' | 'positionStatus'>,
  ) => {
    if (!canWriteContainerStatus) {
      toast.error('You do not have permission to modify container positions.');
      return;
    }
    setIsSaving(true);
    try {
      const containerStatus = payload.positionStatus
        ? payload.positionStatus.toUpperCase()
        : null;

      const response = await bookingOrderContainersApi.update(payload.id, {
        sealNumber: payload.sealNumber,
        eta: payload.eta,
        containerStatus,
      });

      const updated = response.data;
      const order = updated?.order;

      setRows((prev) =>
        prev.map((row) =>
          row.id === payload.id
            ? {
                ...row,
                sealNumber: updated?.sealNumber ?? payload.sealNumber,
                eta: order?.eta ?? updated?.eta ?? payload.eta,
                positionStatus: normalizePositionStatus(
                  updated?.containerStatus ?? payload.positionStatus,
                ),
                orderId: order?.code ?? row.orderId,
                forwarder: order?.agentCode ?? order?.agentId ?? row.forwarder,
              }
            : row,
        ),
      );
      toast.success('Position status saved');
      setIsModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save position status';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {isLoading && <LoadingSpinner size="sm" />}
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  buttonLabel="Filters"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <EntityTable<ContainerPositionRow>
                entities={rows}
                loading={isLoading}
                fetching={isFetching && !isLoading}
                error={
                  error instanceof Error ? error.message : error ? 'Failed to load containers' : null
                }
                entityName="container"
                entityNamePlural="containers"
                getId={(row) => row.id}
                columns={columns}
                actions={[
                  {
                    key: 'view',
                    label: 'View',
                    onClick: (row: ContainerPositionRow) =>
                      openModal(row, 'view'),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    onClick: (row: ContainerPositionRow) =>
                      openModal(row, 'edit'),
                    disabled: () => !canWriteContainerStatus,
                  },
                ]}
                enablePagination={true}
                enableServerSidePagination={true}
                totalCount={availableContainers?.total ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
                initialPageSize={pagination.pageSize}
                emptyStateMessage="No containers found. Connect the API to populate this table."
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <ContainerPositionStatusModal
        open={isModalOpen}
        container={activeContainer}
        mode={modalMode}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ContainerPositionStatusPage;
