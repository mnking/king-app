import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  MapPin,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { formatDate, formatDateTime } from '@/shared/utils/date-format';
import {
  fromDateTimeLocalFormat,
  toDateTimeLocalFormat,
} from '@/shared/utils/dateTimeUtils';
import type { EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import type { CargoReleaseStatus } from '@/shared/constants/container-status';
import type {
  CustomsCfsImportRequestType,
  CustomsDeclarationEventAckResponse,
  CustomsImportSubmissionStatusResponse,
} from '@/services/apiCFS';
import {
  CUSTOMS_REQUEST_STATUS_LABELS,
  POSITION_STATUS_LABELS,
  type CustomsRequestStatus,
  type ContainerPositionStatus,
} from '../types/container-receiving-types';

type ContainerReceivingDetailModalProps = {
  open: boolean;
  container: (EnrichedUnplannedContainer & {
    customsRequestStatus?: CustomsRequestStatus | null;
    containerStatus?: string | null;
  }) | null;
  onClose: () => void;
  onUpdatePosition: (
    containerId: string,
    status: ContainerPositionStatus,
    bookingOrderId: string | null,
    ata: string,
  ) => Promise<boolean>;
  onUpdateCargoRelease: (
    container: EnrichedUnplannedContainer,
    status: CargoReleaseStatus,
  ) => Promise<void>;
  bookingOrderContainerId: string | null;
  onSubmitCustomsRequest: (
    bookingOrderContainerId: string,
    status: Extract<CustomsRequestStatus, 'IDENTIFIED' | 'GOT_IN'>,
  ) => Promise<CustomsDeclarationEventAckResponse>;
  onGetCustomsSubmissionStatus: (
    bookingOrderContainerId: string,
    requestType: CustomsCfsImportRequestType,
  ) => Promise<CustomsImportSubmissionStatusResponse>;
  customsStatus: CustomsRequestStatus;
  isSavingPosition?: boolean;
  isSavingCargoRelease?: boolean;
  canWrite?: boolean;
};

const normalizePositionStatus = (
  status?: string | null,
): ContainerPositionStatus => {
  if (!status) return 'UNKNOWN';
  const normalized = status
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return (normalized in POSITION_STATUS_LABELS
    ? (normalized as ContainerPositionStatus)
    : 'UNKNOWN');
};

const formatSummaryDate = (summary: unknown, key: string) => {
  if (!summary || typeof summary !== 'object') return '—';
  const value = (summary as Record<string, unknown>)[key];
  if (typeof value !== 'string') return '—';
  return formatDate(value);
};

const getCurrentDateTimeLocal = (): string => toDateTimeLocalFormat(new Date().toISOString());

const formatResultValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() ? value : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const formatResultDateTime = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '—';
  return formatDateTime(value);
};

const getRawSubmissionValue = (
  submissionStatus: CustomsImportSubmissionStatusResponse,
  key: string,
): unknown => {
  const rawResponse = submissionStatus.rawResponse;
  if (!rawResponse || typeof rawResponse !== 'object') return undefined;
  return (rawResponse as Record<string, unknown>)[key];
};

const getRawEntryValues = (
  submissionStatus: CustomsImportSubmissionStatusResponse,
  field: 'packageIdentifier' | 'billOfLadingNumber',
): string => {
  const entries = getRawSubmissionValue(submissionStatus, 'entries');
  if (!Array.isArray(entries)) return '—';

  const values = entries
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object',
    )
    .map((entry) => formatResultValue(entry[field]))
    .filter((value) => value !== '—');

  return values.length > 0 ? values.join(', ') : '—';
};

const getResultStatusBadgeClasses = (status?: string | null) => {
  const normalized = (status ?? '').trim().toLowerCase();
  if (
    normalized === 'accepted' ||
    normalized === 'cleared' ||
    normalized === 'approved' ||
    normalized === 'success'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
  }
  if (
    normalized === 'pending' ||
    normalized === 'processing' ||
    normalized === 'queued'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
  }
  if (
    normalized === 'rejected' ||
    normalized === 'failed' ||
    normalized === 'error' ||
    normalized === 'denied'
  ) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200';
};

