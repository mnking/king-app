import EntityTable from '@/shared/components/EntityTable';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Button } from '@/shared/components/ui/Button';
import { usePackingListSelectionTable } from '../hooks/usePackingListSelectionTable';

interface PackingListSelectionTableProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const PackingListSelectionTable = ({
  selectedId,
  onSelect,
}: PackingListSelectionTableProps) => {
  const {
    rows,
    columns,
    pagination,
    setPagination,
    totalCount,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
    handleSelect,
  } = usePackingListSelectionTable({ selectedId, onSelect });

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Select a packing list</p>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <LoadingSpinner className="h-4 w-4" /> : 'Refresh'}
        </Button>
      </div>
      <EntityTable
        entities={rows}
        loading={isLoading}
        fetching={isFetching}
        error={errorMessage}
        entityName="packing list"
        entityNamePlural="packing lists"
        getId={(row) => row.id}
        columns={columns}
        actions={[]}
        enablePagination
        enableServerSidePagination
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={totalCount}
        selectedEntityId={selectedId ?? undefined}
        onEntitySelect={handleSelect}
        emptyStateMessage="No packing lists available to select."
      />
    </div>
  );
};
