import React from 'react';
import { Eye, Edit3, Trash2, PackageSearch, FileText } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { PaginationState } from '@tanstack/react-table';
import type { PackingListListItem, PackingListStatus } from '../types';
import EntityTable from '@/shared/components/EntityTable';
import type {
  EntityColumn,
  EntityAction,
} from '@/shared/components/EntityTable';
import {
  cargoInspectionQueryKeys,
  useCreateInspectionSession,
} from '@/shared/features/cargo-inspection';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import { customsDeclarationsApi } from '@/services/apiCustomsDeclarations';

interface PackingListTableProps {
  packingLists: PackingListListItem[];
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  onView: (packingList: PackingListListItem) => void;
  onEdit: (packingList: PackingListListItem) => void;
  onDelete: (packingList: PackingListListItem) => void;
  onCustomsDeclaration: (packingList: PackingListListItem) => void;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  canWrite?: boolean;
  forwarderNameById?: Record<string, string>;
  className?: string;
}

const statusConfig: Record<
  PackingListStatus,
  { label: string; badgeClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  PARTIAL: {
    label: 'Partial',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
  DONE: {
    label: 'Done',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  },
};

const directionFlowConfig: Record<
  NonNullable<PackingListListItem['directionFlow']>,
  { label: string; badgeClass: string }
> = {
  IMPORT: {
    label: 'Import',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  EXPORT: {
    label: 'Export',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
};

const customsDeclarationStatusConfig: Record<
  'PENDING' | 'APPROVED',
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: 'Pending',
    badgeClass:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
};

const CustomsDeclarationStatusCell: React.FC<{ declarationId?: string | null }> = ({
  declarationId,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['customs-declaration-status', declarationId],
    queryFn: async () => {
      if (!declarationId) return null;
      return customsDeclarationsApi.getById(declarationId);
    },
    enabled: !!declarationId,
    staleTime: 60_000,
  });

  if (!declarationId) return <span>—</span>;
  if (isLoading) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
    );
  }
  if (!data?.status) return <span>—</span>;

  const config =
    customsDeclarationStatusConfig[
      data.status as keyof typeof customsDeclarationStatusConfig
    ] ?? customsDeclarationStatusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
    >
      {config.label}
    </span>
  );
};

export const PackingListTable: React.FC<PackingListTableProps> = ({
  packingLists,
  loading,
  fetching,
  error,
  onView,
  onEdit,
  onDelete,
  onCustomsDeclaration,
  totalCount,
  pagination,
  onPaginationChange,
  searchValue,
  onSearchChange,
  canWrite = true,
  forwarderNameById,
  className,
}) => {
  const queryClient = useQueryClient();
  const createInspectionSession = useCreateInspectionSession();
  const [inspectLoadingId, setInspectLoadingId] = React.useState<string | null>(
    null,
  );

  const _handleInspectCargo = async (item: PackingListListItem) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify packing lists.');
      return;
    }
    if (inspectLoadingId) return;
    setInspectLoadingId(item.id);
    try {
      const sessions =
        (await queryClient.fetchQuery({
          queryKey: cargoInspectionQueryKeys.sessions.list(item.id, 'INBOUND'),
          queryFn: async () => {
            const response = await cargoInspectionApi.getSessions(
              item.id,
              'INBOUND',
            );
            return response.data;
          },
        })) ?? [];

      if (Array.isArray(sessions) && sessions.length > 0) {
        toast('Inspection session already exists');
        return;
      }

      await createInspectionSession.mutateAsync({
        packingListId: item.id,
        flowType: 'INBOUND',
      });
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to start inspection session';
      toast.error(message);
    } finally {
      setInspectLoadingId(null);
    }
  };

  const columns: EntityColumn<PackingListListItem>[] = [
    {
      key: 'packingListNumber',
      label: 'Cargo list #',
      render: (item) => item.packingListNumber ?? '—',
    },
    {
      key: 'containerNumber',
      label: 'Container',
      render: (item) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {item.hblData?.containerNumber || '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Seal: {item.hblData?.sealNumber || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'mbl',
      label: 'MBL',
      render: (item) => item.mbl ?? '—',
    },
    {
      key: 'hblCode',
      label: 'HBL',
      render: (item) => item.hblData?.hblCode ?? '—',
    },
    {
      key: 'forwarderName',
      label: 'Forwarder',
      render: (item) =>
        (item.forwarderId
          ? forwarderNameById?.[item.forwarderId]
          : undefined) ?? '—',
    },
    {
      key: 'consignee',
      label: 'Consignee',
      render: (item) => item.hblData?.consignee ?? '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const config = statusConfig[item.status];
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'directionFlow',
      label: 'Direction Flow',
      render: (item) => {
        if (!item.directionFlow) {
          return '—';
        }
        const config = directionFlowConfig[item.directionFlow];
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'customsDeclaration',
      label: 'Customs Declaration',
      render: (item) => (
        <CustomsDeclarationStatusCell
          declarationId={item.customsDeclarationId}
        />
      ),
    },
  ];

  const actions: EntityAction<PackingListListItem>[] = [
    // {
    //   key: 'inspect',
    //   label: 'Inspect Cargo',
    //   icon: <PackageSearch className="h-4 w-4" />,
    //   onClick: _handleInspectCargo,
    //   disabled: (item) =>
    //     !canWrite || item.status !== 'APPROVED' || inspectLoadingId === item.id,
    // },
    // {
    //   key: 'update-document-status',
    //   label: 'Update Document Status',
    //   icon: <FilePenLine className="h-4 w-4" />,
    //   onClick: _onUpdateDocumentStatus,
    //   disabled: () => !canWrite,
    // },
    {
      key: 'customs-declaration',
      label: 'Customs Declaration',
      icon: <FileText className="h-4 w-4" />,
      onClick: onCustomsDeclaration,
      hidden: (item) => item.directionFlow !== 'EXPORT',
    },
    {
      key: 'view',
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: onView,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit3 className="h-4 w-4" />,
      onClick: onEdit,
      disabled: (item) =>
        !canWrite || item.status === 'APPROVED' || item.status === 'DONE',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive',
      disabled: (item) =>
        !canWrite || !(item.status === 'DRAFT' || item.status === 'PARTIAL'),
    },
  ];

  return (
    <EntityTable<PackingListListItem>
      entities={packingLists}
      loading={loading}
      fetching={fetching}
      error={error ?? null}
      entityName="packing list"
      entityNamePlural="packing lists"
      getId={(item) => item.id}
      columns={columns}
      actions={actions}
      canCreate={false}
      enablePagination
      enableServerSidePagination
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalCount={totalCount}
      initialPageSize={100}
      pageSizeOptions={[10, 20, 50, 100]}
      searchPlaceholder={
        onSearchChange ? 'Search MBL, HBL, container, forwarder, consignee...' : undefined
      }
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      emptyStateIcon={<PackageSearch className="h-10 w-10 text-gray-400" />}
      emptyStateMessage="No packing lists match your filters"
      className={className}
    />
  );
};

export default PackingListTable;