const ResultField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-gray-100">
      {value}
    </p>
  </div>
);

const statusBadgeClasses: Record<ContainerPositionStatus, string> = {
  UNKNOWN:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  AT_PORT:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  IN_YARD:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  IN_CFS:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  GATED_IN:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  GATED_OUT:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  ON_VESSEL:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  ON_BARGE:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
  IN_CUSTOMS:
    'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-900/30 dark:text-pink-200',
  IN_MR:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
  SEIZED:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200',
};

const customsBadgeClasses: Record<CustomsRequestStatus, string> = {
  UNIDENTIFIED:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  IDENTIFIED:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  GOT_IN:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  DESTUFF_APPROVED:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
};

type CustomsWorkflowStatus = Extract<
  CustomsRequestStatus,
  'IDENTIFIED' | 'GOT_IN' | 'DESTUFF_APPROVED'
>;

type CustomsSubmitAction = Extract<CustomsRequestStatus, 'IDENTIFIED' | 'GOT_IN'>;

const CUSTOMS_REQUEST_TYPE_BY_ACTION: Record<
  CustomsSubmitAction,
  CustomsCfsImportRequestType
> = {
  IDENTIFIED: 'CFS_IMPORT_IDENTIFICATION',
  GOT_IN: 'CFS_IMPORT_GET_IN',
};

const isCustomsSubmitAction = (
  status: CustomsRequestStatus,
): status is CustomsSubmitAction =>
  status === 'IDENTIFIED' || status === 'GOT_IN';

const CUSTOMS_WORKFLOW_CARDS: Array<{
  status: CustomsWorkflowStatus;
  step: number;
  description: string;
  submitAvailable: boolean;
  getStatusAvailable: boolean;
  unavailableHint?: string;
}> = [
  {
    status: 'IDENTIFIED',
    step: 1,
    description: 'Submit identification request to customs (566HC).',
    submitAvailable: true,
    getStatusAvailable: true,
  },
  {
    status: 'GOT_IN',
    step: 2,
    description: 'Submit get-in request when container is ready at warehouse (266).',
    submitAvailable: true,
    getStatusAvailable: true,
  },
];

export const ContainerReceivingDetailModal: React.FC<
  ContainerReceivingDetailModalProps
