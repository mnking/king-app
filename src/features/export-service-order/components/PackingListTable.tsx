import React, { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { packingListsApi } from '@/services/apiPackingLists';
import { exportServiceOrdersApi } from '@/services/apiExportOrders';
import { customsDeclarationsApi } from '@/services/apiCustomsDeclarations';
import Button from '@/shared/components/ui/Button';
import { toastAdapter } from '@/shared/services/toast';
import {
  mapFormPackingListToAssignPayload,
  mapPackingListItemToFormRow,
  mapOrderPackingListsToFormRows,
} from '../helpers/export-service-order.utils';
import type {
  ExportServiceOrder,
  ExportServiceOrderFormPackingList,
  ExportServiceOrderFormValues,
} from '../types';
import type { PackingListListItem } from '@/features/packing-list/types';
import PackingListRow from './PackingListRow';
import {
  useAssignExportServiceOrderPackingList,
  useTransferExportServiceOrderPackingList,
  useUnassignExportServiceOrderPackingList,
} from '../hooks';

interface PackingListTableProps {
  isReadOnly?: boolean;
  orderId?: string | null;
  orderStatus?: ExportServiceOrder['status'];
}

type UsedPackingListInfo = {
  orderId: string;
  orderCode?: string | null;
};

const getOrderLookup = (orders: ExportServiceOrder[] = []) => {
  const lookup: Record<string, UsedPackingListInfo> = {};
  orders.forEach((order) => {
    (order.packingLists ?? []).forEach((row) => {
      if (row.packingListId) {
        lookup[row.packingListId] = {
          orderId: order.id,
          orderCode: order.code ?? null,
        };
      }
    });
  });
  return lookup;
};

const formatOrderLabel = (info: UsedPackingListInfo) =>
  info.orderCode ? `Order ${info.orderCode}` : `Order ${info.orderId}`;

export const PackingListTable: React.FC<PackingListTableProps> = ({
  isReadOnly = false,
  orderId,
  orderStatus,
}) => {
  const { watch, setValue } = useFormContext<ExportServiceOrderFormValues>();

  const watchedPackingLists = watch('packingLists');
  const packingLists = useMemo(
    () => watchedPackingLists ?? [],
    [watchedPackingLists],
  );
  const forwarderId = watch('forwarderId');
  const selectedPackingListIds = useMemo(
    () =>
      packingLists
        .map((row) => row.packingListId)
        .filter((id): id is string => Boolean(id)),
    [packingLists],
  );

  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const assignMutation = useAssignExportServiceOrderPackingList();
  const unassignMutation = useUnassignExportServiceOrderPackingList();
  const transferMutation = useTransferExportServiceOrderPackingList();

  const canEdit = !isReadOnly && orderStatus !== 'DONE';
  const canSync = Boolean(orderId);
  const trimmedSearch = searchInput.trim();
  const canLoadSource = canEdit && Boolean(forwarderId);
  const canShowCandidates = trimmedSearch.length >= 3 && Boolean(forwarderId);

  const {
    data: packingListSource = [],
    isLoading: isPackingListsLoading,
    isFetching: isPackingListsFetching,
  } = useQuery({
    queryKey: ['packing-lists', 'eligible', forwarderId],
    queryFn: async () => {
      const response = await packingListsApi.getAll({
        page: 1,
        itemsPerPage: 1000,
        workingStatus: 'INITIALIZED',
        forwarderId: forwarderId ?? undefined,
        directionFlow: 'EXPORT',
      });
      return response.data?.results ?? [];
    },
    enabled: canLoadSource,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const eligiblePackingLists = useMemo(() => {
    const normalizedSearch = trimmedSearch.toLowerCase();
    return packingListSource.filter((row) => {
      if (row.directionFlow !== 'EXPORT') return false;
      if (row.status !== 'APPROVED' && row.status !== 'PARTIAL') return false;
      if (normalizedSearch.length < 3) return false;
      const number = (row.packingListNumber ?? '').toLowerCase();
      return number.includes(normalizedSearch);
    });
  }, [packingListSource, trimmedSearch]);

  const availablePackingLists = useMemo(
    () =>
      eligiblePackingLists.filter((row) => !selectedPackingListIds.includes(row.id)),
    [eligiblePackingLists, selectedPackingListIds],
  );

  const [transferIndex, setTransferIndex] = useState<number | null>(null);
  const [transferOrders, setTransferOrders] = useState<ExportServiceOrder[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferError, setTransferError] = useState<string | null>(null);

  const setPackingLists = (nextRows: ExportServiceOrderFormPackingList[]) => {
    setValue('packingLists', nextRows, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  };

  const syncPackingLists = (updatedOrder: ExportServiceOrder) => {
    const nextRows = mapOrderPackingListsToFormRows(updatedOrder.packingLists ?? []);
    setPackingLists(nextRows);
    setExpandedIndexes(new Set());
  };

  const handleToggleExpand = (index: number) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const shiftExpandedIndexes = (removedIndex: number) => {
    setExpandedIndexes((prev) => {
      const next = new Set<number>();
      prev.forEach((value) => {
        if (value === removedIndex) return;
        next.add(value > removedIndex ? value - 1 : value);
      });
      return next;
    });
  };

  const handleRemove = async (index: number) => {
    if (!canEdit) return;

    const row = packingLists[index];
    const packingListId = row?.packingListId ?? null;

    if (!canSync || !orderId || !packingListId) {
      const nextRows = packingLists.filter((_, rowIndex) => rowIndex !== index);
      setPackingLists(nextRows);
      shiftExpandedIndexes(index);
      return;
    }

    // TODO: enforce unassign constraints (planned assignment) once API is available.
    const confirmed = await toastAdapter.confirm(
      'Remove packing list from this order?',
      { intent: 'danger' },
    );
    if (!confirmed) return;

    try {
      const updatedOrder = await unassignMutation.mutateAsync({
        id: orderId,
        payload: { packingListId },
      });
      syncPackingLists(updatedOrder);
    } catch {
      // Toast handled by hook.
    }
  };

  const handleAddPackingLists = (items: ExportServiceOrderFormPackingList[]) => {
    if (!canEdit) return;
    const existingIds = new Set(selectedPackingListIds);
    const rowsToAdd = items.filter((item) =>
      item.packingListId ? !existingIds.has(item.packingListId) : true,
    );
    if (rowsToAdd.length === 0) return;

    const startIndex = packingLists.length;
    setPackingLists([...packingLists, ...rowsToAdd]);

    const newIndexes = rowsToAdd.map((_, idx) => startIndex + idx);
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      newIndexes.forEach((idx) => next.add(idx));
      return next;
    });
    setTimeout(() => {
      const rowElements = document.querySelectorAll('[data-packing-list-row]');
      const lastRow = rowElements[rowElements.length - 1];
      if (lastRow) {
        lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleSelectPackingList = async (item: PackingListListItem) => {
    if (!canEdit || isAdding) return;

    if (!forwarderId) {
      setAddError('Select a forwarder before adding a packing list.');
      return;
    }

    if (selectedPackingListIds.includes(item.id)) {
      setAddError('Packing list already added.');
      return;
    }

    let added = false;
    setAddError(null);
    setIsAdding(true);

    try {
      const ordersResponse = await exportServiceOrdersApi.getAll({
        page: 1,
        itemsPerPage: 1000,
        status: 'all',
      });
      const usedPackingListLookup = getOrderLookup(ordersResponse.data?.results ?? []);
      const usedInfo = usedPackingListLookup[item.id];
      if (usedInfo && usedInfo.orderId !== orderId) {
        setAddError(`Packing list already assigned to ${formatOrderLabel(usedInfo)}.`);
        return;
      }

      const customsDeclaration = item.customsDeclarationId
        ? await customsDeclarationsApi.getById(item.customsDeclarationId)
        : null;
      const newRow = mapPackingListItemToFormRow(item, customsDeclaration);

      if (!canSync || !orderId) {
        handleAddPackingLists([newRow]);
        added = true;
        return;
      }

      const payload = mapFormPackingListToAssignPayload(newRow);
      if (!payload) {
        setAddError('Packing list selection is missing.');
        return;
      }
      const updatedOrder = await assignMutation.mutateAsync({ id: orderId, payload });
      syncPackingLists(updatedOrder);
      added = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to attach packing list.';
      setAddError(message);
    } finally {
      setIsAdding(false);
      void added;
    }
  };

  const openTransfer = async (index: number) => {
    if (!canSync || !orderId) return;
    setTransferIndex(index);
    setTransferTargetId('');
    setTransferError(null);
    setTransferLoading(true);

    try {
      const response = await exportServiceOrdersApi.getAll({
        page: 1,
        itemsPerPage: 1000,
        status: 'not_done',
        forwarderId: forwarderId ?? undefined,
      });
      const orders = response.data?.results ?? [];
      setTransferOrders(orders.filter((order) => order.id !== orderId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load orders.';
      setTransferError(message);
      setTransferOrders([]);
    } finally {
      setTransferLoading(false);
    }
  };

  const closeTransfer = () => {
    setTransferIndex(null);
    setTransferTargetId('');
    setTransferError(null);
  };

  const handleConfirmTransfer = async () => {
    if (!canSync || !orderId) return;
    if (transferIndex === null) return;

    const row = packingLists[transferIndex];
    if (!row?.packingListId) return;

    if (!transferTargetId) {
      setTransferError('Select a target order.');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        id: orderId,
        payload: {
          packingListId: row.packingListId,
          targetOrderId: transferTargetId,
        },
      });
      const refreshedOrder = await exportServiceOrdersApi.getById(orderId);
      syncPackingLists(refreshedOrder.data);
      closeTransfer();
    } catch {
      // Toast handled by hook.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Packing Lists
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {packingLists.length === 0
            ? 'No packing lists added yet'
            : `${packingLists.length} packing list${packingLists.length > 1 ? 's' : ''} added`}
        </p>
      </div>

      {!isReadOnly && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Available Packing Lists
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select one packing list at a time to attach to this order.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                if (addError) setAddError(null);
              }}
              placeholder="Type at least 3 characters to search by packing list number"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              disabled={isAdding}
            />
          </div>
          {!forwarderId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Select a forwarder to load eligible packing lists.
            </p>
          )}
          {forwarderId && !canShowCandidates && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter at least 3 characters to search. Results will appear below.
            </p>
          )}

          {canShowCandidates && (
            <div className="mt-3 space-y-2">
              {isPackingListsLoading || isPackingListsFetching ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Loading eligible packing lists...
                </div>
              ) : availablePackingLists.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No eligible packing lists found. Try a different number or check the forwarder.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {availablePackingLists.map((row) => (
                    <div
                      key={row.id}
                      className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isAdding ? 'opacity-70' : ''
                      } border-gray-200 dark:border-gray-700`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {row.packingListNumber ?? row.id}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Status: {row.status} · Working: {row.workingStatus ?? '-'}
                        </span>
                        {row.customsDeclarationId && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Customs declaration linked
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSelectPackingList(row)}
                        disabled={isAdding}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {addError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {addError}
            </p>
          )}
          {!orderId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Packing lists will be assigned once the draft is saved.
            </p>
          )}
        </div>
      )}

      {packingLists.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-1">
            No packing lists added yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Select a packing list from the list above to attach it.
          </p>
          {!isReadOnly && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Packing lists must be export, approved or partial, and initialized.
            </p>
          )}
        </div>
      )}

      {packingLists.length > 0 && (
        <div className="space-y-3">
          <div className="hidden lg:grid grid-cols-[auto_1.4fr_1fr_1fr_0.7fr_auto] gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
            <div>#</div>
            <div>Packing List</div>
            <div>Working Status</div>
            <div>Customs Decl.</div>
            <div>Planned</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="space-y-2">
            {packingLists.map((row, index) => (
              <div key={row.clientId ?? row.packingListId ?? index}>
                <PackingListRow
                  index={index}
                  isReadOnly={!canEdit}
                  isExpanded={expandedIndexes.has(index)}
                  onToggleExpand={() => handleToggleExpand(index)}
                  onRemove={handleRemove}
                  canRemove={packingLists.length > 0}
                  onTransfer={canSync ? openTransfer : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {packingLists.length > 0 && !isReadOnly && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Tip: Click on any packing list row to expand and view details.
        </div>
      )}

      {transferIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Transfer Packing List
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a target order to receive this packing list.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTransfer}
                className="text-gray-400 hover:text-gray-600"
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {transferLoading && (
                <div className="text-sm text-gray-500">Loading orders...</div>
              )}
              {!transferLoading && transferOrders.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  No available orders to transfer to.
                </div>
              )}
              {!transferLoading && transferOrders.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transferOrders.map((order) => (
                    <label
                      key={order.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        transferTargetId === order.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {order.code ?? order.id}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {order.forwarderCode ?? '-'} - {order.status}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="transferTarget"
                        value={order.id}
                        checked={transferTargetId === order.id}
                        onChange={() => {
                          setTransferTargetId(order.id);
                          if (transferError) setTransferError(null);
                        }}
                        className="h-4 w-4 text-blue-600"
                      />
                    </label>
                  ))}
                </div>
              )}
              {transferError && (
                <div className="text-sm text-red-600">{transferError}</div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeTransfer}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmTransfer()}
                loading={transferMutation.isPending}
                disabled={transferLoading}
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingListTable;
