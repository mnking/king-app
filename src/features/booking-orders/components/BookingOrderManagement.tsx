import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import BookingOrderFormModal from './BookingOrderFormModal';
import BookingOrderTable from './BookingOrderTable';
import {
  useBookingOrders,
  useBookingOrder,
  useCreateBookingOrder,
  useUpdateBookingOrder,
  useDeleteBookingOrder,
  useApproveBookingOrder,
  useAgents,
  useForwarders,
  bookingOrderQueryKeys,
} from '../hooks';
import type { BookingOrder, BookingOrderCreateForm } from '../types';
import toast from 'react-hot-toast';
import { toastAdapter } from '@/shared/services/toast';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

type ModalMode = 'create' | 'edit' | 'view';

export const BookingOrderManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWriteOrders = can?.('destuff_order_management:write') ?? false;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderSnapshot, setSelectedOrderSnapshot] = useState<BookingOrder | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // Load agents and forwarders for filter datasources and form modal
  // Cached for 10 minutes to reduce redundant API calls
  const { data: agentsResponse } = useAgents();
  const { data: forwardersResponse, isLoading: forwardersLoading } = useForwarders();

  const agents = useMemo(() => agentsResponse?.results || [], [agentsResponse]);
  const forwarders = useMemo(() => forwardersResponse?.results || [], [forwardersResponse]);

  // Map filter values to API query parameters
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
    };

    if (typeof filterValues.search === 'string') {
      params.search = filterValues.search;
    }
    if (typeof filterValues.status === 'string') {
      params.status = filterValues.status;
    }
    if (typeof filterValues.agentId === 'string') {
      params.agentId = filterValues.agentId;
    }
    if (typeof filterValues.orderBy === 'string') {
      params.orderBy = filterValues.orderBy;
    }
    if (typeof filterValues.orderDir === 'string') {
      params.orderDir = filterValues.orderDir;
    }

    return params;
  }, [pagination.pageIndex, pagination.pageSize, filterValues]);

  // Fetch booking orders with server-side filtering (no staleTime for fresh data)
  const {
    data: ordersResponse,
    isLoading,
    isFetching,
    error,
  } = useBookingOrders(queryParams);

  // Mutations
  const createMutation = useCreateBookingOrder();
  const updateMutation = useUpdateBookingOrder();
  const deleteMutation = useDeleteBookingOrder();
  const approveMutation = useApproveBookingOrder();

  const orders = ordersResponse?.results || [];
  const totalCount = ordersResponse?.total ?? 0;
  const loading = isLoading; // Only show spinner on initial load, not on pagination changes
  const shouldLoadSelectedOrder =
    isModalOpen &&
    modalMode !== 'create' &&
    Boolean(selectedOrderId);
  const { data: selectedOrderDetail } = useBookingOrder(selectedOrderId ?? '', {
    enabled: shouldLoadSelectedOrder,
    initialData: selectedOrderSnapshot ?? undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const selectedOrder = selectedOrderDetail ?? selectedOrderSnapshot;

  const ensureWriteAccess = () => {
    if (canWriteOrders) {
      return true;
    }
    toast.error('You do not have permission to modify booking orders.');
    return false;
  };

  // Handlers
  const handleCreateNew = () => {
    if (!ensureWriteAccess()) return;
    setSelectedOrderId(null);
    setSelectedOrderSnapshot(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleView = (order: BookingOrder) => {
    setSelectedOrderId(order.id);
    setSelectedOrderSnapshot(order);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (order: BookingOrder) => {
    if (!ensureWriteAccess()) return;
    if (order.status === 'APPROVED') {
      toast.error('Cannot edit approved booking order');
      return;
    }
    setSelectedOrderId(order.id);
    setSelectedOrderSnapshot(order);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderSnapshot(null);
  };

  const handleSave = async (
    data: BookingOrderCreateForm | (Partial<BookingOrderCreateForm> & { id: string }),
  ) => {
    if (!ensureWriteAccess()) return;
    if ('id' in data) {
      // Update
      const { id, ...updates } = data;
      await updateMutation.mutateAsync({ id, data: updates });
    } else {
      // Create
      await createMutation.mutateAsync(data);
    }
    // Toast notifications are handled by mutation hooks
  };

  const handleApprove = async (order: BookingOrder): Promise<boolean> => {
    if (!ensureWriteAccess()) return false;
    if (order.status === 'APPROVED') {
      toast.error('Order is already approved');
      return false;
    }

    const confirmed = await toastAdapter.confirm(
      `Approve booking order? This will generate an order code and lock the order.`,
      { intent: 'warning' }
    );
    if (!confirmed) {
      return false;
    }

    try {
      await approveMutation.mutateAsync(order.id);
      return true;
    } catch {
      // Error toast already shown by mutation hook
      return false;
    }
  };

  const handleDelete = async (order: BookingOrder) => {
    if (!ensureWriteAccess()) return;
    if (order.status === 'APPROVED') {
      toast.error('Cannot delete approved booking order');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      `Delete booking order? This cannot be undone.`,
      { intent: 'danger' }
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(order.id);
    } catch {
      // Error toast already shown by mutation hook
    }
  };

  // Handle filter application
  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    void queryClient.invalidateQueries({
      queryKey: bookingOrderQueryKeys.lists(),
      refetchType: 'active',
    });
  };

  // Handle filter clear
  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Define DynamicFilter fields
  const filterFields = useMemo(() => [
    {
      type: 'text' as const,
      name: 'search',
      label: 'Search', // TODO(i18n)
      placeholder: 'Search by code, voyage, or vessel name...', // TODO(i18n)
    },
    {
      type: 'select' as const,
      name: 'status',
      label: 'Status', // TODO(i18n)
      options: [
        { value: 'all', label: 'All' }, // TODO(i18n)
        { value: 'DRAFT', label: 'Draft' }, // TODO(i18n)
        { value: 'SUBMITTED', label: 'Submitted' }, // TODO(i18n)
        { value: 'APPROVED', label: 'Approved' }, // TODO(i18n)
      ],
      keyField: 'value' as const,
      valueField: 'label' as const,
    },
    {
      type: 'select' as const,
      name: 'agentId',
      label: 'Agent', // TODO(i18n)
      options: agents,
      keyField: 'id' as const,
      valueField: 'name' as const,
    },
    {
      type: 'select' as const,
      name: 'orderBy',
      label: 'Sort By', // TODO(i18n)
      options: [
        { value: 'enteredAt', label: 'Entered At' }, // TODO(i18n)
        { value: 'createdAt', label: 'Created At' }, // TODO(i18n)
        { value: 'eta', label: 'ETA' }, // TODO(i18n)
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
  ], [agents]);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {/* Toolbar: Filter + Create Button */}
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  buttonLabel="Filters" // TODO(i18n)
                  className="flex-1"
                />
                <Button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition-all duration-150 hover:scale-105 whitespace-nowrap"
                  disabled={!canWriteOrders}
                >
                  <Plus className="h-5 w-5" />
                  Add Booking Order
                </Button>
              </div>
            </div>

            <BookingOrderTable
              orders={orders}
              loading={loading}
              fetching={isFetching}
              error={error ? (error as Error).message : null}
              onOrderView={handleView}
              onOrderEdit={handleEdit}
              onOrderDelete={handleDelete}
              onCreateOrder={handleCreateNew}
              className="flex-1"
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              canCreate={canWriteOrders}
              canWrite={canWriteOrders}
            />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <BookingOrderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        order={modalMode === 'create' ? null : selectedOrder}
        onSave={handleSave}
        onApprove={handleApprove}
        canApprove={canWriteOrders}
        forwarders={forwarders}
        forwardersLoading={forwardersLoading}
      />
    </div>
  );
};

export default BookingOrderManagement;
