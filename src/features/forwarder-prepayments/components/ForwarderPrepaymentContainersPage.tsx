import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { ArrowLeft, Eye, Receipt } from 'lucide-react';
import type { EntityColumn } from '@/shared/components/EntityTable';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import Button from '@/shared/components/ui/Button';
import { bookingOrderQueryKeys, useBookingOrder } from '@/features/booking-orders/hooks';
import {
  exportPlanQueryKeys,
  useExportPlan,
  useExportOrder,
} from '@/features/stuffing-planning/hooks';
import {
  billingPaymentsApi,
  type BillingPaymentDetail,
} from '@/services/apiBillingPayments';
import { bookingOrderContainersApi } from '@/services/apiCFS';
import type { ContainerPayment, ContainerPaymentStatus, Direction } from '../types';
import { formatCurrency } from '../helpers/format';
import { ContainerDetailDrawer } from './ContainerDetailDrawer';
import type { PaymentRecordForm } from '../schemas/payment-record-schema';
import toast from 'react-hot-toast';

const statusBadge = (status: ContainerPaymentStatus) => {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  return status === 'DONE'
    ? `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`
    : `${base} bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`;
};

const allowDestuffingBadge = (allowed?: boolean | null) => {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (allowed === true) {
    return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`;
  }
  if (allowed === false) {
    return `${base} bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200`;
  }
  return `${base} bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300`;
};

const parseDirection = (value?: string): Direction =>
  value === 'EXPORT' ? 'EXPORT' : 'IMPORT';

const sumReceivedAmount = (detail: BillingPaymentDetail | null) => {
  if (!detail?.paymentRecords?.length) return null;
  return detail.paymentRecords.reduce(
    (sum, record) => sum + (record.actualAmount ?? 0),
    0,
  );
};

export const ForwarderPrepaymentContainersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { direction: directionParam, orderId } = useParams();
  const direction = parseDirection(directionParam);
  const isImport = direction === 'IMPORT';

  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null,
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isSavingDestuffing, setIsSavingDestuffing] = useState(false);

  const refreshOrderDetail = async () => {
    if (!orderId) return;
    await queryClient.invalidateQueries({
      queryKey: isImport
        ? bookingOrderQueryKeys.detail(orderId)
        : exportPlanQueryKeys.detail(orderId),
    });
  };

  const refreshBillingDetail = async (entityRef?: string | null) => {
    if (!entityRef) return;
    await queryClient.invalidateQueries({
      queryKey: ['billingPayments', 'detail', entityRef],
    });
  };

  const bookingOrderQuery = useBookingOrder(isImport ? orderId ?? '' : '');
  const exportPlanQuery = useExportPlan(orderId ?? '', {
    enabled: !isImport && Boolean(orderId),
  });
  const exportOrderQuery = useExportOrder(
    exportPlanQuery.data?.exportOrderId ?? '',
    { enabled: Boolean(exportPlanQuery.data?.exportOrderId) },
  );

  const orderReference = useMemo(() => {
    if (isImport) {
      return {
        bookingNumber:
          bookingOrderQuery.data?.bookingNumber ?? bookingOrderQuery.data?.code ?? null,
      };
    }
    return {
      exportPlanCode: exportPlanQuery.data?.code ?? null,
    };
  }, [isImport, bookingOrderQuery.data, exportPlanQuery.data]);

  const forwarderCode = isImport
    ? bookingOrderQuery.data?.agentCode ?? null
    : exportOrderQuery.data?.forwarderCode ?? null;
  const forwarderId = isImport
    ? bookingOrderQuery.data?.agentId ?? null
    : exportOrderQuery.data?.forwarderId ?? null;

  const containers = useMemo<ContainerPayment[]>(() => {
    const rawContainers = isImport
      ? bookingOrderQuery.data?.containers ?? []
      : exportPlanQuery.data?.containers ?? [];

    return rawContainers.map((container: any) => {
      const containerId = container.id as string;
      const entityRef = containerId;
      const summary = (() => {
        if (!container.summary) return null;
        if (typeof container.summary === 'string') {
          try {
            return JSON.parse(container.summary);
          } catch {
            return null;
          }
        }
        return container.summary;
      })();
      const containerTypeCode = isImport
        ? (container.typeCode ??
            container.containerTypeCode ??
            summary?.typeCode ??
            null)
        : (container.containerTypeCode ?? null);
      const paymentStatus = container.paymentStatus === 'DONE' ? 'DONE' : 'PENDING';
      return {
        id: containerId,
        entityRef,
        direction,
        containerNumber: isImport ? container.containerNo : container.containerNumber,
        containerTypeCode,
        sealNumber: container.sealNumber ?? null,
        allowStuffingOrDestuffing:
          typeof container.allowStuffingOrDestuffing === 'boolean'
            ? container.allowStuffingOrDestuffing
            : null,
        paymentStatus,
        forwarderId,
        forwarderCode,
        orderReference,
      };
    });
  }, [
    direction,
    exportPlanQuery.data,
    forwarderCode,
    forwarderId,
    isImport,
    bookingOrderQuery.data,
    orderReference,
  ]);

  const billingQueries = useQueries({
    queries: containers.map((container) => ({
      queryKey: ['billingPayments', 'detail', container.entityRef],
      queryFn: () =>
        billingPaymentsApi.getPaymentDetail('CONTAINER', container.entityRef),
      enabled: Boolean(container.entityRef),
      retry: false,
      staleTime: 0,
    })),
  });

  const billingDetailByRef = useMemo(() => {
    const map = new Map<string, BillingPaymentDetail | null>();
    containers.forEach((container, index) => {
      const query = billingQueries[index];
      if (container.entityRef) {
        map.set(container.entityRef, query?.data ?? null);
      }
    });
    return map;
  }, [billingQueries, containers]);

  const billingQueryByRef = useMemo(() => {
    const map = new Map<string, typeof billingQueries[number]>();
    containers.forEach((container, index) => {
      if (container.entityRef) {
        map.set(container.entityRef, billingQueries[index]);
      }
    });
    return map;
  }, [billingQueries, containers]);

  const filteredContainers = useMemo(() => {
    const containerNumberValue =
      typeof filterValues.containerNumber === 'string'
        ? filterValues.containerNumber.trim().toLowerCase()
        : '';
    const statusValue =
      typeof filterValues.paymentStatus === 'string'
        ? filterValues.paymentStatus
        : '';

    return containers.filter((container) => {
      if (
        containerNumberValue &&
        !String(container.containerNumber ?? '')
          .toLowerCase()
          .includes(containerNumberValue)
      ) {
        return false;
      }
      if (statusValue && container.paymentStatus !== statusValue) {
        return false;
      }
      return true;
    });
  }, [containers, filterValues]);

  const totalCount = filteredContainers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const clampedPageIndex = Math.min(pagination.pageIndex, totalPages - 1);
  const pageStart = clampedPageIndex * pagination.pageSize;
  const pageEnd = pageStart + pagination.pageSize;
  const pageContainers = filteredContainers.slice(pageStart, pageEnd);

  useEffect(() => {
    if (pagination.pageIndex !== clampedPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: clampedPageIndex }));
    }
  }, [clampedPageIndex, pagination.pageIndex]);

  const selectedContainer =
    containers.find((container) => container.id === selectedContainerId) ?? null;
  const selectedPaymentDetail = selectedContainer
    ? billingDetailByRef.get(selectedContainer.entityRef) ?? null
    : null;
  const selectedPaymentLoading = selectedContainer
    ? billingQueryByRef.get(selectedContainer.entityRef)?.isFetching ?? false
    : false;

  const filterFields = [
    {
      type: 'text' as const,
      name: 'containerNumber',
      label: 'Container number',
      placeholder: 'Search container',
    },
    {
      type: 'select' as const,
      name: 'paymentStatus',
      label: 'Payment status',
      options: [
        { id: 'PENDING', name: 'Pending' },
        { id: 'DONE', name: 'Done' },
      ],
      keyField: 'id',
      valueField: 'name',
      placeholder: 'Select status',
    },
  ];

  const columns: EntityColumn<ContainerPayment>[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        render: (container) => (
          <span className={statusBadge(container.paymentStatus)}>
            {container.paymentStatus === 'DONE' ? 'Done' : 'Pending'}
          </span>
        ),
      },
      {
        key: 'allowDestuffing',
        label: 'Allow destuffing',
        render: (container) => {
          if (container.direction !== 'IMPORT') {
            return <span className={allowDestuffingBadge(null)}>—</span>;
          }
          const isAllowed = Boolean(container.allowStuffingOrDestuffing);
          return (
            <span className={allowDestuffingBadge(isAllowed)}>
              {isAllowed ? 'Allowed' : 'Not allowed'}
            </span>
          );
        },
      },
      {
        key: 'containerNumber',
        label: 'Container',
        render: (container) => (
          <div className="font-semibold text-gray-900 dark:text-white">
            {container.containerNumber ?? '—'}
          </div>
        ),
      },
      {
        key: 'containerTypeCode',
        label: 'Container type',
        render: (container) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {container.containerTypeCode ?? '—'}
          </span>
        ),
      },
      {
        key: 'sealNumber',
        label: 'Seal',
        render: (container) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {container.sealNumber ?? '—'}
          </span>
        ),
      },
      {
        key: 'forwarderCode',
        label: isImport ? 'Agent code' : 'Forwarder code',
        render: (container) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {container.forwarderCode ?? '—'}
          </span>
        ),
      },
      {
        key: 'totalAmount',
        label: 'Total amount',
        render: (container) => {
          const detail = billingDetailByRef.get(container.entityRef) ?? null;
          return (
            <span className="font-medium text-gray-900 dark:text-white">
              {typeof detail?.totalAmount === 'number'
                ? formatCurrency(detail.totalAmount)
                : '—'}
            </span>
          );
        },
      },
      {
        key: 'receivedAmount',
        label: 'Received amount',
        render: (container) => {
          const detail = billingDetailByRef.get(container.entityRef) ?? null;
          const received = sumReceivedAmount(detail);
          return (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {typeof received === 'number' ? formatCurrency(received) : '—'}
            </span>
          );
        },
      },
      {
        key: 'action',
        label: '',
        render: (container) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedContainerId(container.id)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Payment detail
          </Button>
        ),
      },
    ],
    [billingDetailByRef, isImport],
  );

  const handleGetPaymentInformation = async (containerId: string) => {
    const container = containers.find((item) => item.id === containerId);
    if (!container) return;
    const existingDetail = billingDetailByRef.get(container.entityRef) ?? null;
    if ((existingDetail?.prepayCharges?.length ?? 0) > 0) return;

    try {
      await billingPaymentsApi.declarePrepay({
        entityType: 'CONTAINER',
        entityRef: container.entityRef,
        forwarderId: container.forwarderId ?? undefined,
        options: {
          containerNumber: container.containerNumber?.trim() || undefined,
          direction: container.direction,
          containerTypeCode: container.containerTypeCode?.trim() || undefined,
        },
      });
      toast.success('Payment information loaded.');
      await Promise.all([
        refreshBillingDetail(container.entityRef),
        refreshOrderDetail(),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get payment information';
      toast.error(message);
    }
  };

  const handleRecordPayment = async (
    containerId: string,
    values: PaymentRecordForm,
  ) => {
    const container = containers.find((item) => item.id === containerId);
    if (!container) return;

    try {
      await billingPaymentsApi.processPrepay('CONTAINER', container.entityRef, {
        actualAmount: values.actualAmount,
        note: values.note?.trim() || undefined,
        receiptNumber: values.receiptNumber?.trim() || undefined,
      });
      toast.success('Payment record saved.');
      await Promise.all([
        refreshBillingDetail(container.entityRef),
        refreshOrderDetail(),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record payment';
      toast.error(message);
    }
  };

  const handleUpdateAllowDestuffing = async (
    containerId: string,
    allowDestuffing: boolean,
  ) => {
    const container = containers.find((item) => item.id === containerId);
    if (!container) return;
    if (container.direction !== 'IMPORT') return;
    const lockedDestuffing = Boolean(container.allowStuffingOrDestuffing);
    const effectiveAllowDestuffing = lockedDestuffing
      ? Boolean(container.allowStuffingOrDestuffing)
      : allowDestuffing;
    if (lockedDestuffing) {
      toast('Destuffing confirmation is already locked.');
      return;
    }
    if (effectiveAllowDestuffing === Boolean(container.allowStuffingOrDestuffing)) {
      return;
    }

    setIsSavingDestuffing(true);
    try {
      await bookingOrderContainersApi.update(container.id, {
        allowStuffingOrDestuffing: effectiveAllowDestuffing,
      });
      toast.success('Destuffing confirmation saved.');
      await Promise.all([
        refreshBillingDetail(container.entityRef),
        refreshOrderDetail(),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save destuffing confirmation';
      toast.error(message);
    } finally {
      setIsSavingDestuffing(false);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/forwarder-prepayments');
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Receipt className="h-4 w-4" />
                {isImport ? 'IMPORT' : 'EXPORT'} ·{' '}
                {orderReference.bookingNumber ?? orderReference.exportPlanCode ?? '—'}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-start md:justify-between">
              <div className="w-full md:flex-1">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={(values) => {
                    setFilterValues(values);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  onClear={() => {
                    setFilterValues({});
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  initialValues={filterValues}
                  className="w-full"
                  buttonLabel="Filters"
                />
              </div>
            </div>

            <EntityTable
              entities={pageContainers}
              loading={bookingOrderQuery.isLoading || exportPlanQuery.isLoading}
              fetching={billingQueries.some((query) => query.isFetching)}
              error={
                (bookingOrderQuery.error instanceof Error
                  ? bookingOrderQuery.error.message
                  : null) ||
                (exportPlanQuery.error instanceof Error
                  ? exportPlanQuery.error.message
                  : null)
              }
              entityName="Container"
              entityNamePlural="Containers"
              getId={(container) => container.id}
              columns={columns}
              actions={[]}
              canCreate={false}
              canBulkEdit={false}
              enablePagination
              enableServerSidePagination
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyStateMessage="No containers found for the selected filters."
              emptyStateIcon={<Receipt className="h-12 w-12 text-gray-400" />}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>

      <ContainerDetailDrawer
        open={Boolean(selectedContainerId)}
        container={selectedContainer}
        paymentDetail={selectedPaymentDetail}
        paymentLoading={selectedPaymentLoading}
        destuffingSaving={isSavingDestuffing}
        onClose={() => setSelectedContainerId(null)}
        onGetPaymentInformation={handleGetPaymentInformation}
        onRecordPayment={handleRecordPayment}
        onUpdateAllowDestuffing={handleUpdateAllowDestuffing}
      />
    </div>
  );
};

export default ForwarderPrepaymentContainersPage;
