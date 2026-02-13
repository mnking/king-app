import type { EntityColumn } from '@/shared/components/EntityTable';
import { Check, X } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import type {
  EmptyContainerReceivingListItem,
  EmptyContainerReceivingRecord,
} from '../types';

export type EmptyContainerRow = EmptyContainerReceivingListItem;

export const workingResultBadge = (
  status: EmptyContainerReceivingRecord['workingResultStatus'] | null,
) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (status) {
    case 'waiting':
      return `${base} bg-amber-100 text-amber-800`;
    case 'rejected':
      return `${base} bg-rose-100 text-rose-800`;
    case 'received':
      return `${base} bg-emerald-100 text-emerald-800`;
    case null:
      return `${base} bg-slate-100 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
};

export const customsBadge = (getIn: boolean) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (getIn) {
    return `${base} bg-blue-100 text-blue-800`;
  }
  return `${base} bg-rose-100 text-rose-800`;
};

export const filterFields = [
  {
    type: 'select' as const,
    name: 'workingResultStatus',
    label: 'Working Result Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'waiting', label: 'Waiting' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'received', label: 'Received' },
    ],
    keyField: 'value' as const,
    valueField: 'label' as const,
    placeholder: 'All statuses',
  },
];

export const getReceiveEmptyContainerColumns = (): EntityColumn<EmptyContainerRow>[] => [
  {
    key: 'workingResultStatus',
    label: 'Working Result Status',
    render: (item) => (
      <span className={workingResultBadge(item.workingResultStatus)}>
        {item.workingResultStatus ?? 'N/A'}
      </span>
    ),
  },
  {
    key: 'getInEmptyContainerStatus',
    label: 'Get-in (Customs) Status',
    render: (item) => (
      <span className={customsBadge(item.getInEmptyContainerStatus)}>
        {item.getInEmptyContainerStatus ? (
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
    key: 'receiveTime',
    label: 'Receive Time',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {formatDateTime(item.receiveTime)}
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
    key: 'estimatedStuffingTime',
    label: 'Estimated Stuffing Time',
    render: (item) => (
      <span className="text-gray-700 dark:text-gray-200">
        {formatDateTime(item.estimatedStuffingTime)}
      </span>
    ),
  },
];
