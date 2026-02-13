import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  usePackingLists,
  useDeletePackingList,
} from '../hooks';
import type {
  CargoType,
  PackingListListItem,
  PackingListModalMode,
  PackingListSearchFilters,
  PackingListStatus,
  ShippingDirectionFlow,
} from '../types';
import { packingListQueryKeys } from '../hooks/use-packing-lists';
import PackingListTable from './PackingListTable';
import PackingListFormModal from './PackingListFormModal';
import Button from '@/shared/components/ui/Button';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { toastAdapter } from '@/shared/services/toast';
import { useForwarders } from '@/features/forwarder/hooks';
import { useAuth } from '@/features/auth/useAuth';
import UpdateDocumentStatusModal from './UpdateDocumentStatusModal';
import { ExportCustomsDeclarationModal } from '@/features/customs-declaration';

const STATUS_FILTER_OPTIONS: { value: PackingListStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' }, // TODO(i18n)
  { value: 'PARTIAL', label: 'Partial' }, // TODO(i18n)
  { value: 'APPROVED', label: 'Approved' }, // TODO(i18n)
  { value: 'DONE', label: 'Done' }, // TODO(i18n)
];

const CARGO_TYPE_FILTER_OPTIONS: { value: CargoType; label: string }[] = [
  { value: 'GENERAL', label: 'General' }, // TODO(i18n)
  { value: 'DANGEROUS', label: 'Dangerous' }, // TODO(i18n)
  { value: 'REFRIGERATED', label: 'Refrigerated' }, // TODO(i18n)
  { value: 'OVERSIZED', label: 'Oversized' }, // TODO(i18n)
  { value: 'LIQUID', label: 'Liquid' }, // TODO(i18n)
  { value: 'BULK', label: 'Bulk' }, // TODO(i18n)
];

const DIRECTION_FLOW_FILTER_OPTIONS: Array<{
  value: ShippingDirectionFlow;
  label: string;
}> = [
  { value: 'IMPORT', label: 'Import' }, // TODO(i18n)
  { value: 'EXPORT', label: 'Export' }, // TODO(i18n)
];

