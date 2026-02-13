import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import EntityTable, { EntityColumn } from '@/shared/components/EntityTable';
import { useEmptyContainerOperations } from '@/features/return-empty-container/hooks';
import type { Container } from '@/features/containers/types';
import { useAuth } from '@/features/auth/useAuth';

type ReturnContainer = {
  id: string;
  containerNo: string;
  forwarder: string | null;
  destuffPlan: string | null;
  bookingOrder: string | null;
};

const toReturnContainer = (container: Container): ReturnContainer => {
  const containerData = container as Container & {
    forwarderName?: string;
    forwarder?: string;
    destuffPlanCode?: string;
    destuffPlan?: string;
    bookingOrderCode?: string;
    bookingOrder?: string;
  };

  return {
    id: container.number,
    containerNo: container.number,
    forwarder: containerData.forwarderName ?? containerData.forwarder ?? null,
    destuffPlan: containerData.destuffPlanCode ?? containerData.destuffPlan ?? null,
    bookingOrder: containerData.bookingOrderCode ?? containerData.bookingOrder ?? null,
  };
};

const ReturnEmptyContainerPage: React.FC = () => {
  const { can } = useAuth();
  const canReturnEmptyContainers = can?.('return_empty_container:write') ?? false;
  const queryParams = useMemo(() => ({ page: 1, itemsPerPage: 50 }), []);
  const { query, returnMutation } = useEmptyContainerOperations(queryParams);

  const containers = useMemo(
    () => (query.data?.results ?? []).map(toReturnContainer),
    [query.data],
  );

  const columns: EntityColumn<ReturnContainer>[] = useMemo(
    () => [
      {
        key: 'containerNo',
        label: 'Container No',
        sortable: true,
        searchable: true,
      },
      {
        key: 'forwarder',
        label: 'Forwarder',
        sortable: true,
        searchable: true,
        render: (item) => item.forwarder ?? '-',
      },
      {
        key: 'destuffPlan',
        label: 'Destuff Plan',
        sortable: true,
        searchable: true,
        render: (item) => item.destuffPlan ?? '-',
      },
      {
        key: 'bookingOrder',
        label: 'Booking Order',
        sortable: true,
        searchable: true,
        render: (item) => item.bookingOrder ?? '-',
      },
    ],
    [],
  );

  const handleReturnContainers = async (ids: string[]) => {
    if (!canReturnEmptyContainers) {
      toast.error('You do not have permission to return empty containers.');
      return;
    }
    if (!ids.length) return;
    try {
      await Promise.all(
        ids.map((containerNumber) =>
          returnMutation.mutateAsync([containerNumber]),
        ),
      );
    } catch {
      // Mutation errors are handled via react-query state.
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="flex-1 overflow-hidden p-4">
              <EntityTable<ReturnContainer>
                entities={containers}
                loading={query.isLoading}
                fetching={query.isFetching}
                error={
                  query.error
                    ? query.error instanceof Error
                      ? query.error.message
                      : 'Failed to load empty containers'
                    : null
                }
                entityName="return container"
                entityNamePlural="return containers"
                getId={(entity) => entity.id}
                columns={columns}
                actions={[]}
                canBulkEdit={canReturnEmptyContainers}
                bulkActions={[
                  {
                    key: 'return-container',
                    label: 'Return Container',
                    onClick: handleReturnContainers,
                    disabled: !canReturnEmptyContainers || returnMutation.isPending,
                  },
                ]}
                className="h-full"
              />
            </div>
          </section>
    </div>
  );
};

export default ReturnEmptyContainerPage;
