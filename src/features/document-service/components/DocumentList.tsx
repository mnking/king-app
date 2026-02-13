import { useMemo } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useDocumentList } from '../hooks/use-document-list';
import { useDocumentDownload } from '../hooks/use-document-download';
import type { Document } from '../types';
import { formatBytes } from '../helpers/validation';

interface DocumentListProps {
  ownerId: string;
  pageSize?: number;
  search?: string;
  onDocumentSelected?: (document: Document) => void;
}

const statusStyles: Record<string, string> = {
  UPLOADED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  PROCESSING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const formatDateTime = (value: string | undefined | null) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const DocumentList: React.FC<DocumentListProps> = ({
  ownerId,
  pageSize,
  search,
  onDocumentSelected,
}) => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    queryKey,
  } = useDocumentList({
    ownerId,
    initialPageSize: pageSize,
    search,
  });

  const downloadMutation = useDocumentDownload();

  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;

  const tableRows = useMemo(() => data?.items ?? [], [data]);

  const handleDownload = (document: Document) => {
    downloadMutation.mutate({
      documentId: document.id,
      fileName: document.name,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {/* TODO(i18n): Localize list heading. */}
            Uploaded documents
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {/* TODO(i18n): Localize total documents label. */}
            Total documents: {totalItems}
          </p>
        </div>
        {import.meta.env.DEV && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {/* TODO(i18n): Localize query key debug label (optional for developers). */}
            Query key: {JSON.stringify(queryKey)}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-6 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {/* TODO(i18n): Localize initial loading state. */}
          Loading documents...
        </div>
      ) : isError ? (
        <div className="p-4 text-sm text-red-600 dark:text-red-400">
          {error instanceof Error
            ? error.message
            : // TODO(i18n): Localize list error fallback.
              'Unable to load documents.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/70">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Type
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Size
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Created by
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Created at
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">
                    {/* TODO(i18n): Localize column label. */}
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {/* TODO(i18n): Localize empty state message. */}
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((document) => {
                    const statusClassName =
                      statusStyles[document.status] ??
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

                    return (
                      <tr key={document.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onDocumentSelected?.(document)}
                            className="text-left font-medium text-blue-600 hover:underline dark:text-blue-300"
                          >
                            {document.name}
                          </button>
                          {document.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {document.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {document.fileType || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatBytes(document.size)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName}`}
                          >
                            {document.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {document.createdBy || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatDateTime(document.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            disabled={
                              downloadMutation.isPending || document.status !== 'UPLOADED'
                            }
                            loading={
                              downloadMutation.isPending &&
                              downloadMutation.variables?.documentId === document.id
                            }
                          >
                            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                            {/* TODO(i18n): Localize download button text. */}
                            Download
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-300">
              {/* TODO(i18n): Localize pagination summary. */}
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || isFetching}
              >
                {/* TODO(i18n): Localize previous button text. */}
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isFetching}
              >
                {/* TODO(i18n): Localize next button text. */}
                Next
              </Button>
              <select
                value={itemsPerPage}
                onChange={(event) => {
                  const nextSize = Number(event.target.value);
                  setItemsPerPage(nextSize);
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {[5, 10, 20, 50].map((sizeOption) => (
                  <option key={sizeOption} value={sizeOption}>
                    {/* TODO(i18n): Localize page size label. */}
                    {sizeOption} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentList;
