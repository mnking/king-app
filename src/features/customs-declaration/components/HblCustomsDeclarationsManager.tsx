import React, { useCallback, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Download, Edit3, Plus } from 'lucide-react';
import EntityTable, {
  type EntityAction,
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { Button } from '@/shared/components/ui/Button';
import { usePackingList } from '@/features/packing-list/hooks/use-packing-lists';
import { useDocumentDownload } from '@/features/document-service';
import type { CustomsDeclarationResponse } from '../types';
import { useCustomsDeclarations } from '../hooks';
import { ExportCustomsDeclarationModal } from './ExportCustomsDeclarationModal';

export interface HblCustomsDeclarationsManagerProps {
  hblId: string;
  packingListId: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
};

const statusChipStyles: Record<
  CustomsDeclarationResponse['status'],
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
};

const StatusChip: React.FC<{ status: CustomsDeclarationResponse['status'] }> = ({
  status,
}) => {
  const config = statusChipStyles[status] ?? statusChipStyles.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export const HblCustomsDeclarationsManager: React.FC<
  HblCustomsDeclarationsManagerProps
> = ({ hblId, packingListId }) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCustomsDeclarationId, setActiveCustomsDeclarationId] = useState<
    string | null
  >(null);

  const packingListQuery = usePackingList(packingListId ?? '', {
    enabled: !!packingListId,
  });
  const packingList = packingListQuery.data ?? null;

  const listQuery = useCustomsDeclarations(
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      hblId,
      order: { createdAt: 'DESC' },
    },
    { enabled: !!hblId },
  );

  const documentDownload = useDocumentDownload();

  const handleAdd = useCallback(() => {
    setActiveCustomsDeclarationId(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((customsDeclaration: CustomsDeclarationResponse) => {
    setActiveCustomsDeclarationId(customsDeclaration.id);
    setModalOpen(true);
  }, []);

  const columns: EntityColumn<CustomsDeclarationResponse>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'CD Number',
        searchable: true,
        render: (cd) => (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {cd.code || '—'}
          </div>
        ),
      },
      {
        key: 'registeredAt',
        label: 'Register Date',
        render: (cd) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(cd.registeredAt)}
          </div>
        ),
      },
      {
        key: 'customsOffice',
        label: 'Customs Office',
        searchable: true,
        render: (cd) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {cd.customsOffice || '—'}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Clearance Status',
        render: (cd) => <StatusChip status={cd.status} />,
      },
      {
        key: 'file',
        label: 'File',
        render: (cd) => {
          const document = cd.mainDocument;
          if (!document?.id) {
            return <span className="text-sm text-gray-400">—</span>;
          }

          const fileName =
            document.name?.trim() ||
            (cd.code ? `CD-${cd.code}` : 'Customs Declaration');

          return (
            <Button
              variant="ghost"
              size="xs"
              className="inline-flex items-center gap-2 max-w-[220px]"
              onClick={() =>
                documentDownload.mutate({
                  documentId: document.id,
                  fileName,
                  openInNewTab: true,
                })
              }
              disabled={documentDownload.isPending}
              title={fileName}
            >
              <Download className="h-4 w-4" />
              <span className="truncate">{fileName}</span>
            </Button>
          );
        },
      },
    ],
    [documentDownload],
  );

  const actions: EntityAction<CustomsDeclarationResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        icon: <Edit3 className="h-4 w-4" />,
        onClick: handleEdit,
      },
    ],
    [handleEdit],
  );

  const hasPackingList = !!packingListId;
  const listData = listQuery.data;
  const customsDeclarations = listData?.results ?? [];
  const totalCount = listData?.total ?? 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 flex items-start justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Customs Declarations
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Manage Customs Declarations (CD) for this HBL.
          </div>
          {!hasPackingList && (
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Cargo List is missing for this HBL. You cannot create a new Customs Declaration.
            </div>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          className="inline-flex items-center gap-2 whitespace-nowrap"
          onClick={handleAdd}
          disabled={!hasPackingList}
        >
          <Plus className="h-4 w-4" />
          Add CD
        </Button>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <EntityTable
          entities={customsDeclarations}
          loading={listQuery.isLoading}
          fetching={listQuery.isFetching}
          error={listQuery.error ? (listQuery.error as Error).message : null}
          entityName="Customs Declaration"
          entityNamePlural="Customs Declarations"
          getId={(cd) => cd.id}
          columns={columns}
          actions={actions}
          canCreate={false}
          canBulkEdit={false}
          enablePagination={true}
          enableServerSidePagination={true}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          emptyStateMessage="No customs declarations found"
        />
      </div>

      <ExportCustomsDeclarationModal
        open={modalOpen}
        packingList={packingList}
        customsDeclarationId={activeCustomsDeclarationId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default HblCustomsDeclarationsManager;
