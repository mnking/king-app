import React, { useMemo } from 'react';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

/**
 * CONTAINER TRANSACTION AUDIT LOG
 * 
 * Displays detailed audit trail of container moves and handoffs
 * with comprehensive transaction history and status tracking
 */

export type TransactionStatus =
  | 'UNKNOWN'
  | 'ON_VESSEL'
  | 'AT_PORT'
  | 'GATED_IN'
  | 'IN_YARD'
  | 'IN_CFS'
  | 'IN_MR'
  | 'ON_BARGE'
  | 'GATED_OUT'
  | 'IN_CUSTOMS'
  | 'SEIZED';

export type ServiceEventType =
  | 'GATE_IN'
  | 'GATE_OUT'
  | 'LOAD_VESSEL'
  | 'DISCHARGE_VESSEL'
  | 'CFS_MOVE'
  | 'CFS_OUT'
  | 'IN_CUSTOMS'
  | 'SEIZED'
  | 'M_R_MOVE'
  | 'BARGE_MOVE'
  | string;

export type CargoLoadingStatus = 'EMPTY' | 'FULL' | 'PARTIAL' | '';

export interface ContainerSnapshot {
  id: string;
  number: string;
  containerTypeCode: string;
  size: string;
}

export interface ContainerType {
  id: string | null;
  code: string;
  size: string;
  description: string;
}