export const PackingListManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWritePackingLists = can?.('packing_list_management:write') ?? false;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PackingListModalMode>('create');
  const [selectedPackingList, setSelectedPackingList] =
    useState<PackingListListItem | null>(null);
  const [isUpdateDocumentStatusOpen, setIsUpdateDocumentStatusOpen] =
    useState(false);
  const [documentStatusPackingList, setDocumentStatusPackingList] =
    useState<PackingListListItem | null>(null);
  const [isCustomsDeclarationOpen, setIsCustomsDeclarationOpen] =
    useState(false);
  const [customsDeclarationPackingList, setCustomsDeclarationPackingList] =
    useState<PackingListListItem | null>(null);

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
          ? (filterValues.status as PackingListStatus)
          : undefined,
      cargoType:
        typeof filterValues.cargoType === 'string' && filterValues.cargoType
          ? (filterValues.cargoType as CargoType)
          : undefined,
      directionFlow:
        typeof filterValues.directionFlow === 'string' &&
        filterValues.directionFlow
          ? (filterValues.directionFlow as ShippingDirectionFlow)
          : undefined,
      containerNumber:
        typeof filterValues.containerNumber === 'string' &&
        filterValues.containerNumber.trim()
          ? filterValues.containerNumber.trim()
          : undefined,
      hblId:
        typeof filterValues.hblId === 'string' && filterValues.hblId.trim()
          ? filterValues.hblId.trim()
          : undefined,
      eta:
        typeof filterValues.eta === 'string' && filterValues.eta.trim()
          ? filterValues.eta.trim()
          : undefined,
      orderBy:
        typeof filterValues.orderBy === 'string' && filterValues.orderBy
          ? (filterValues.orderBy as PackingListSearchFilters['orderBy'])
          : undefined,
      orderDir:
        typeof filterValues.orderDir === 'string' && filterValues.orderDir
          ? (filterValues.orderDir as PackingListSearchFilters['orderDir'])
          : undefined,
    }),
    [
      filterValues.cargoType,
      filterValues.containerNumber,
      filterValues.directionFlow,
      filterValues.forwarderId,
      filterValues.hblId,
      filterValues.eta,
      filterValues.orderBy,
      filterValues.orderDir,
      filterValues.search,
      filterValues.status,
      pagination,
    ],
  );

  const {
    data: packingListResponse,
    isLoading,
    isFetching,
    error,
  } = usePackingLists(queryParams);

  const deleteMutation = useDeletePackingList();
  const { data: forwardersResponse, isLoading: forwardersLoading } = useForwarders(
    { itemsPerPage: 100 },
    { enabled: true },
  );
  const packingLists = useMemo(
    () =>
      (packingListResponse?.results ?? []).filter(
        (item) => item.status !== 'DONE',
      ),
    [packingListResponse?.results],
  );

  const totalCount = packingListResponse?.total ?? 0;

  const openModal = (
    mode: PackingListModalMode,
    packingList: PackingListListItem | null,
  ) => {
    setModalMode(mode);
    setSelectedPackingList(packingList);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPackingList(null);
  };

  const handleCreate = () => {
    if (!canWritePackingLists) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    openModal('create', null);
  };

  const handleView = (packingList: PackingListListItem) => {
    openModal('view', packingList);
  };

  const handleEdit = (packingList: PackingListListItem) => {
    if (!canWritePackingLists) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    openModal('edit', packingList);
  };

  const handleDelete = async (packingList: PackingListListItem) => {
    if (!canWritePackingLists) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    const confirmed = await toastAdapter.confirm(
      'Delete packing list? This action cannot be undone.',
      { intent: 'danger' },
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(packingList.id);
      if (selectedPackingList?.id === packingList.id) {
        handleCloseModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('in use') || message.includes('reference')) {
        toastAdapter.warning(
          'cannot delete! packing list is already in use in the system',
        );
      } else {
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : 'Failed to delete packing list',
        );
      }
    }
  };

  const handleCloseUpdateDocumentStatus = () => {
    setIsUpdateDocumentStatusOpen(false);
    setDocumentStatusPackingList(null);
  };

  const handleOpenCustomsDeclaration = (packingList: PackingListListItem) => {
    setCustomsDeclarationPackingList(packingList);
    setIsCustomsDeclarationOpen(true);
  };

  const handleCloseCustomsDeclaration = () => {
    setIsCustomsDeclarationOpen(false);
    setCustomsDeclarationPackingList(null);
  };

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues({
      search: values.search,
      forwarderId: values.forwarderId,
      status: values.status,
      cargoType: values.cargoType,
      directionFlow: values.directionFlow,
      containerNumber: values.containerNumber,
      hblId: values.hblId,
      eta: values.eta,
      orderBy: values.orderBy,
      orderDir: values.orderDir,
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    queryClient.invalidateQueries({ queryKey: packingListQueryKeys.all });
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    queryClient.invalidateQueries({ queryKey: packingListQueryKeys.all });
  };

  const forwarders = useMemo(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse?.results],
  );
  const forwarderNameById = useMemo(
    () =>
      forwarders.reduce<Record<string, string>>((acc, forwarder) => {
        acc[forwarder.id] = forwarder.name;
        return acc;
      }, {}),
    [forwarders],
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
        label: 'Forwarder', // TODO(i18n)
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
        type: 'select' as const,
        name: 'cargoType',
        label: 'Cargo Type', // TODO(i18n)
        options: CARGO_TYPE_FILTER_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'Select cargo type', // TODO(i18n)
      },
      {
        type: 'select' as const,
        name: 'directionFlow',
        label: 'Direction Flow', // TODO(i18n)
        options: DIRECTION_FLOW_FILTER_OPTIONS,
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'Select direction flow', // TODO(i18n)
      },
      {
        type: 'text' as const,
        name: 'containerNumber',
        label: 'Container Number', // TODO(i18n)
        placeholder: 'Search container number...', // TODO(i18n)
      },
      // {
      //   type: 'text' as const,
      //   name: 'hblId',
      //   label: 'HBL ID', // TODO(i18n)
      //   placeholder: 'Enter HBL ID...', // TODO(i18n)
      // },
      {
        type: 'date' as const,
        name: 'eta',
        label: 'ETA', // TODO(i18n)
      },
      {
        type: 'select' as const,
        name: 'orderBy',
        label: 'Sort By', // TODO(i18n)
        options: [
          { value: 'updatedAt', label: 'Last Updated' }, // TODO(i18n)
          { value: 'createdAt', label: 'Created' }, // TODO(i18n)
          { value: 'packingListNumber', label: 'Cargo list #' }, // TODO(i18n)
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
                  buttonLabel="Filters" // TODO(i18n)
                  className="flex-1"
                  initialValues={filterValues}
                />
                <Button
                  onClick={handleCreate}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-all duration-150 hover:scale-105 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={!canWritePackingLists}
                >
                  <Plus className="h-5 w-5" />
                  Create Cargo list
                </Button>
              </div>
            </div>

            <PackingListTable
              packingLists={packingLists}
              loading={isLoading}
              fetching={isFetching}
              error={error instanceof Error ? error.message : null}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCustomsDeclaration={handleOpenCustomsDeclaration}
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              canWrite={canWritePackingLists}
              forwarderNameById={forwarderNameById}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <PackingListFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        packingList={selectedPackingList}
        onClose={handleCloseModal}
        forwarders={forwarders}
        forwardersLoading={forwardersLoading}
        canWrite={canWritePackingLists}
      />
      <UpdateDocumentStatusModal
        open={isUpdateDocumentStatusOpen}
        packingList={documentStatusPackingList}
        onClose={handleCloseUpdateDocumentStatus}
      />
      <ExportCustomsDeclarationModal
        open={isCustomsDeclarationOpen}
        packingList={customsDeclarationPackingList}
        customsDeclarationId={customsDeclarationPackingList?.customsDeclarationId}
        canWrite={canWritePackingLists}
        onClose={handleCloseCustomsDeclaration}
      />
    </div>
  );
};

export default PackingListManagement;
