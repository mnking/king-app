import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, PackageCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EntityTable from '@/shared/components/EntityTable';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { formatDate } from '@/shared/utils/date-format';
import { getContainerTypeCode } from '@/shared/features/plan/utils/plan-display-helpers';
import {
  bookingOrderContainersApi,
  bookingOrdersApi,
  customsCfsImportApi,
  type CustomsCfsImportRequestType,
  type CustomsDeclarationEventAckResponse,
  type CustomsImportSubmissionStatusResponse,
} from '@/services/apiCFS';
import { useAuth } from '@/features/auth/useAuth';
import {
  useReceivingContainers,
  useReceivingContainersQueries,
  type ReceivingContainerRow,
} from '../hooks/use-receiving-containers';
import ReceiveContainerModal from './ReceiveContainerModal';
import ContainerReceivingDetailModal from './ContainerReceivingDetailModal';
import {
  CUSTOMS_REQUEST_STATUS_LABELS,
  CUSTOMS_REQUEST_STATUS_STEPS,
  POSITION_STATUS_LABELS,
  type CustomsRequestStatus,
  type ContainerPositionStatus,
} from '../types/container-receiving-types';
import type { CargoReleaseStatus } from '@/shared/constants/container-status';

type ContainerWithStatus = ReceivingContainerRow;

const normalizePositionStatus = (
  status?: string | null,
): ContainerPositionStatus => {
  if (!status) return 'UNKNOWN';
  const normalized = status
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return normalized in POSITION_STATUS_LABELS
    ? (normalized as ContainerPositionStatus)
    : 'UNKNOWN';
};

const normalizeCustomsStatus = (
  status?: string | null,
): CustomsRequestStatus => {
  if (!status) return 'UNIDENTIFIED';
  const normalized = status
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return CUSTOMS_REQUEST_STATUS_STEPS.includes(
    normalized as CustomsRequestStatus,
  )
    ? (normalized as CustomsRequestStatus)
    : 'UNIDENTIFIED';
};

const formatSummaryDate = (summary: unknown, key: string) => {
  if (!summary || typeof summary !== 'object') return '—';
  const value = (summary as Record<string, unknown>)[key];
  if (typeof value !== 'string') return '—';
  return formatDate(value);
};

const positionBadgeClasses: Record<ContainerPositionStatus, string> = {
  UNKNOWN:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  AT_PORT:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  IN_YARD:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  IN_CFS:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  GATED_IN:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  GATED_OUT:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  ON_VESSEL:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  ON_BARGE:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
  IN_CUSTOMS:
    'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-900/30 dark:text-pink-200',
  IN_MR:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
  SEIZED:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200',
};

const customsBadgeClasses: Record<CustomsRequestStatus, string> = {
  UNIDENTIFIED:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  IDENTIFIED:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  GOT_IN:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  DESTUFF_APPROVED:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
};

const RECEIVE_ALLOWED_POSITION_STATUSES = new Set<ContainerPositionStatus>([
  'AT_PORT',
  'IN_YARD',
]);

type CustomsSubmitAction = Extract<CustomsRequestStatus, 'IDENTIFIED' | 'GOT_IN'>;

const CUSTOMS_REQUEST_TYPE_BY_ACTION: Record<
  CustomsSubmitAction,
  CustomsCfsImportRequestType
> = {
  IDENTIFIED: 'CFS_IMPORT_IDENTIFICATION',
  GOT_IN: 'CFS_IMPORT_GET_IN',
};