export interface ContainerTransaction {
  id: string;
  containerId: string;
  containerNumber: string;
  containerSnapshot: ContainerSnapshot;
  containerType: ContainerType;
  containerTypeCode: string;
  cargoLoading: CargoLoadingStatus;
  condition: string;
  customsStatus: string;
  cycleId: string;
  eventType: ServiceEventType;
  sealNumber: string | null;
  status: TransactionStatus;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

interface ContainerTransactionAuditProps {
  transactions: ContainerTransaction[];
  formatTimestamp?: (value?: string) => string;
}

/**
 * Event type labels and colors for visual differentiation
 */
const eventTypeLabels: Record<ServiceEventType, string> = {
  GATE_IN: 'Gate In',
  GATE_OUT: 'Gate Out',
  LOAD_VESSEL: 'Load Vessel',
  DISCHARGE_VESSEL: 'Discharge Vessel',
  CFS_MOVE: 'CFS Move',
  CFS_OUT: 'CFS Out',
  IN_CUSTOMS: 'In Customs',
  SEIZED: 'Seized',
  M_R_MOVE: 'M&R Move',
  BARGE_MOVE: 'Barge Move',
};

const getEventTypeColor = (eventType: ServiceEventType): string => {
  switch (eventType) {
    case 'GATE_IN':
      return 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-200';
    case 'GATE_OUT':
      return 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-200';
    case 'LOAD_VESSEL':
    case 'DISCHARGE_VESSEL':
      return 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-900/40 dark:border-purple-600 dark:text-purple-200';
    case 'CFS_MOVE':
    case 'CFS_OUT':
      return 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-200';
    case 'M_R_MOVE':
      return 'bg-cyan-100 border-cyan-400 text-cyan-800 dark:bg-cyan-900/40 dark:border-cyan-600 dark:text-cyan-200';
    case 'BARGE_MOVE':
      return 'bg-indigo-100 border-indigo-400 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-600 dark:text-indigo-200';
    case 'IN_CUSTOMS':
      return 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/40 dark:border-orange-600 dark:text-orange-200';
    case 'SEIZED':
      return 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-600 dark:text-red-200';
    default:
      return 'bg-gray-100 border-gray-400 text-gray-800 dark:bg-gray-900/40 dark:border-gray-600 dark:text-gray-200';
  }
};

const getStatusBadgeColor = (status: TransactionStatus): string => {
  switch (status) {
    case 'GATED_IN':
      return 'bg-blue-500';
    case 'IN_YARD':
      return 'bg-amber-500';
    case 'IN_CFS':
      return 'bg-purple-500';
    case 'GATED_OUT':
      return 'bg-emerald-500';
    case 'IN_CUSTOMS':
      return 'bg-orange-500';
    case 'SEIZED':
      return 'bg-red-500';
    case 'ON_VESSEL':
      return 'bg-blue-600';
    case 'AT_PORT':
      return 'bg-teal-500';
    case 'IN_MR':
      return 'bg-cyan-500';
    case 'ON_BARGE':
      return 'bg-indigo-500';
    default:
      return 'bg-gray-500';
  }
};

const getCargoLoadingBadgeColor = (cargoLoading: CargoLoadingStatus): string => {
  switch (cargoLoading) {
    case 'FULL':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    case 'EMPTY':
      return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'PARTIAL':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const statusLabels: Record<TransactionStatus, string> = {
  UNKNOWN: 'Unknown',
  ON_VESSEL: 'On Vessel',
  AT_PORT: 'At Port',
  GATED_IN: 'Gated In',
  IN_YARD: 'In Yard',
  IN_CFS: 'In CFS',
  IN_MR: 'In M&R',
  ON_BARGE: 'On Barge',
  GATED_OUT: 'Gated Out',
  IN_CUSTOMS: 'In Customs',
  SEIZED: 'Seized',
};

const ContainerTransactionAudit: React.FC<ContainerTransactionAuditProps> = ({
  transactions,
  formatTimestamp,
}) => {
  const defaultFormatTimestamp = (value?: string): string => formatDateTimeForDisplay(value);

  const formatter = formatTimestamp || defaultFormatTimestamp;

  // Group transactions by container number and cycle ID
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, ContainerTransaction[]>();
    
    [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .forEach(transaction => {
        const key = `${transaction.containerNumber}|${transaction.cycleId}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(transaction);
      });
    
    return Array.from(groups.values());
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        No transactions recorded
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            Transaction Audit Log
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {/* Grouped Transactions */}
      <div className="flex flex-col gap-6">
        {groupedTransactions.map((group) => {
          const firstTx = group[0];
          const containerNumber = firstTx.containerNumber;
          const cycleId = firstTx.cycleId;

          return (
            <div key={`${containerNumber}-${cycleId}`} className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-900">
              {/* Container Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Container
                    </div>
                    <div className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {containerNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Cycle ID
                    </div>
                    <div className="text-xs font-mono text-gray-700 dark:text-gray-300 mt-1 truncate">
                      {cycleId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Transactions
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {group.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  <div>Event</div>
                  <div>Timestamp</div>
                  <div>Status</div>
                  <div>Details</div>
                </div>

                {/* Table Rows */}
                {group.map((transaction) => {
                  const eventLabel = eventTypeLabels[transaction.eventType] || transaction.eventType;
                  const eventColor = getEventTypeColor(transaction.eventType);
                  const statusColor = getStatusBadgeColor(transaction.status);

                  return (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-4 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors items-center"
                    >
                      {/* Event Badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${eventColor}`}
                        >
                          {eventLabel}
                        </div>
                        {transaction.sealNumber && (
                          <svg
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            title="Container Sealed"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                        {formatter(transaction.timestamp)}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center">
                        <div
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white whitespace-nowrap ${statusColor}`}
                        >
                          {statusLabels[transaction.status]}
                        </div>
                      </div>

                      {/* Details Indicators */}
                      <div className="flex items-center gap-2">
                        {transaction.cargoLoading && (
                          <div
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${getCargoLoadingBadgeColor(transaction.cargoLoading)}`}
                          >
                            {transaction.cargoLoading}
                          </div>
                        )}
                        {transaction.condition && (
                          <div className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {transaction.condition}
                          </div>
                        )}
                        {transaction.customsStatus && (
                          <div className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                            {transaction.customsStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        <span>Showing 1 to {Math.min(10, transactions.length)} of {transactions.length} Transactions</span>
      </div>
    </div>
  );
};

export default ContainerTransactionAudit;
