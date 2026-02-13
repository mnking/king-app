import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Box,
  Activity,
  FileText,
  Truck,
  AlertCircle
} from 'lucide-react';

// Hooks
import { useContainerList } from '@/features/containers/hooks/use-containers-query';
import { useContainerCycleList, useContainerCycle } from '@/features/containers/hooks/use-container-cycles';
import { useCycleTransactions } from '@/features/containers/hooks/use-container-transactions';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

// Types
import type { Container } from '@/features/containers/types';


export const ContainerCyclesPage: React.FC = () => {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Simple debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);


  // --- Data Fetching: Level 1 (Containers) ---
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const containerListParams = useMemo(() => ({
    page,
    itemsPerPage,
    containerNumber: debouncedSearch || undefined,
    number: debouncedSearch || undefined,
    order: 'number:DESC',
  }), [debouncedSearch, page]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: containerData, isLoading: isLoadingContainers } = useContainerList(containerListParams);
  // Type assertion to access PaginatedResponse properties
  const response = containerData as any;
  const containers = response?.results ?? [];
  const totalCount = response?.total ?? 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 overflow-hidden p-6">

      {/* --- Left Column: Container & Cycle Selector --- */}
      <div className="flex w-[400px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">

        {/* Search Header */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Find Container
            </label>
            <span className="text-xs text-gray-400">
              Total: {totalCount}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by container number..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Container List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {isLoadingContainers ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            </div>
          ) : containers.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {searchTerm ? 'No containers found' : 'Enter a container number'}
            </div>
          ) : (
            <div className="space-y-2">
              {containers.map((container: Container) => (
                <ContainerItem
                  key={container.id}
                  container={container}
                  isExpanded={expandedContainerId === container.id}
                  selectedCycleId={selectedCycleId}
                  onToggleExpand={() => setExpandedContainerId(
                    expandedContainerId === container.id ? null : container.id
                  )}
                  onSelectCycle={(cycleId) => setSelectedCycleId(cycleId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoadingContainers}
                className="rounded border border-gray-200 px-2 py-1 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoadingContainers}
                className="rounded border border-gray-200 px-2 py-1 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Column: Transaction Details --- */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <CycleDetailsView cycleId={selectedCycleId} />
      </div>

    </div >
  );
};

// --- Sub-Components ---

const ContainerItem: React.FC<{
  container: Container;
  isExpanded: boolean;
  selectedCycleId: string | null;
  onToggleExpand: () => void;
  onSelectCycle: (id: string) => void;
}> = ({ container, isExpanded, selectedCycleId, onToggleExpand, onSelectCycle }) => {

  // --- Data Fetching: Level 2 (Cycles) ---
  const { data: cyclesData, isLoading: isLoadingCycles } = useContainerCycleList(
    useMemo(() => ({
      containerNumber: container.number,
      order: 'createdAt:DESC',
      itemsPerPage: 25
    }), [container.number]),
    { enabled: isExpanded }
  );

  const cycles = cyclesData?.results ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white transition-all dark:border-gray-800 dark:bg-gray-900">

      {/* Container Header Row */}
      <button
        onClick={onToggleExpand}
        className={clsx(
          "flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
          { "bg-gray-50 dark:bg-gray-800": isExpanded }
        )}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Box className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{container.number}</div>
            <div className="text-xs text-gray-500">
              {container.containerType?.code || container.containerTypeCode}
            </div>
          </div>
        </div>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Nested Cycles List */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
          {isLoadingCycles ? (
            <div className="py-2 px-2 text-center text-xs text-gray-500">
              Loading history...
            </div>
          ) : cycles.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-500">No cycles recorded</div>
          ) : (
            <div className="space-y-1">
              <div className="mb-2 px-2 text-xs text-gray-400">
                {cycles.length} Cycles found
              </div>
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => onSelectCycle(cycle.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selectedCycleId === cycle.id
                      ? "bg-blue-500 text-white shadow-md dark:bg-blue-600"
                      : "text-gray-600 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-gray-800"
                  )}
                >
                  <Activity className={clsx("h-3.5 w-3.5", selectedCycleId === cycle.id ? "text-white" : "text-gray-400")} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {cycle.isActive ? 'Active Cycle' : 'Completed Cycle'}
                      </span>
                      {cycle.isActive && (
                        <span className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          selectedCycleId === cycle.id ? "bg-white" : "bg-green-500"
                        )} />
                      )}
                    </div>
                    <div className={clsx("text-xs", selectedCycleId === cycle.id ? "text-blue-100" : "text-gray-500")}>
                      {formatDateTimeForDisplay(cycle.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const CycleDetailsView: React.FC<{ cycleId: string | null }> = ({ cycleId }) => {
  // Fetch Cycle Details
  const { data: selectedCycle, isLoading: isLoadingCycle } = useContainerCycle(cycleId || '');

  // Fetch Transactions
  const { data: transactions, isLoading: isLoadingTx } = useCycleTransactions(cycleId);
  const isLoading = isLoadingCycle || isLoadingTx;

  if (!cycleId || !selectedCycle) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400">
        <div className="mb-4 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
          <Truck className="h-10 w-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Cycle Selected</h3>
        <p className="max-w-xs text-sm">Search for a container and select a cycle to view its full transaction history.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cycle Header Details */}
      <div className="border-b border-gray-100 p-6 dark:border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Cycle Details
            </h3>
            <p className="font-mono text-sm text-gray-500">{selectedCycle.code}</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-center dark:bg-gray-800">
              <span className="block text-xs font-semibold uppercase text-gray-500">Operation</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.operationMode || '—'}</span>
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-center dark:bg-gray-800">
              <span className="block text-xs font-semibold uppercase text-gray-500">Start Event</span>
              <span className="font-medium">{selectedCycle.startEvent}</span>
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-center dark:bg-gray-800">
              <span className="block text-xs font-semibold uppercase text-gray-500">End Event</span>
              <span className="font-medium">{selectedCycle.endEvent || '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <div>
            <span className="text-xs text-gray-500">Cargo</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.cargoLoading || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Container Status</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.containerStatus || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Customs</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.customsStatus || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Seal Number</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.sealNumber || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Condition</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.condition || '—'}</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertCircle className="mb-2 h-8 w-8 opacity-20" />
            <p>No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-medium">Event Type</th>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Cargo</th>
                <th className="px-6 py-3 font-medium">Customs</th>
                <th className="px-6 py-3 font-medium">Condition</th>
                <th className="px-6 py-3 font-medium">Seal</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-blue-50 p-1 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <FileText className="h-3 w-3" />
                      </div>
                      {tx.eventType}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {formatDateTimeForDisplay(tx.timestamp)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {tx.cargoLoading || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {tx.customsStatus || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {tx.condition || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {tx.sealNumber || '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      {tx.status || 'PROCESSED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ContainerCyclesPage;
