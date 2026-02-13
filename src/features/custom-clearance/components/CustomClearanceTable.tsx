import { useMemo } from 'react';
import { Download, Eye, Pencil } from 'lucide-react';
import EntityTable from '@/shared/components/EntityTable';
import { useDocumentDownload } from '@/features/document-service';
import type { ClearanceRecord } from '../types';
import { statusLabels } from '../constants';
import type { PaginationState } from '@tanstack/react-table';

const directionBadge: Record<ClearanceRecord['direction'], string> = {
  import:
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  export:
    'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200',
};

const statusBadge: Record<ClearanceRecord['status'], string> = {
  unregistered:
    'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
  registered:
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  pending:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  approved:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected:
    'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};

interface CustomClearanceTableProps {
  records: ClearanceRecord[];
  onView: (record: ClearanceRecord) => void;
  onEdit: (record: ClearanceRecord) => void;
  canEdit?: boolean;
  loading?: boolean;
  fetching?: boolean;
  error?: string | null;
  enableServerSidePagination?: boolean;
  totalCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export const CustomClearanceTable: React.FC<CustomClearanceTableProps> = ({
  records,
  onView,
  onEdit,
  canEdit = true,
  loading = false,
  fetching = false,
  error = null,
  enableServerSidePagination = false,
  totalCount,
  pagination,
  onPaginationChange,
}) => {
  const documentDownload = useDocumentDownload();

  const columns = useMemo(
    () => [
      {
        key: 'direction',
        label: 'Direction',
        render: (item: ClearanceRecord) => (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase ${directionBadge[item.direction]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {item.direction}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'status',
        label: 'Clearance Status',
        render: (item: ClearanceRecord) => (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadge[item.status]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabels[item.status]}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'hblNumber',
        label: 'HBL Number',
        render: (item: ClearanceRecord) => (
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {item.hblNumber}
          </span>
        ),
        sortable: true,
        searchable: true,
      },
      {
        key: 'file',
        label: 'File',
        render: (item: ClearanceRecord) => (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span>{item.file?.name ?? '—'}</span>
            {item.file ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800"
                onClick={() =>
                  documentDownload.mutate({
                    documentId: item.file?.id ?? '',
                    fileName: item.file?.name ?? undefined,
                    openInNewTab: true,
                  })
                }
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [documentDownload],
  );

  return (
    <EntityTable<ClearanceRecord>
      entities={records}
      loading={loading}
      fetching={fetching}
      error={error}
      entityName="clearance record"
      entityNamePlural="clearance records"
      getId={(item) => item.id}
      columns={columns}
      actions={[
        {
          key: 'view',
          label: 'View',
          icon: <Eye className="h-4 w-4" />,
          onClick: onView,
        },
        {
          key: 'edit',
          label: 'Edit',
          icon: <Pencil className="h-4 w-4" />,
          onClick: onEdit,
          disabled: () => !canEdit,
        },
      ]}
      enablePagination
      enableServerSidePagination={enableServerSidePagination}
      totalCount={totalCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      emptyStateMessage="No clearance records yet. Add API integration or replace the mock list when ready."
    />
  );
};

export default CustomClearanceTable;