export const ContainerReceivingPage: React.FC = () => {
  const { can } = useAuth();
  const canWrite = can?.('actual_container_receive:write') ?? false;

  const { data, isLoading, isFetching, error } = useReceivingContainers();
  const { refetchReceivingContainers } = useReceivingContainersQueries();

  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [activeDetail, setActiveDetail] = useState<ContainerWithStatus | null>(null);
  const [activeReceive, setActiveReceive] = useState<ContainerWithStatus | null>(null);
  const [isReceiveViewMode, setIsReceiveViewMode] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [isSavingCargoRelease, setIsSavingCargoRelease] = useState(false);

  useEffect(() => {
    if (!error) return;
    const message = error instanceof Error ? error.message : 'Failed to load containers';
    toast.error(message);
  }, [error]);

  const containers = useMemo(() => (data ?? []) as ContainerWithStatus[], [data]);

  useEffect(() => {
    if (!activeDetail) return;
    const latest = containers.find((container) => container.id === activeDetail.id);
    if (latest && latest !== activeDetail) {
      setActiveDetail(latest);
    }
  }, [containers, activeDetail]);

  const handleApplyFilter = useCallback(
    (values: FilterValues) => {
      setFilterValues(values);
      void refetchReceivingContainers();
    },
    [refetchReceivingContainers],
  );

  const handleClearFilter = useCallback(() => {
    setFilterValues({});
    void refetchReceivingContainers();
  }, [refetchReceivingContainers]);

  const filteredContainers = useMemo(() => {
    const containerNoFilter =
      typeof filterValues.containerNo === 'string' ? filterValues.containerNo.trim().toLowerCase() : '';
    const agentFilter =
      typeof filterValues.agent === 'string' ? filterValues.agent.trim().toLowerCase() : '';

    return containers.filter((container) => {
      const matchesContainer = containerNoFilter
        ? Boolean(container.containerNo?.toLowerCase().includes(containerNoFilter))
        : true;

      const agentValue = `${container.bookingOrder?.agentCode ?? ''} ${container.bookingOrder?.agentId ?? ''}`.trim().toLowerCase();
      const matchesAgent = agentFilter ? agentValue.includes(agentFilter) : true;

      return matchesContainer && matchesAgent;
    });
  }, [containers, filterValues]);

  const getCustomsStatus = useCallback(
    (container: ContainerWithStatus) =>
      normalizeCustomsStatus(container.customsRequestStatus),
    [],
  );

  const openDetail = (container: ContainerWithStatus) => {
    setActiveDetail(container);
  };

  const isReceivedContainer = useCallback(
    (container: ContainerWithStatus): boolean =>
      container.planContainerStatus === 'RECEIVED' ||
      Boolean(container.planContainerReceivedAt),
    [],
  );

  const canReceiveByPositionStatus = useCallback(
    (container: ContainerWithStatus): boolean => {
      const positionStatus = normalizePositionStatus(container.containerStatus);
      if (container.isImportFlow === false) return true;
      return RECEIVE_ALLOWED_POSITION_STATUSES.has(positionStatus);
    },
    [],
  );

  const getReceiveDisabledReason = useCallback(
    (container: ContainerWithStatus): string | null => {
      if (!canWrite) return 'No write permission';
      if (container.source !== 'UNPLANNED') return 'Already assigned to plan';
      if (!canReceiveByPositionStatus(container)) return 'Requires Discharged/Stored status';
      return null;
    },
    [canReceiveByPositionStatus, canWrite],
  );

  const openReceive = (
    container: ContainerWithStatus,
    options: { viewMode?: boolean } = {},
  ) => {
    if (options.viewMode) {
      if (!isReceivedContainer(container)) {
        toast.error('Receive data is not available for this container.');
        return;
      }
      setIsReceiveViewMode(true);
      setActiveReceive(container);
      return;
    }

    const disabledReason = getReceiveDisabledReason(container);
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }

    setIsReceiveViewMode(false);
    setActiveReceive(container);
  };

  const handleSubmitCustomsRequest = async (
    bookingOrderContainerId: string,
    status: CustomsSubmitAction,
  ): Promise<CustomsDeclarationEventAckResponse> => {
    if (!canWrite) {
      throw new Error('You do not have permission to update customs declaration.');
    }

    try {
      const response =
        status === 'IDENTIFIED'
          ? await customsCfsImportApi.submitIdentification(bookingOrderContainerId)
          : await customsCfsImportApi.submitGetIn(bookingOrderContainerId);
      toast.success(`${CUSTOMS_REQUEST_STATUS_LABELS[status]} request submitted`);
      return response;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to submit ${CUSTOMS_REQUEST_STATUS_LABELS[status]} request`;
      toast.error(message);
      throw new Error(message);
    }
  };

  const handleGetCustomsSubmissionStatus = async (
    bookingOrderContainerId: string,
    requestType: CustomsCfsImportRequestType,
  ): Promise<CustomsImportSubmissionStatusResponse> => {
    if (!canWrite) {
      throw new Error('You do not have permission to query customs status.');
    }

    try {
      const response = await customsCfsImportApi.getSubmissionStatus({
        bookingOrderContainerId,
        requestType,
      });
      toast.success('Customs status fetched');
      await refetchReceivingContainers();
      return response;
    } catch (error) {
      const action =
        requestType === CUSTOMS_REQUEST_TYPE_BY_ACTION.IDENTIFIED
          ? CUSTOMS_REQUEST_STATUS_LABELS.IDENTIFIED
          : CUSTOMS_REQUEST_STATUS_LABELS.GOT_IN;
      const message =
        error instanceof Error
          ? error.message
          : `Failed to fetch ${action} status`;
      toast.error(message);
      throw new Error(message);
    }
  };

  const handleReceive = async (payload: { truckNo: string; notes?: string | null }) => {
    if (!activeReceive) return;
    if (isReceiveViewMode) return;
    setIsReceiving(true);
    try {
      await bookingOrderContainersApi.receive(activeReceive.id, {
        truckNo: payload.truckNo,
        notes: payload.notes ?? null,
        receivedType: 'NORMAL',
      });
      toast.success('Container received');
      setActiveReceive(null);
      setIsReceiveViewMode(false);
      await refetchReceivingContainers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to receive container';
      toast.error(message);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleUpdatePosition = async (
    containerId: string,
    status: ContainerPositionStatus,
    bookingOrderId: string | null,
    ata: string,
  ): Promise<boolean> => {
    if (!canWrite) {
      toast.error('You do not have permission to update position status.');
      return false;
    }
    if (!bookingOrderId) {
      toast.error('Missing booking order reference.');
      return false;
    }
    setIsSavingPosition(true);
    try {
      await bookingOrderContainersApi.update(containerId, {
        containerStatus: status,
      });
      await bookingOrdersApi.updatePlan(bookingOrderId, { ata });
      toast.success('Position status updated');
      await refetchReceivingContainers();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update position status';
      toast.error(message);
      return false;
    } finally {
      setIsSavingPosition(false);
    }
  };

  const handleUpdateCargoRelease = async (
    container: EnrichedUnplannedContainer,
    status: CargoReleaseStatus,
  ) => {
    if (!canWrite) {
      toast.error('You do not have permission to update destuff status.');
      return;
    }
    if (!container.id) {
      toast.error('Missing container reference.');
      return;
    }
    setIsSavingCargoRelease(true);
    try {
      await bookingOrderContainersApi.update(container.id, {
        cargoReleaseStatus: status,
      });
      toast.success('Destuff request status updated');
      await refetchReceivingContainers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update destuff status';
      toast.error(message);
    } finally {
      setIsSavingCargoRelease(false);
    }
  };

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'containerNo',
        label: 'Container No.',
        placeholder: 'Search container number',
      },
      {
        type: 'text' as const,
        name: 'agent',
        label: 'Agent',
        placeholder: 'Search forwarder code or ID',
      },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        key: 'containerNo',
        label: 'Container',
        sortable: true,
        render: (row: ContainerWithStatus) => {
          const typeCode = getContainerTypeCode({ orderContainer: row });
          const customsStatus = getCustomsStatus(row);
          const positionStatus = normalizePositionStatus(row.containerStatus);
          const pendingGetIn =
            positionStatus === 'IN_CFS' && customsStatus === 'IDENTIFIED';

          return (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {row.containerNo}
                </span>
                {typeCode ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                    {typeCode}
                  </span>
                ) : null}
                {row.source === 'PLAN' ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200">
                    Plan {row.planStatus ?? ''}
                  </span>
                ) : null}
                {pendingGetIn ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    Pending get-in
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {row.mblNumber ? `MBL: ${row.mblNumber}` : 'MBL: —'}
              </div>
            </div>
          );
        },
      },
      {
        key: 'sealNumber',
        label: 'Seal',
        sortable: true,
        render: (row: ContainerWithStatus) => (
          <span className="text-gray-700 dark:text-gray-200">
            {row.sealNumber ?? '—'}
          </span>
        ),
      },
      {
        key: 'orderCode',
        label: 'Order Code',
        sortable: true,
        render: (row: ContainerWithStatus) => (
          <span className="text-gray-700 dark:text-gray-200">
            {row.bookingOrder?.code ?? row.orderCode ?? '—'}
          </span>
        ),
      },
      {
        key: 'agent',
        label: 'Agent',
        sortable: true,
        render: (row: ContainerWithStatus) => (
          <span className="text-gray-700 dark:text-gray-200">
            {row.bookingOrder?.agentCode ?? row.bookingOrder?.agentId ?? '—'}
          </span>
        ),
      },
      {
        key: 'eta',
        label: 'ETA / ATA',
        sortable: false,
        render: (row: ContainerWithStatus) => {
          const ataValue = row.bookingOrder?.ata ?? null;
          const ataDisplay = ataValue
            ? formatDate(ataValue)
            : formatSummaryDate(row.summary, 'ata');

          return (
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <div>ETA: {formatDate(row.eta ?? row.bookingOrder?.eta ?? null)}</div>
              <div>ATA: {ataDisplay}</div>
            </div>
          );
        },
      },
      {
        key: 'positionStatus',
        label: 'Position Status',
        sortable: false,
        render: (row: ContainerWithStatus) => {
          const positionStatus = normalizePositionStatus(row.containerStatus);
          return (
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${positionBadgeClasses[positionStatus]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {POSITION_STATUS_LABELS[positionStatus]}
            </span>
          );
        },
      },
      {
        key: 'customsRequestStatus',
        label: 'Customs Declaration Status',
        sortable: false,
        render: (row: ContainerWithStatus) => {
          const customsStatus = getCustomsStatus(row);
          return (
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${customsBadgeClasses[customsStatus]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {CUSTOMS_REQUEST_STATUS_LABELS[customsStatus]}
            </span>
          );
        },
      },
    ],
    [getCustomsStatus],
  );

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {isLoading && <LoadingSpinner size="sm" />}
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Container Receiving
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Track unplanned containers and record receiving statuses.
                  </p>
                </div>
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  buttonLabel="Filters"
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <EntityTable<ContainerWithStatus>
                entities={filteredContainers}
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
                    key: 'detail',
                    label: 'Detail',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: (row) => openDetail(row),
                  },
                  {
                    key: 'receive',
                    label: (row) => {
                      const reason = getReceiveDisabledReason(row);
                      return (
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span>Receive</span>
                          {reason ? (
                            <span className="text-[11px] font-normal text-amber-700 dark:text-amber-300">
                              {reason}
                            </span>
                          ) : null}
                        </span>
                      );
                    },
                    icon: <PackageCheck className="h-4 w-4" />,
                    onClick: (row) => openReceive(row),
                    hidden: (row) => isReceivedContainer(row),
                    disabled: (row) => Boolean(getReceiveDisabledReason(row)),
                  },
                  {
                    key: 'view-receive',
                    label: 'View Receive',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: (row) => openReceive(row, { viewMode: true }),
                    hidden: (row) => !isReceivedContainer(row),
                  },
                ]}
                enablePagination={true}
                initialPageSize={50}
                emptyStateMessage="No containers found."
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <ContainerReceivingDetailModal
        open={Boolean(activeDetail)}
        container={activeDetail}
        bookingOrderContainerId={activeDetail?.id ?? null}
        onClose={() => setActiveDetail(null)}
        onUpdatePosition={handleUpdatePosition}
        onUpdateCargoRelease={handleUpdateCargoRelease}
        onSubmitCustomsRequest={handleSubmitCustomsRequest}
        onGetCustomsSubmissionStatus={handleGetCustomsSubmissionStatus}
        customsStatus={
          activeDetail ? getCustomsStatus(activeDetail) : 'UNIDENTIFIED'
        }
        isSavingPosition={isSavingPosition}
        isSavingCargoRelease={isSavingCargoRelease}
        canWrite={canWrite}
      />

      <ReceiveContainerModal
        open={Boolean(activeReceive)}
        container={activeReceive}
        onClose={() => {
          setActiveReceive(null);
          setIsReceiveViewMode(false);
        }}
        onSubmit={handleReceive}
        isSubmitting={isReceiving}
        viewMode={isReceiveViewMode}
      />
    </div>
  );
};

export default ContainerReceivingPage;
