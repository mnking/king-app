import { useEffect, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { useHBLs, useUpdateHBL } from '@/features/hbl-management/hooks/use-hbls-query';
import type { HouseBill } from '@/features/hbl-management/types';
import type { Document } from '@/features/document-service/types';
import CustomClearanceModal from './CustomClearanceModal';
import CustomClearanceTable from './CustomClearanceTable';
import type { ClearanceRecord, ModalMode } from '../types';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { useForwarders } from '@/features/forwarder/hooks/use-forwarders-query';
import { useAuth } from '@/features/auth/useAuth';

const normalizeCustomsStatus = (
  status?: string | null,
): ClearanceRecord['status'] => {
  if (status?.trim().toUpperCase() === 'APPROVED') {
    return 'approved';
  }

  // UI standardization: treat UNREGISTERED and every non-approved state as pending.
  return 'pending';
};

const CustomClearancePage: React.FC = () => {
  const { can } = useAuth();
  const canWriteCustomClearance = can?.('hbl_custom_clearance:write') ?? false;
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const { data: forwardersResponse } = useForwarders(
    { status: 'Active', itemsPerPage: 200 },
    { enabled: true },
  );
  const forwarders = useMemo(() => forwardersResponse?.results ?? [], [forwardersResponse]);

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      hasPackingList: true,
      keywords:
        typeof filterValues.keywords === 'string' && filterValues.keywords.trim() !== ''
          ? filterValues.keywords.trim()
          : undefined,
      customsStatus:
        typeof filterValues.customsStatus === 'string' && filterValues.customsStatus.trim() !== ''
          ? filterValues.customsStatus.toUpperCase()
          : undefined,
      packingListWorkingStatus: ['INITIALIZED', 'IN_PROGRESS'],
      issuerId: typeof filterValues.issuerId === 'string' ? filterValues.issuerId : undefined,
    }),
    [filterValues, pagination],
  );

  const { data: hblData, isLoading, isFetching, error, refetch } = useHBLs(
    queryParams,
    { keepPreviousData: true },
  );
  const updateHbl = useUpdateHBL();
  const [isSaving, setIsSaving] = useState(false);
  const keywordFilter =
    typeof filterValues.keywords === 'string' && filterValues.keywords.trim() !== ''
      ? filterValues.keywords.trim().toLowerCase()
      : '';

  const mappedRecords: ClearanceRecord[] = useMemo(() => {
    const base =
      hblData?.results?.map((hbl: HouseBill) => {
        const doc = hbl.document;
        const mappedDoc: Document | null = doc
          ? {
              id: doc.id,
              ownerId: hbl.issuerId ?? '',
              name: doc.name ?? hbl.code,
              description: null,
              fileType: doc.mimeType ?? null,
              size: doc.sizeBytes ?? 0,
              status: 'UPLOADED',
              scope: null,
              tags: [],
              createdAt: hbl.createdAt ?? '',
              createdBy: hbl.createdBy ?? null,
              updatedAt: hbl.updatedAt ?? null,
              updatedBy: hbl.updatedBy ?? null,
              metadata: undefined,
              bucket: null,
              key: null,
              sourceId: null,
              sourceSystemReference: null,
              actions: undefined,
            }
          : null;

        return {
          id: hbl.id,
          direction: 'import',
          status: normalizeCustomsStatus(hbl.customsStatus),
          hblNumber: hbl.code,
          file: mappedDoc,
        };
      }) ?? [];

    if (!keywordFilter) {
      return base;
    }

    return base.filter((record) => {
      const hblNumber = record.hblNumber?.toLowerCase() ?? '';
      const fileName = record.file?.name?.toLowerCase() ?? '';
      return hblNumber.includes(keywordFilter) || fileName.includes(keywordFilter);
    });
  }, [hblData, keywordFilter]);

  const [records, setRecords] = useState<ClearanceRecord[]>(mappedRecords);
  const [activeRecord, setActiveRecord] = useState<ClearanceRecord | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');

  useEffect(() => {
    setRecords(mappedRecords);
  }, [mappedRecords]);

  const handleSave = async (updated: ClearanceRecord) => {
    if (!canWriteCustomClearance) {
      toast.error('You do not have permission to modify custom clearance.');
      return;
    }
    try {
      setIsSaving(true);
      const documentPayload = updated.file
        ? {
            id: updated.file.id,
            name: updated.file.name,
            mimeType: updated.file.fileType ?? undefined,
            url: `/v1/documents/${updated.file.id}/download`,
            sizeBytes: updated.file.size ?? undefined,
          }
        : null;
      const payload: Partial<HouseBill> = {
        customsStatus: updated.status.toUpperCase(),
        document: documentPayload,
      };

      const response = await updateHbl.mutateAsync({
        id: updated.id,
        data: payload as any,
      });

      const mappedFromApi: ClearanceRecord | null = response
        ? {
            id: response.id,
            direction: 'import',
            status: normalizeCustomsStatus(response.customsStatus),
            hblNumber: response.code ?? updated.hblNumber,
            file: updated.file,
          }
        : null;

      const next = mappedFromApi ?? updated;
      setRecords((prev) => prev.map((row) => (row.id === updated.id ? next : row)));
      await refetch();
      setActiveRecord(null);
      toast.success('Clearance updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update clearance');
    } finally {
      setIsSaving(false);
    }
  };

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'keywords',
        label: 'Search Keyword',
        placeholder: 'Search keywords... (HBL, File name)',
      },
      {
        type: 'select' as const,
        name: 'customsStatus',
        label: 'Clearance Status',
        options: [
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'All clearance statuses',
      },
      {
        type: 'select' as const,
        name: 'issuerId',
        label: 'Issuer',
        options: forwarders,
        keyField: 'id' as const,
        valueField: 'name' as const,
        placeholder: 'All issuers',
      },
    ],
    [forwarders],
  );

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0 space-y-6">
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
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
              <CustomClearanceTable
                records={records}
                onView={(item) => {
                  setActiveRecord(item);
                  setModalMode('view');
                }}
                onEdit={(item) => {
                  if (!canWriteCustomClearance) {
                    toast.error('You do not have permission to modify custom clearance.');
                    return;
                  }
                  setActiveRecord(item);
                  setModalMode('edit');
                }}
                canEdit={canWriteCustomClearance}
                loading={isLoading}
                fetching={isFetching}
                error={error ? (error instanceof Error ? error.message : 'Failed to load HBLs') : null}
                enableServerSidePagination
                totalCount={hblData?.total}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            </div>
          </section>
        </div>
      </div>

      {activeRecord ? (
        <CustomClearanceModal
          record={activeRecord}
          mode={modalMode}
          onClose={() => setActiveRecord(null)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
};

export default CustomClearancePage;
