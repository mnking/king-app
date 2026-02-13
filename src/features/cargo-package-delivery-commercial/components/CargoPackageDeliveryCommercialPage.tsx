import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useHBL, useHBLs } from '@/features/hbl-management/hooks/use-hbls-query';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import type { Forwarder } from '@/features/forwarder/types';
import type { HouseBill, HBLsQueryParams } from '@/features/hbl-management/types';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { forwardersApi, hblsApi } from '@/services/apiForwarder';
import { defaultStatus } from '../constants';
import type { CommercialStatus, CommercialStatusMap } from '../types';
import { useForwarderLookup } from '../hooks/useForwarderLookup';
import { CommercialStatusModal } from './CommercialStatusModal';
import { ForwarderFilterNote } from './ForwarderFilterNote';
import StatusPill from './StatusPill';
import EntityTable, {
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/shared/components/ui/Button';
import { usePackingListLines } from '@/features/packing-list/hooks/use-packing-list-lines';

const DEFAULT_WORKING_STATUS = ['INITIALIZED', 'PAID'];

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';
  const normalizedValue = value.trim();
  const datePrefixMatch = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePrefixMatch) return datePrefixMatch[1];

  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) {
    return normalizedValue.slice(0, 10);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDateValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CargoPackageDeliveryCommercialPage: React.FC = () => {
  const { can } = useAuth();
  const canWritePayment = can?.('payment:write') ?? false;
  const [selectedHblId, setSelectedHblId] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [commercialStatuses, setCommercialStatuses] = useState<CommercialStatusMap>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPaid, setModalPaid] = useState(false);
  const [modalDeliveryAllowed, setModalDeliveryAllowed] = useState(false);
  const [modalDeliveryDate, setModalDeliveryDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackForwarders, setFallbackForwarders] = useState<Record<string, Forwarder>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const { data: forwardersResponse, isLoading: forwardersLoading } = useForwarders({
    status: 'Active',
    page: 1,
    itemsPerPage: 1000,
  });
  const forwarders = useMemo(
    () => forwardersResponse?.results ?? [],
    [forwardersResponse],
  );
  const forwarderList = useMemo(
    () => [...forwarders, ...Object.values(fallbackForwarders)],
    [forwarders, fallbackForwarders],
  );
  const { getForwarderDisplay } = useForwarderLookup(forwarderList);

  const queryParams = useMemo(() => {
    const params: HBLsQueryParams = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      hasPackingList: true,
      workingStatus: DEFAULT_WORKING_STATUS,
    };

    if (typeof filterValues.keywords === 'string') {
      params.keywords = filterValues.keywords;
    }
    if (typeof filterValues.issuerId === 'string') {
      params.issuerId = filterValues.issuerId;
    }
    if (typeof filterValues.status === 'string') {
      params.status = filterValues.status;
    }
    if (typeof filterValues.containerNumber === 'string') {
      params.containerNumber = filterValues.containerNumber;
    }
    if (typeof filterValues.sealNumber === 'string') {
      params.sealNumber = filterValues.sealNumber;
    }
    if (typeof filterValues.receivedAt === 'string') {
      params.receivedAt = filterValues.receivedAt;
    }
    if (typeof filterValues.sortField === 'string') {
      params.sortField = filterValues.sortField;
    }
    if (typeof filterValues.sortOrder === 'string') {
      params.sortOrder = filterValues.sortOrder;
    }

    return params;
  }, [filterValues, pagination]);

  const {
    data: hblsResponse,
    isLoading,
    isFetching,
    error,
    refetch: refetchHbls,
  } = useHBLs(queryParams, {
    gcTime: 0,
    staleTime: 0,
    keepPreviousData: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const hbls = useMemo(() => hblsResponse?.results ?? [], [hblsResponse]);
  const totalCount = hblsResponse?.total ?? 0;
  const errorMessage = error instanceof Error ? error.message : null;
  const { data: selectedHblDetail } = useHBL(selectedHblId ?? '');

  useEffect(() => {
    if (!hbls.length) return;
    const knownIds = new Set(forwarderList.map((f) => f.id));
    const missingIds = Array.from(
      new Set(hbls.map((h) => h.issuerId).filter((id) => !knownIds.has(id))),
    ).slice(0, 20); // soft cap to avoid flooding

    if (!missingIds.length) return;

    missingIds.forEach((id) => {
      void forwardersApi
        .getById(id)
        .then((resp) => {
          if (resp?.data) {
            setFallbackForwarders((prev) => ({ ...prev, [id]: resp.data }));
          }
        })
        .catch((err: any) => {
          console.debug('Forwarder lookup fallback failed', id, err?.message);
        });
    });
  }, [hbls, forwarderList]);

  useEffect(() => {
    if (selectedHblId && !hbls.some((hbl) => hbl.id === selectedHblId)) {
      setSelectedHblId(null);
    }
  }, [hbls, selectedHblId]);

  useEffect(() => {
    if (!selectedHblId) {
      setIsModalOpen(false);
    }
  }, [selectedHblId]);

  const selectedHbl = hbls.find((hbl) => hbl.id === selectedHblId);
  const modalHbl = selectedHblDetail ?? selectedHbl;
  const modalPackingListId = modalHbl?.packingList?.id ?? modalHbl?.packingListId ?? '';
  const {
    data: modalPackingListLinesData,
    isLoading: isLoadingModalPackingListLines,
    error: modalPackingListLinesError,
  } = usePackingListLines(modalPackingListId, 1, 1000, {
    enabled: isModalOpen && !!modalPackingListId,
  });
  const modalPackingListLines = useMemo(
    () => modalPackingListLinesData?.results ?? [],
    [modalPackingListLinesData],
  );
  const modalPackingListLinesErrorMessage = useMemo(
    () =>
      modalPackingListLinesError instanceof Error
        ? modalPackingListLinesError.message
        : null,
    [modalPackingListLinesError],
  );
  const getStatusForHbl = useCallback(
    (hbl: HouseBill): CommercialStatus => {
      const override = commercialStatuses[hbl.id];
      if (override) return override;
      return {
        paid: !!hbl.isPaid,
        deliveryAllowed: !!hbl.deliveryAllowed,
        deliveryDate: hbl.deliveryDate ?? null,
      };
    },
    [commercialStatuses],
  );

  const selectedStatus = modalHbl ? getStatusForHbl(modalHbl) : defaultStatus;
  const selectedDeliveryDate = toDateInputValue(selectedStatus.deliveryDate);

  useEffect(() => {
    setModalPaid(selectedStatus.paid);
    setModalDeliveryAllowed(selectedStatus.deliveryAllowed);
    setModalDeliveryDate(selectedDeliveryDate || getTodayDateValue());
  }, [
    selectedHblId,
    selectedStatus.paid,
    selectedStatus.deliveryAllowed,
    selectedDeliveryDate,
  ]);

  const lockedPaid = selectedStatus.paid;
  const lockedDelivery = selectedStatus.deliveryAllowed;
  const saveDisabled =
    lockedPaid &&
    lockedDelivery &&
    modalDeliveryDate.trim() === selectedDeliveryDate;

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setTimeout(() => {
      void refetchHbls();
    }, 0);
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setTimeout(() => {
      void refetchHbls();
    }, 0);
  };

  const handleOpenModal = useCallback((hbl: HouseBill) => {
    setSelectedHblId(hbl.id);
    setIsModalOpen(true);
  }, []);

  const handleSaveCommercialStatus = async () => {
    if (!selectedHbl) return;
    if (!canWritePayment) {
      toast.error('You do not have permission to modify payment confirmation.');
      return;
    }
    const effectivePaid = lockedPaid ? selectedStatus.paid : modalPaid;
    const effectiveDelivery = lockedDelivery ? selectedStatus.deliveryAllowed : modalDeliveryAllowed;
    const effectiveDeliveryDate = modalDeliveryDate.trim() || getTodayDateValue();
    const payload: CommercialStatus = {
      paid: effectivePaid,
      deliveryAllowed: effectiveDelivery,
      deliveryDate: effectiveDeliveryDate,
    };

    setIsSaving(true);
    try {
      await hblsApi.update(selectedHbl.id, {
        isPaid: effectivePaid,
        deliveryAllowed: effectiveDelivery,
        deliveryDate: effectiveDeliveryDate,
      });
      setCommercialStatuses((prev) => ({
        ...prev,
        [selectedHbl.id]: payload,
      }));
      toast.success('Saved payment/delivery status (temporary).');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const filterFields = useMemo(
    () => [
      {
        type: 'text',
        name: 'keywords',
        label: 'HBL number',
        placeholder: 'Enter HBL number...',
      },
      {
        type: 'select',
        name: 'issuerId',
        label: 'Forwarder',
        options: forwarderList,
        keyField: 'id',
        valueField: 'name',
      },
      {
        type: 'select',
        name: 'status',
        label: 'Status',
        options: [
          { value: 'Draft', label: 'Draft' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Done', label: 'Done' },
        ],
        keyField: 'value',
        valueField: 'label',
      },
      {
        type: 'text',
        name: 'containerNumber',
        label: 'Container number',
        placeholder: 'MSCU1234567',
      },
      {
        type: 'text',
        name: 'sealNumber',
        label: 'Seal number',
        placeholder: 'SEAL1234567',
      },
      {
        type: 'date',
        name: 'receivedAt',
        label: 'Received at',
      },
      {
        type: 'select',
        name: 'sortField',
        label: 'Sort field',
        options: [
          { value: 'code', label: 'HBL code' },
          { value: 'receivedAt', label: 'Received at' },
          { value: 'shipper', label: 'Shipper' },
          { value: 'consignee', label: 'Consignee' },
          { value: 'notifyParty', label: 'Notify party' },
          { value: 'packageCount', label: 'Package count' },
          { value: 'cargoWeight', label: 'Cargo weight' },
          { value: 'volume', label: 'Volume' },
          { value: 'vesselName', label: 'Vessel name' },
          { value: 'voyageNumber', label: 'Voyage number' },
          { value: 'pol', label: 'POL' },
          { value: 'pod', label: 'POD' },
        ],
        keyField: 'value',
        valueField: 'label',
      },
      {
        type: 'select',
        name: 'sortOrder',
        label: 'Sort order',
        options: [
          { value: 'ASC', label: 'Ascending' },
          { value: 'DESC', label: 'Descending' },
        ],
        keyField: 'value',
        valueField: 'label',
      },
    ],
    [forwarderList],
  );

  const columns: EntityColumn<HouseBill>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'HBL',
        render: (hbl) => (
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {hbl.code}
          </div>
        ),
      },
      {
        key: 'issuerId',
        label: 'Forwarder',
        render: (hbl) => (
          <div className="text-gray-700 dark:text-gray-200">
            {getForwarderDisplay(hbl.issuerId)}
          </div>
        ),
      },
      {
        key: 'shipper',
        label: 'Shipper',
        render: (hbl) => (
          <div className="text-gray-600 dark:text-gray-300">
            {hbl.shipper || '—'}
          </div>
        ),
      },
      {
        key: 'consignee',
        label: 'Consignee',
        render: (hbl) => (
          <div className="text-gray-600 dark:text-gray-300">
            {hbl.consignee || '—'}
          </div>
        ),
      },
      {
        key: 'paid',
        label: 'Paid',
        render: (hbl) => {
          const status = getStatusForHbl(hbl);
          return <StatusPill active={status.paid} label={status.paid ? 'Yes' : 'No'} />;
        },
      },
      {
        key: 'deliveryAllowed',
        label: 'Delivery allowed',
        render: (hbl) => {
          const status = getStatusForHbl(hbl);
          return (
            <StatusPill
              active={status.deliveryAllowed}
              label={status.deliveryAllowed ? 'Yes' : 'No'}
            />
          );
        },
      },
      {
        key: 'detail',
        label: 'Action',
        render: (hbl) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(hbl)}
            className="cursor-pointer"
          >
            Detail
          </Button>
        ),
      },
    ],
    [getForwarderDisplay, getStatusForHbl, handleOpenModal],
  );

  const handlePaginationChange = (next: PaginationState) => {
    setPagination((prev) =>
      prev.pageSize !== next.pageSize ? { ...next, pageIndex: 0 } : next,
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-gray-50 p-4 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isFetching && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <DynamicFilter
          fields={filterFields}
          onApplyFilter={handleApplyFilter}
          onClear={handleClearFilter}
          buttonLabel="Filters"
          className="flex-1"
        />
      </div>
      <ForwarderFilterNote loading={forwardersLoading} />

      <EntityTable
        entities={hbls}
        loading={isLoading}
        fetching={isFetching}
        error={errorMessage}
        entityName="HBL"
        entityNamePlural="HBLs"
        getId={(hbl) => hbl.id}
        columns={columns}
        actions={[]}
        canBulkEdit={false}
        enablePagination
        initialPageSize={pagination.pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        enableServerSidePagination
        totalCount={totalCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        selectedEntityId={selectedHblId}
        className="flex-1"
      />

      {modalHbl && (
        <CommercialStatusModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          hbl={modalHbl}
          lockedPaid={lockedPaid}
          lockedDelivery={lockedDelivery}
          modalPaid={modalPaid}
          modalDeliveryAllowed={modalDeliveryAllowed}
          modalDeliveryDate={modalDeliveryDate}
          setModalPaid={setModalPaid}
          setModalDeliveryAllowed={setModalDeliveryAllowed}
          setModalDeliveryDate={setModalDeliveryDate}
          onSave={handleSaveCommercialStatus}
          isSaving={isSaving}
          saveDisabled={saveDisabled}
          canWrite={canWritePayment}
          forwarderDisplay={getForwarderDisplay(modalHbl.issuerId)}
          packingListLines={modalPackingListLines}
          packingListLinesLoading={isLoadingModalPackingListLines}
          packingListLinesError={modalPackingListLinesErrorMessage}
        />
      )}
    </div>
  );
};

export default CargoPackageDeliveryCommercialPage;