> = ({
  open,
  container,
  onClose,
  onUpdatePosition,
  onUpdateCargoRelease,
  bookingOrderContainerId,
  onSubmitCustomsRequest,
  onGetCustomsSubmissionStatus,
  customsStatus,
  isSavingPosition = false,
  isSavingCargoRelease = false,
  canWrite = true,
}) => {
  const previousContainerIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);
  const [positionStatus, setPositionStatus] = useState<ContainerPositionStatus>('UNKNOWN');
  const [ataDateTime, setAtaDateTime] = useState<string>(() => getCurrentDateTimeLocal());
  const [cargoReleaseStatus, setCargoReleaseStatus] = useState<CargoReleaseStatus>('NOT_REQUESTED');
  const [savedCargoReleaseStatus, setSavedCargoReleaseStatus] = useState<CargoReleaseStatus>('NOT_REQUESTED');
  const [submitResults, setSubmitResults] = useState<
    Partial<Record<CustomsWorkflowStatus, CustomsDeclarationEventAckResponse>>
  >({});
  const [submitErrors, setSubmitErrors] = useState<
    Partial<Record<CustomsWorkflowStatus, string>>
  >({});
  const [statusResults, setStatusResults] = useState<
    Partial<Record<CustomsWorkflowStatus, CustomsImportSubmissionStatusResponse>>
  >({});
  const [statusErrors, setStatusErrors] = useState<
    Partial<Record<CustomsWorkflowStatus, string>>
  >({});
  const [submittingActions, setSubmittingActions] = useState<
    Partial<Record<CustomsWorkflowStatus, boolean>>
  >({});
  const [fetchingStatusActions, setFetchingStatusActions] = useState<
    Partial<Record<CustomsWorkflowStatus, boolean>>
  >({});

  useEffect(() => {
    if (!open || !container) {
      wasOpenRef.current = false;
      previousContainerIdRef.current = null;
      return;
    }

    const isOpening = !wasOpenRef.current;
    const isContainerChanged = previousContainerIdRef.current !== container.id;

    setPositionStatus(normalizePositionStatus(container.containerStatus));
    const initialCargoReleaseStatus = container.cargoReleaseStatus ?? 'NOT_REQUESTED';
    setCargoReleaseStatus(initialCargoReleaseStatus);
    setSavedCargoReleaseStatus(initialCargoReleaseStatus);

    if (isOpening || isContainerChanged) {
      setAtaDateTime(getCurrentDateTimeLocal());
      setSubmitResults({});
      setSubmitErrors({});
      setStatusResults({});
      setStatusErrors({});
      setSubmittingActions({});
      setFetchingStatusActions({});
    }

    wasOpenRef.current = true;
    previousContainerIdRef.current = container.id;
  }, [open, container]);

  const allowedCargoReleaseStatuses = useMemo(() => {
    const current = savedCargoReleaseStatus ?? 'NOT_REQUESTED';
    if (current === 'REQUESTED') return ['REQUESTED', 'APPROVED'];
    if (current === 'APPROVED') return ['APPROVED'];
    return ['NOT_REQUESTED', 'REQUESTED', 'APPROVED'];
  }, [savedCargoReleaseStatus]);

  const isDestuffApproved = savedCargoReleaseStatus === 'APPROVED';
  const hasCargoReleaseStatusChanges = cargoReleaseStatus !== savedCargoReleaseStatus;

  const handleSubmitCustomsAction = async (status: CustomsSubmitAction) => {
    if (!bookingOrderContainerId) {
      setSubmitErrors((prev) => ({
        ...prev,
        [status]: 'Missing booking order container ID.',
      }));
      return;
    }

    setSubmittingActions((prev) => ({ ...prev, [status]: true }));
    setSubmitErrors((prev) => ({ ...prev, [status]: undefined }));
    setStatusResults((prev) => ({ ...prev, [status]: undefined }));
    setStatusErrors((prev) => ({ ...prev, [status]: undefined }));

    try {
      const result = await onSubmitCustomsRequest(bookingOrderContainerId, status);
      setSubmitResults((prev) => ({ ...prev, [status]: result }));
    } catch (error) {
      setSubmitErrors((prev) => ({
        ...prev,
        [status]: error instanceof Error ? error.message : 'Failed to submit request.',
      }));
    } finally {
      setSubmittingActions((prev) => ({ ...prev, [status]: false }));
    }
  };

  const handleGetSubmissionStatus = async (status: CustomsSubmitAction) => {
    if (!bookingOrderContainerId) {
      setStatusErrors((prev) => ({
        ...prev,
        [status]: 'Missing booking order container ID.',
      }));
      return;
    }

    setFetchingStatusActions((prev) => ({ ...prev, [status]: true }));
    setStatusErrors((prev) => ({ ...prev, [status]: undefined }));

    try {
      const result = await onGetCustomsSubmissionStatus(
        bookingOrderContainerId,
        CUSTOMS_REQUEST_TYPE_BY_ACTION[status],
      );
      setStatusResults((prev) => ({ ...prev, [status]: result }));
    } catch (error) {
      setStatusErrors((prev) => ({
        ...prev,
        [status]: error instanceof Error ? error.message : 'Failed to fetch status.',
      }));
    } finally {
      setFetchingStatusActions((prev) => ({ ...prev, [status]: false }));
    }
  };

  const info = useMemo(() => {
    if (!container) {
      return {
        typeCode: '—',
        orderCode: '—',
        eta: '—',
        ata: '—',
        agent: '—',
        vessel: '—',
        voyage: '—',
        pol: '—',
        pod: '—',
      };
    }
    const firstHbl = container.hbls?.[0]?.summary;
    const etaValue = container.eta ?? container.bookingOrder?.eta ?? null;
    const ataValue = container.bookingOrder?.ata ?? formatSummaryDate(container.summary, 'ata');
    return {
      typeCode:
        container.summary?.typeCode ??
        container.enrichedHbls?.find((hbl) => hbl.containerTypeCode)?.containerTypeCode ??
        '—',
      orderCode: container.bookingOrder?.code ?? container.orderCode ?? '—',
      eta: formatDate(etaValue),
      ata: formatDate(ataValue),
      agent: container.bookingOrder?.agentCode ?? container.bookingOrder?.agentId ?? '—',
      vessel: container.bookingOrder?.vesselCode ?? firstHbl?.vesselName ?? '—',
      voyage: container.bookingOrder?.voyage ?? firstHbl?.voyageNumber ?? '—',
      pol: firstHbl?.pol ?? '—',
      pod: firstHbl?.pod ?? '—',
    };
  }, [container]);

  const canDischarge = positionStatus === 'UNKNOWN';
  const canStore = positionStatus === 'UNKNOWN' || positionStatus === 'AT_PORT';

  if (!open || !container) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Container details
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Review container information and update receiving statuses.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Truck className="h-4 w-4 text-blue-500" />
                Container information
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Container
                  </p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {container.containerNo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Type
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.typeCode}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Seal
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {container.sealNumber ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Agent
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.agent}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    ETA
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.eta}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    ATA
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.ata}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Vessel
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.vessel}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Voyage
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.voyage}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    PoL
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.pol}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    PoD
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.pod}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Order Code
                  </p>
                  <p className="text-base text-gray-900 dark:text-white">{info.orderCode}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <MapPin className="h-4 w-4 text-blue-500" />
                Container position status
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClasses[positionStatus]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {POSITION_STATUS_LABELS[positionStatus]}
                </span>
                {positionStatus === 'IN_CFS' ? (
                  <span className="text-xs text-blue-600 dark:text-blue-300">
                    Set automatically on receive
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <label
                  htmlFor="container-position-ata"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  ATA (Actual Time Arrival)
                </label>
                <input
                  id="container-position-ata"
                  type="datetime-local"
                  value={ataDateTime}
                  onChange={(event) => setAtaDateTime(event.target.value)}
                  disabled={!canWrite || isSavingPosition}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!canWrite || !canDischarge || isSavingPosition || !ataDateTime}
                  loading={isSavingPosition}
                  onClick={async () => {
                    const success = await onUpdatePosition(
                      container.id,
                      'AT_PORT',
                      container.orderId ?? null,
                      fromDateTimeLocalFormat(ataDateTime),
                    );
                    if (success) {
                      setPositionStatus('AT_PORT');
                    }
                  }}
                >
                  Mark Discharged
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canWrite || !canStore || isSavingPosition || !ataDateTime}
                  loading={isSavingPosition}
                  onClick={async () => {
                    const success = await onUpdatePosition(
                      container.id,
                      'IN_YARD',
                      container.orderId ?? null,
                      fromDateTimeLocalFormat(ataDateTime),
                    );
                    if (success) {
                      setPositionStatus('IN_YARD');
                    }
                  }}
                >
                  Mark Stored
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Position flow: no status → discharged → stored.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                Destuff request status
              </div>
              <select
                value={cargoReleaseStatus}
                onChange={(event) =>
                  setCargoReleaseStatus(event.target.value as CargoReleaseStatus)
                }
                disabled={!canWrite || isSavingCargoRelease || isDestuffApproved}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option
                  value="NOT_REQUESTED"
                  disabled={!allowedCargoReleaseStatuses.includes('NOT_REQUESTED')}
                >
                  Not requested
                </option>
                <option
                  value="REQUESTED"
                  disabled={!allowedCargoReleaseStatuses.includes('REQUESTED')}
                >
                  Pending
                </option>
                <option
                  value="APPROVED"
                  disabled={!allowedCargoReleaseStatuses.includes('APPROVED')}
                >
                  Approved
                </option>
              </select>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={
                    !canWrite ||
                    isSavingCargoRelease ||
                    isDestuffApproved ||
                    !hasCargoReleaseStatusChanges
                  }
                  loading={isSavingCargoRelease}
                  onClick={async () => {
                    await onUpdateCargoRelease(container, cargoReleaseStatus);
                    setSavedCargoReleaseStatus(cargoReleaseStatus);
                  }}
                >
                  Update destuff status
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                Customs Declaration Status
              </div>
              <div className="space-y-3">
                {CUSTOMS_WORKFLOW_CARDS.map((card) => {
                  const status = card.status;
                  const isIdentifiedStep = status === 'IDENTIFIED';
                  const isGotInStep = status === 'GOT_IN';
                  const isSubmitAction = isCustomsSubmitAction(status);
                  const isSubmitting = isSubmitAction ? Boolean(submittingActions[status]) : false;
                  const isFetchingStatus = isSubmitAction
                    ? Boolean(fetchingStatusActions[status])
                    : false;
                  const isActive = customsStatus === status;
                  const submitResult = isSubmitAction ? submitResults[status] : undefined;
                  const submitStatus = submitResult?.status;
                  const submissionStatus = isSubmitAction ? statusResults[status] : undefined;
                  const submitDisabled =
                    isGotInStep ||
                    !card.submitAvailable ||
                    !canWrite ||
                    !bookingOrderContainerId ||
                    isSubmitting;
                  const getStatusDisabled =
                    isGotInStep ||
                    !card.getStatusAvailable ||
                    !canWrite ||
                    !bookingOrderContainerId ||
                    isFetchingStatus;

                  return (
                    <section
                      key={status}
                      data-testid={`customs-workflow-card-${status.toLowerCase()}`}
                      className={`rounded-lg border p-3 ${isActive ? customsBadgeClasses[status] : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/70'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Step {card.step}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {CUSTOMS_REQUEST_STATUS_LABELS[status]}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {card.description}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {isActive ? 'Current' : 'Pending'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          aria-label={`${CUSTOMS_REQUEST_STATUS_LABELS[status]} send request`}
                          loading={isSubmitting}
                          disabled={submitDisabled}
                          onClick={() => {
                            if (!isSubmitAction) return;
                            void handleSubmitCustomsAction(status);
                          }}
                        >
                          Send request
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          aria-label={`${CUSTOMS_REQUEST_STATUS_LABELS[status]} get status`}
                          loading={isFetchingStatus}
                          disabled={getStatusDisabled}
                          onClick={() => {
                            if (!isSubmitAction) return;
                            void handleGetSubmissionStatus(status);
                          }}
                        >
                          Get status
                        </Button>
                      </div>

                      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <section
                          data-testid={`customs-submit-result-${status.toLowerCase()}`}
                          className="space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Submit result
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getResultStatusBadgeClasses(submitStatus)}`}
                            >
                              {submitStatus
                                ? formatResultValue(submitStatus)
                                : card.submitAvailable
                                  ? 'No submission yet'
                                  : 'Not available'}
                            </span>
                          </div>
                          {submitResult ? (
                            isIdentifiedStep ? (
                              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">
                                Identification submission status:{' '}
                                <span className="font-semibold">
                                  {formatResultValue(submitStatus)}
                                </span>
                              </p>
                            ) : (
                              <div className="grid gap-2 md:grid-cols-2">
                                <ResultField
                                  label="Event type"
                                  value={formatResultValue(submitResult.eventType)}
                                />
                                <ResultField
                                  label="Transaction ID"
                                  value={formatResultValue(submitResult.transactionId)}
                                />
                              </div>
                            )
                          ) : (
                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                              {card.submitAvailable
                                ? 'Status updates for the submission request will be shown here.'
                                : 'Submission API is not available for this step.'}
                            </p>
                          )}
                          {submitErrors[status] ? (
                            <p
                              role="alert"
                              className="text-xs font-medium text-red-600 dark:text-red-300"
                            >
                              {submitErrors[status]}
                            </p>
                          ) : null}
                        </section>

                        <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

                        <section
                          data-testid={`customs-check-result-${status.toLowerCase()}`}
                          className="space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Check result
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getResultStatusBadgeClasses(submissionStatus?.status)}`}
                            >
                              {submissionStatus?.status
                                ? formatResultValue(submissionStatus.status)
                                : card.getStatusAvailable
                                  ? 'No status queried'
                                  : 'Not available'}
                            </span>
                          </div>
                          {submissionStatus ? (
                            isIdentifiedStep ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                <ResultField
                                  label="Operation mode"
                                  value={formatResultValue(submissionStatus.operationMode)}
                                />
                                <ResultField
                                  label="State code"
                                  value={formatResultValue(submissionStatus.stateCode)}
                                />
                                <ResultField
                                  label="Request number"
                                  value={formatResultValue(submissionStatus.requestNumber)}
                                />
                                <ResultField
                                  label="Request date"
                                  value={formatResultDateTime(submissionStatus.requestDate)}
                                />
                                <ResultField
                                  label="Raw state code"
                                  value={formatResultValue(
                                    getRawSubmissionValue(submissionStatus, 'stateCode'),
                                  )}
                                />
                                <ResultField
                                  label="Raw request number"
                                  value={formatResultValue(
                                    getRawSubmissionValue(submissionStatus, 'requestNumber'),
                                  )}
                                />
                                <ResultField
                                  label="Raw request date"
                                  value={formatResultDateTime(
                                    getRawSubmissionValue(submissionStatus, 'requestDate'),
                                  )}
                                />
                                <ResultField
                                  label="Package identifier"
                                  value={getRawEntryValues(submissionStatus, 'packageIdentifier')}
                                />
                                <ResultField
                                  label="Bill of lading number"
                                  value={getRawEntryValues(
                                    submissionStatus,
                                    'billOfLadingNumber',
                                  )}
                                />
                                <ResultField
                                  label="Source"
                                  value={formatResultValue(submissionStatus.source)}
                                />
                                <ResultField
                                  label="Refreshed"
                                  value={formatResultValue(submissionStatus.refreshed)}
                                />
                                <ResultField
                                  label="Last updated"
                                  value={formatResultDateTime(submissionStatus.lastUpdated)}
                                />
                                <div className="md:col-span-2">
                                  <ResultField
                                    label="Message"
                                    value={formatResultValue(submissionStatus.message)}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <ResultField
                                    label="Raw message"
                                    value={formatResultValue(
                                      getRawSubmissionValue(submissionStatus, 'message'),
                                    )}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-2 md:grid-cols-2">
                                <ResultField
                                  label="Declaration number"
                                  value={formatResultValue(submissionStatus.declarationNumber)}
                                />
                                <ResultField
                                  label="Event type"
                                  value={formatResultValue(submissionStatus.eventType)}
                                />
                                <ResultField
                                  label="Operation mode"
                                  value={formatResultValue(submissionStatus.operationMode)}
                                />
                                <ResultField
                                  label="Transaction ID"
                                  value={formatResultValue(submissionStatus.transactionId)}
                                />
                                <ResultField
                                  label="State code"
                                  value={formatResultValue(submissionStatus.stateCode)}
                                />
                                <ResultField
                                  label="Request number"
                                  value={formatResultValue(submissionStatus.requestNumber)}
                                />
                                <ResultField
                                  label="Request date"
                                  value={formatResultDateTime(submissionStatus.requestDate)}
                                />
                                <ResultField
                                  label="Last updated"
                                  value={formatResultDateTime(submissionStatus.lastUpdated)}
                                />
                                <ResultField
                                  label="Source"
                                  value={formatResultValue(submissionStatus.source)}
                                />
                                <ResultField
                                  label="Refreshed"
                                  value={formatResultValue(submissionStatus.refreshed)}
                                />
                                <div className="md:col-span-2">
                                  <ResultField
                                    label="Message"
                                    value={formatResultValue(submissionStatus.message)}
                                  />
                                </div>
                              </div>
                            )
                          ) : (
                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                              {card.getStatusAvailable
                                ? 'The latest customs checking result will appear here after clicking Get status.'
                                : 'Status checking API is not available for this step.'}
                            </p>
                          )}
                          {statusErrors[status] ? (
                            <p
                              role="alert"
                              className="text-xs font-medium text-red-600 dark:text-red-300"
                            >
                              {statusErrors[status]}
                            </p>
                          ) : null}
                        </section>

                        {card.unavailableHint ? (
                          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            {card.unavailableHint}
                          </p>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContainerReceivingDetailModal;
