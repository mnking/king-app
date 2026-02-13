import React from 'react';
import {
  Package,
  Clock,
  PauseCircle,
  XCircle,
  AlertTriangle,
  FileText,
  CheckCircle,
  StickyNote,
} from 'lucide-react';
import type { PlanContainer } from '@/shared/features/plan/types';
import {
  formatSingleDateTime,
  getContainerTypeCode,
} from '@/shared/features/plan/utils/plan-display-helpers';
import type { ExecutionPlan } from '../hooks/use-plan-execution';
import { getNotePreview } from '../helpers/plan-execution-helpers';
import type { ActionType, ExecutionContainer } from '../helpers/ReceiveExecutionHelpers';
import { getOrderCode, getHblNumbers } from '../helpers/ReceiveExecutionHelpers';
import {
  MobileActionMenu,
  SplitActionButton,
  SplitRejectButton,
} from './ReceiveExecutionActions';

const ContainerInfoSection: React.FC<{
  container: ExecutionContainer;
  typeCode: string | null;
  orderCode: string | null;
  hblNumbers: string[];
}> = ({ container, typeCode, orderCode, hblNumbers }) => {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <Package className="h-5 w-5 text-blue-500 dark:text-blue-300" />
          {container.orderContainer.containerNo}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
          Type: {typeCode ?? 'N/A'}
        </span>
        {container.orderContainer.sealNumber ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Seal: {container.orderContainer.sealNumber}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
        <span>Order: {orderCode ?? 'N/A'}</span>
        {container.orderContainer.mblNumber ? (
          <span>• MBL: {container.orderContainer.mblNumber}</span>
        ) : null}
        {hblNumbers.length > 0 ? (
          <span>• HBL: {hblNumbers.join(', ')}</span>
        ) : null}
      </div>
    </>
  );
};

