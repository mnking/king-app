import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HBLFormModal from './HBLFormModal';
import HBLTable from './HBLTable';
import {
  useHBLs,
  useCreateHBL,
  useUpdateHBL,
  useApproveHBL,
  useMarkHBLDone,
  useDeleteHBL,
  hblQueryKeys,
} from '../hooks/use-hbls-query';
import { useForwarders } from '@/features/forwarder';
import type {
  HouseBill,
  HBLCreateForm,
  HBLUpdateForm,
  HBLsQueryParams,
} from '../types';
import toast from 'react-hot-toast';
import { toastAdapter } from '@/shared/services/toast';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';
import { packingListsApi } from '@/services/apiPackingLists';
import { customsDeclarationsApi } from '@/services/apiCustomsDeclarations';

type ModalMode = 'create' | 'edit' | 'view';

export const HBLManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canWriteHbl = can?.('hbl_management:write') ?? false;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHBL, setSelectedHBL] = useState<HouseBill | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // Pagination state (server-side)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100, // First option in pageSizeOptions
  });

  // Load all active forwarders for filter dropdown and future lookups
  const { data: forwardersResponse } = useForwarders({ status: 'Active' });
  const forwarders = useMemo(
    () => forwardersResponse?.results || [],
    [forwardersResponse],
  );

  const queryParams = useMemo(() => {
    const baseParams: HBLsQueryParams = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      hasPackingList: true,
    };

    // Apply filter values from DynamicFilter
    if (typeof filterValues.receivedAt === 'string') {
      baseParams.receivedAt = filterValues.receivedAt;
    }
    if (typeof filterValues.issuerId === 'string') {
      baseParams.issuerId = filterValues.issuerId;
    }
    if (typeof filterValues.keywords === 'string') {
      baseParams.keywords = filterValues.keywords;
    }
    if (typeof filterValues.status === 'string') {
      baseParams.status = filterValues.status;
    }
    if (typeof filterValues.containerNumber === 'string') {
      baseParams.containerNumber = filterValues.containerNumber;
    }
    if (typeof filterValues.sealNumber === 'string') {
      baseParams.sealNumber = filterValues.sealNumber;
    }
    if (typeof filterValues.sortField === 'string') {
      baseParams.sortField = filterValues.sortField as HBLsQueryParams['sortField'];
    }
    if (typeof filterValues.sortOrder === 'string') {
      baseParams.sortOrder = filterValues.sortOrder as HBLsQueryParams['sortOrder'];
    }

    return baseParams;
  }, [pagination.pageIndex, pagination.pageSize, filterValues]);

  // Fetch HBLs
  const { data: hblsResponse, isLoading, isFetching, error } = useHBLs(queryParams);

  // Mutations
  const createMutation = useCreateHBL();
  const updateMutation = useUpdateHBL();
  const approveMutation = useApproveHBL();
  const markDoneMutation = useMarkHBLDone();
  const deleteMutation = useDeleteHBL();

  const hbls = hblsResponse?.results || [];
  const totalCount = hblsResponse?.total ?? 0;
  const loadingState = isLoading; // Only show spinner on initial load

  // Handlers
  const handleCreateNew = () => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    setSelectedHBL(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleImportExcel = () => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to import HBLs.');
      return;
    }
    navigate('/hbl-management/import');
  };

  const handleManageCustomsDeclarations = (hbl: HouseBill) => {
    navigate(`/hbl-management/${hbl.id}/customs-declarations`);
  };

  const handleView = (hbl: HouseBill) => {
    setSelectedHBL(hbl);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (hbl: HouseBill) => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    if (hbl.status === 'approved' || hbl.status === 'done') {
      toast.error('Cannot edit approved or completed HBL');
      return;
    }
    setSelectedHBL(hbl);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSave = async (
    data: HBLCreateForm | (HBLUpdateForm & { id: string }),
  ) => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    try {
      if ('id' in data) {
        // Update
        const { id, ...updates } = data;
        await updateMutation.mutateAsync({ id, data: updates });
        toast.success('HBL updated successfully');
      } else {
        // Create
        await createMutation.mutateAsync(data);
        toast.success('HBL created successfully');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save HBL');
      throw error;
    }
  };

  const handleApprove = async (id: string) => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    const targetHbl =
      (selectedHBL && selectedHBL.id === id ? selectedHBL : null) ||
      hbls.find((item) => item.id === id) ||
      null;
    const packingListId =
      targetHbl?.packingList?.id ?? targetHbl?.packingListId ?? null;
    const packingListStatus =
      targetHbl?.packingList?.status ?? targetHbl?.packingListStatus ?? null;
    const isPackingListApproved =
      typeof packingListStatus === 'string' &&
      packingListStatus.toLowerCase() === 'approved';

    if (!packingListId) {
      toast.error('Packing List not found for this HBL.');
      return;
    }

    if (!isPackingListApproved) {
      try {
        await packingListsApi.approve(packingListId);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to approve Packing List');
        return;
      }
    }

    try {
      await approveMutation.mutateAsync(id);
      toast.success('HBL approved successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve HBL');
      throw error;
    }
  };

  const handleMarkDone = async (hbl: HouseBill) => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    if (hbl.status !== 'approved') {
      toast.error('Only approved HBLs can be marked as done');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      `Mark HBL "${hbl.code}" as done?`,
      { intent: 'primary' }
    );
    if (!confirmed) {
      return;
    }

    try {
      await markDoneMutation.mutateAsync({ id: hbl.id, marked: true });
      toast.success('HBL marked as done');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to mark HBL as done');
    }
  };

  const handleDelete = async (hbl: HouseBill) => {
    if (!canWriteHbl) {
      toast.error('You do not have permission to modify HBLs.');
      return;
    }
    if (hbl.status === 'approved' || hbl.status === 'done') {
      toast.error('Cannot delete approved or completed HBL');
      return;
    }

    try {
      const customsDeclarations = await customsDeclarationsApi.getAll({
        page: 1,
        itemsPerPage: 1,
        hblId: hbl.id,
      });
      const customsDeclarationsTotal = customsDeclarations.data.total ?? 0;
      if (customsDeclarationsTotal > 0) {
        toast.error(
          'Cannot delete HBL with existing Customs Declarations. Please delete all Customs Declarations first.',
        );
        return;
      }
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Failed to check Customs Declarations before deleting HBL',
      );
      return;
    }

    const packingListId = hbl.packingList?.id ?? hbl.packingListId ?? null;
    const packingListStatus =
      hbl.packingList?.status ?? hbl.packingListStatus ?? null;
    const isPackingListApproved =
      typeof packingListStatus === 'string' &&
      packingListStatus.toLowerCase() === 'approved';

    if (isPackingListApproved) {
      toast.error('Cannot delete approved Packing List.');
      return;
    }
    if (!packingListId) {
      toast.error('Packing List not found for this HBL.');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      `Are you sure you want to delete HBL "${hbl.code}"?`,
      { intent: 'danger' }
    );
    if (!confirmed) {
      return;
    }

    try {
      await packingListsApi.delete(packingListId);
      await deleteMutation.mutateAsync(hbl.id);
      toast.success('HBL deleted successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete HBL');
    }
  };

  // Handle filter apply from DynamicFilter
  const handleApplyFilter = (values: FilterValues) => {
    const normalizedValues = Object.entries(values).reduce<FilterValues>(
      (acc, [key, rawValue]) => {
        if (key === 'receivedAt' && typeof rawValue === 'string') {
          const parsedDate = new Date(rawValue);
          if (!Number.isNaN(parsedDate.getTime())) {
            acc[key] = parsedDate.toISOString().split('T')[0];
          }
          return acc;
        }

        acc[key] = rawValue;
        return acc;
      },
      {},
    );

    setFilterValues(normalizedValues);
    // Reset to first page when applying filters
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    void queryClient.invalidateQueries({
      queryKey: hblQueryKeys.lists(),
      refetchType: 'active',
    });
  };

  // Handle filter clear
  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const filterFields = useMemo(
    () => [
      {
        type: 'date' as const,
        name: 'receivedAt',
        label: 'Receive date',
      },
      {
        type: 'select' as const,
        name: 'issuerId',
        label: 'Forwarder',
        options: forwarders,
        keyField: 'id',
        valueField: 'name',
        placeholder: 'Select forwarder...',
      },
      {
        type: 'text' as const,
        name: 'keywords',
        label: 'Keywords',
        placeholder: 'Search keywords... (Shipper, Consignee, etc.)',
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status',
        options: [
          { value: 'Draft', label: 'Draft' },
          { value: 'Approved', label: 'Approved' },
        ],
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Select status...',
      },
      {
        type: 'text' as const,
        name: 'containerNumber',
        label: 'Container Number',
        placeholder: 'e.g., MSCU6639871',
      },
      {
        type: 'text' as const,
        name: 'sealNumber',
        label: 'Seal Number',
        placeholder: 'e.g., SEAL001234',
      },
      {
        type: 'select' as const,
        name: 'sortField',
        label: 'Sort Field',
        options: [
          { value: 'code', label: 'HBL No' },
          { value: 'receivedAt', label: 'Received Date' },
          { value: 'shipper', label: 'Shipper' },
          { value: 'consignee', label: 'Consignee' },
          { value: 'notifyParty', label: 'Notify Party' },
          { value: 'vesselName', label: 'Vessel Name' },
          { value: 'voyageNumber', label: 'Voyage Number' },
          { value: 'pol', label: 'Port of Loading' },
          { value: 'pod', label: 'Port of Discharge' },
        ],
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Select sort field...',
      },
      {
        type: 'select' as const,
        name: 'sortOrder',
        label: 'Sort Order',
        options: [
          { value: 'ASC', label: 'Ascending' },
          { value: 'DESC', label: 'Descending' },
        ],
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Select sort order...',
      },
    ],
    [forwarders],
  );

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {/* Toolbar: Filter + Create Button */}
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-start md:justify-between">
              <div className="w-full md:flex-1">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  className="w-full"
                  buttonLabel="Filters"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start">
                <Button
                  onClick={handleImportExcel}
                  variant="outline"
                  className="inline-flex items-center gap-2 whitespace-nowrap"
                  disabled={!canWriteHbl}
                >
                  <Upload className="h-5 w-5" />
                  Import Excel
                </Button>
              </div>
            </div>

            <HBLTable
              hbls={hbls}
              loading={loadingState}
              fetching={isFetching}
              error={error ? (error as Error).message : null}
              onHBLView={handleView}
              onHBLEdit={handleEdit}
              onHBLDelete={handleDelete}
              onHBLMarkDone={handleMarkDone}
              onHBLManageCustomsDeclarations={handleManageCustomsDeclarations}
              onCreateHBL={handleCreateNew}
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              className="flex-1"
              canCreate={false}
              canWrite={canWriteHbl}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      <HBLFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        hbl={selectedHBL}
        onSave={handleSave}
        onApprove={handleApprove}
        canWrite={canWriteHbl}
      />
    </div>
  );
};

export default HBLManagement;
