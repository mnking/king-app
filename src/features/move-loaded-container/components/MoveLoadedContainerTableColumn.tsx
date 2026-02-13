import type { EntityColumn } from '@/shared/components/EntityTable';
import { formatDateTime } from '@/shared/utils/date-format';
import type {
  StuffedContainerMoveOutListItem,
  StuffedMoveWorkingResultStatus,
} from '../types';
import { Check, X } from 'lucide-react';

export type MoveLoadedContainerRow = StuffedContainerMoveOutListItem;

export const workingResultBadge = (
  status: StuffedMoveWorkingResultStatus,
) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (status) {
    case 'received':
      return `${base} bg-amber-100 text-amber-800`;
    case 'moved':
      return `${base} bg-emerald-100 text-emerald-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
};

export const customsBadge = (getOut: boolean) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (getOut) {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  return `${base} bg-amber-100 text-amber-800`;
};

export const filterFields = [
  {
    type: 'select' as const,
    name: 'workingResultStatus',
    label: 'Working Result Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'received', label: 'Waiting' },
      { value: 'moved', label: 'Moved' },
    ],
    keyField: 'value' as const,
    valueField: 'label' as const,
    placeholder: 'All statuses',
  },
];

export const getMoveLoadedContainerColumns = (): EntityColumn<MoveLoadedContainerRow>[] => [
  {
    key: 'workingResultStatus',
    label: 'Working Result Status',
    render: (item) => (
      <span className={workingResultBadge(item.workingResultStatus)}>
        {item.workingResultStatus === 'received' ? 'WAITING' : item.workingResultStatus.toUpperCase()}
      </span>
    ),
  },
  {
    key: 'getOutContainerStatus',
    label: 'Get-out (Customs) Status',
    render: (item) => (
      <span className={customsBadge(item.getOutContainerStatus)}>
        {item.getOutContainerStatus ? (
          <>
            <Check className="mr-1 h-3.5 w-3.5" />
            YES
          </>
        ) : (
          <>
            <X className="mr-1 h-3.5 w-3.5" />
            NO
          </>
        )}
      </span>
    ),
  },
  {
    key: 'estimateMoveTime',
    label: 'Estimated Move Time',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {formatDateTime(item.estimateMoveTime)}
      </span>
    ),
  },
  {
    key: 'etd',
    label: 'ETD',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {formatDateTime(item.etd)}
      </span>
    ),
  },
  {
    key: 'actualMoveTime',
    label: 'Actual Move Time',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {formatDateTime(item.actualMoveTime)}
      </span>
    ),
  },
  {
    key: 'container',
    label: 'Container',
    render: (item) => (
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">
          {item.containerNumber}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {item.containerTypeCode}
          {item.containerSize ? ` (${item.containerSize})` : ''}
        </div>
      </div>
    ),
    searchable: true,
  },
  {
    key: 'planStuffingNumber',
    label: 'Plan Stuffing Number',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {item.planStuffingNumber}
      </span>
    ),
    searchable: true,
  },
  {
    key: 'forwarder',
    label: 'Forwarder',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {item.forwarder || '—'}
      </span>
    ),
  },
];