export const WaitingContainerRow: React.FC<{
  container: ExecutionContainer;
  onAction: (type: ActionType, container: ExecutionContainer) => void;
}> = ({ container, onAction }) => {
  const typeCode = getContainerTypeCode({
    ...container,
    orderContainer: container.orderContainer,
  } as ExecutionPlan['containers'][number]);

  const hasProblemSummary = Boolean(container.summary?.problem);
  const hasAdjustedSummary = Boolean(container.summary?.adjustedDocument);
  const status = container.status;

  const statusVisuals: Record<
    Extract<PlanContainer['status'], 'WAITING' | 'DEFERRED' | 'REJECTED'>,
    {
      label: string;
      container: string;
      chip: string;
      icon: React.ElementType;
      iconClass: string;
    }
  > = {
    WAITING: {
      label: 'Waiting',
      container: 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
      chip: 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
      icon: Clock,
      iconClass: 'h-3.5 w-3.5 text-gray-500 dark:text-gray-300',
    },
    DEFERRED: {
      label: 'Deferred',
      container: 'border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30',
      chip: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
      icon: PauseCircle,
      iconClass: 'h-3.5 w-3.5 text-amber-600 dark:text-amber-300',
    },
    REJECTED: {
      label: 'Rejected',
      container: 'border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30',
      chip: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200',
      icon: XCircle,
      iconClass: 'h-3.5 w-3.5 text-red-600 dark:text-red-300',
    },
  };

  const statusVisual = statusVisuals[status as keyof typeof statusVisuals];
  const orderCode = getOrderCode(container);
  const hblNumbers = getHblNumbers(container);
  const Icon = statusVisual?.icon ?? Clock;
  const iconClassName =
    statusVisual?.iconClass ?? 'h-3.5 w-3.5 text-gray-500';

  const containerClasses = [
    'relative rounded-xl p-4 shadow-sm transition hover:border-blue-200 dark:hover:border-blue-500',
    statusVisual?.container ?? 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
  ].join(' ');
  const statusChipClasses = statusVisual?.chip ?? 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
  const statusLabel = statusVisual?.label ?? 'Waiting';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <ContainerInfoSection
            container={container}
            typeCode={typeCode}
            orderCode={orderCode}
            hblNumbers={hblNumbers}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusChipClasses}`}>
              <Icon className={iconClassName} />
              {statusLabel}
            </span>
            {hasProblemSummary ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Problem logged
              </span>
            ) : null}
            {hasAdjustedSummary ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <FileText className="h-3.5 w-3.5" />
                Adjusted doc pending
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <MobileActionMenu
            onSelect={(type) => onAction(type, container)}
            className="md:hidden"
            showDefer={true}
          />
          <div className="hidden items-center gap-3 self-start md:flex">
            <SplitActionButton
              onReceive={() => onAction('receive', container)}
              onProblem={() => onAction('problem', container)}
              onAdjusted={() => onAction('adjusted', container)}
            />
            <SplitRejectButton
              onReject={() => onAction('reject', container)}
              onDefer={() => onAction('defer', container)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReceivedContainerRow: React.FC<{
  container: ExecutionContainer;
  onViewReceive?: (container: ExecutionContainer) => void;
  onViewProblem?: (container: ExecutionContainer) => void;
  onViewAdjusted?: (container: ExecutionContainer) => void;
}> = ({ container, onViewReceive, onViewProblem, onViewAdjusted }) => {
  const typeCode = getContainerTypeCode({
    ...container,
    orderContainer: container.orderContainer,
  } as ExecutionPlan['containers'][number]);
  const orderCode = getOrderCode(container);
  const hblNumbers = getHblNumbers(container);

  const hasProblemSummary = Boolean(container.summary?.problem);
  const hasAdjustedSummary = Boolean(container.summary?.adjustedDocument);

  const receivedClasses = 'rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-700 dark:bg-green-900/30';
  const receivedChipClasses =
    'inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-semibold text-green-700 dark:border-green-700 dark:bg-gray-900 dark:text-green-200';

  const normalNotePreview =
    container.receivedType === 'NORMAL' ? getNotePreview(container.notes) : '';
  const problemPreview = hasProblemSummary
    ? getNotePreview(container.summary?.problem?.notes)
    : '';
  const adjustedPreview = hasAdjustedSummary
    ? getNotePreview(container.summary?.adjustedDocument?.notes)
    : '';

  return (
    <div className={receivedClasses}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <ContainerInfoSection
            container={container}
            typeCode={typeCode}
            orderCode={orderCode}
            hblNumbers={hblNumbers}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
            <span>Processed by: {container.lastActionUser ?? 'Current Operator'}</span>
            {container.lastActionAt ? (
              <span>
                • At: {formatSingleDateTime(container.lastActionAt)}
              </span>
            ) : null}
            {container.truckNo ? <span>• Truck: {container.truckNo}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onViewReceive?.(container)}
              className={`${receivedChipClasses} cursor-pointer transition hover:bg-green-50`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Received
            </button>
            {hasProblemSummary ? (
              <button
                type="button"
                onClick={() => onViewProblem?.(container)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Problem logged
              </button>
            ) : null}
            {hasAdjustedSummary ? (
              <button
                type="button"
                onClick={() => onViewAdjusted?.(container)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
              >
                <FileText className="h-3.5 w-3.5" />
                Adjusted doc
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200 md:ml-auto md:max-w-md md:self-stretch">
          {normalNotePreview ? (
            <p className="flex items-start gap-2">
              <StickyNote className="mt-0.5 h-4 w-4 text-gray-400 dark:text-gray-300" />
              <span>{normalNotePreview}</span>
            </p>
          ) : null}
          {problemPreview ? (
            <p className="flex items-start gap-2 text-amber-700 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 dark:text-amber-300" />
              <span>{problemPreview}</span>
            </p>
          ) : null}
          {adjustedPreview ? (
            <p className="flex items-start gap-2 text-blue-700 dark:text-blue-200">
              <FileText className="mt-0.5 h-4 w-4 text-blue-500 dark:text-blue-300" />
              <span>{adjustedPreview}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
