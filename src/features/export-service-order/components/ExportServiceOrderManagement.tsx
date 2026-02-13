import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { toastAdapter } from '@/shared/services/toast';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import Button from '@/shared/components/ui/Button';
import { useForwarders } from '@/features/forwarder/hooks';
import type { Forwarder } from '@/features/forwarder/types';
import ExportServiceOrderTable from './ExportServiceOrderTable';
import ExportServiceOrderFormModal from './ExportServiceOrderFormModal';
import {
  useDeleteExportServiceOrder,
  useExportServiceOrders,
  exportServiceOrderQueryKeys,
} from '../hooks';
import type { ExportServiceOrder, ExportServiceOrderModalMode } from '../types';
import { exportPlansApi } from '@/services/apiExportPlans';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
];

export const ExportServiceOrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ExportServiceOrderModalMode>('create');
  const [selectedOrder, setSelectedOrder] = useState<ExportServiceOrder | null>(null);
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);

  const { data: forwardersResponse, isLoading: forwardersLoading } = useForwarders(
    {
      status: 'Active',
      contractStatus: 'ACTIVE',
      itemsPerPage: 1000,
    },
    { enabled: true },
  );

  const forwarders = useMemo<Forwarder[]>(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse?.results],
  );

  const forwarderMap = useMemo(() => {
    const map = new Map<string, Forwarder>();
    forwarders.forEach((forwarder) => map.set(forwarder.id, forwarder));
    return map;
  }, [forwarders]);

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'orderNumber',
        label: 'Order Number',
        placeholder: 'Search order number...',
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status',
        options: STATUS_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
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
        type: 'date' as const,
        name: 'requestDate',
        label: 'Request Date',
      },
    ],
    [forwarders],
  );

  const queryParams = useMemo(() => {
    const requestDateValue =
      typeof filterValues.requestDate === 'string'
        ? filterValues.requestDate
        : '';

    const requestDate = requestDateValue
      ? requestDateValue.split('T')[0]
      : undefined;

    return {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      orderNumber:
        typeof filterValues.orderNumber === 'string'
          ? filterValues.orderNumber
          : undefined,
      status:
        typeof filterValues.status === 'string' &&
        (filterValues.status === 'DRAFT' || filterValues.status === 'APPROVED')
          ? filterValues.status
          : 'not_done',
      forwarderId:
        typeof filterValues.forwarderId === 'string'
          ? filterValues.forwarderId
          : undefined,
      requestDate,
    };
  }, [filterValues, pagination.pageIndex, pagination.pageSize]);

  const {
    data: ordersResponse,
    isLoading,
    isFetching,
    error,
  } = useExportServiceOrders(queryParams);

  const deleteMutation = useDeleteExportServiceOrder();

  const orders = ordersResponse?.results ?? [];
  const totalCount = ordersResponse?.total ?? 0;

  const resolveForwarderName = (order: ExportServiceOrder) => {
    if (order.forwarderId) {
      const forwarder = forwarderMap.get(order.forwarderId);
      if (forwarder) return forwarder.name;
    }
    return order.forwarderCode ?? '-';
  };

  const openModal = (mode: ExportServiceOrderModalMode, orderItem: ExportServiceOrder | null) => {
    setModalMode(mode);
    setSelectedOrder(orderItem);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    openModal('create', null);
  };

  const handleView = (orderItem: ExportServiceOrder) => {
    openModal('view', orderItem);
  };

  const handleEdit = (orderItem: ExportServiceOrder) => {
    openModal('edit', orderItem);
  };

  const handleDelete = async (orderItem: ExportServiceOrder) => {
    if (orderItem.status !== 'DRAFT') {
      toast.error('Only draft orders can be deleted.');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      'Delete draft order? This action cannot be undone.',
      { intent: 'danger' },
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(orderItem.id);
    } catch {
      // Toast handled by hook.
    }
  };

  const handleCreateStuffingPlan = async (orderItem: ExportServiceOrder) => {
    if (creatingPlanId) return;
    if (orderItem.status !== 'APPROVED') {
      toast.error('Only approved orders can create stuffing plans.');
      return;
    }
    if (orderItem.planId) {
      navigate(`/stuffing-planning?planId=${orderItem.planId}`);
      return;
    }

    setCreatingPlanId(orderItem.id);

    try {
      const plan = await exportPlansApi.create({ exportOrderId: orderItem.id });

      await queryClient.invalidateQueries({ queryKey: ['exportPlans'] });
      await queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });

      toast.success('Stuffing plan created.');
      navigate(`/stuffing-planning?planId=${plan.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create stuffing plan';
      if (message.toLowerCase().includes('plan already exists') || message.includes('409')) {
        toast.error('Stuffing plan already exists for this order.');
      } else {
        toast.error(message);
      }
    } finally {
      setCreatingPlanId(null);
    }
  };

  const handleViewStuffingPlan = (orderItem: ExportServiceOrder) => {
    if (!orderItem.planId) return;
    navigate(`/stuffing-planning?planId=${orderItem.planId}`);
  };

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    void queryClient.invalidateQueries({
      queryKey: exportServiceOrderQueryKeys.lists(),
      refetchType: 'active',
    });
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  initialValues={filterValues}
                  buttonLabel="Filters"
                  className="flex-1"
                />
                <Button
                  onClick={handleCreate}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-5 w-5" />
                  Create Order
                </Button>
              </div>
            </div>

            <ExportServiceOrderTable
              orders={orders}
              loading={isLoading}
              fetching={isFetching}
              error={error ? (error as Error).message : null}
              onOrderView={handleView}
              onOrderEdit={handleEdit}
              onOrderDelete={handleDelete}
              onCreateStuffingPlan={handleCreateStuffingPlan}
              onViewStuffingPlan={handleViewStuffingPlan}
              creatingPlanId={creatingPlanId}
              className="flex-1"
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              resolveForwarderName={resolveForwarderName}
            />
          </div>
        </div>
      </div>

      <ExportServiceOrderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        order={selectedOrder}
        forwarders={forwarders}
        forwardersLoading={forwardersLoading}
      />
    </div>
  );
};

export default ExportServiceOrderManagement;
