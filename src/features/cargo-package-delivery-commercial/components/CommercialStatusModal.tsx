import React, { useEffect, useMemo, useRef } from 'react';
import type { HouseBill } from '@/features/hbl-management/types';
import type { PackingListLineResponseDto } from '@/features/packing-list/types';
import { Button } from '@/shared/components/ui/Button';
import StatusPill from './StatusPill';
import { Loader2, Save } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  hbl: HouseBill;
  lockedPaid: boolean;
  lockedDelivery: boolean;
  modalPaid: boolean;
  modalDeliveryAllowed: boolean;
  modalDeliveryDate: string;
  setModalPaid: (value: boolean) => void;
  setModalDeliveryAllowed: (value: boolean) => void;
  setModalDeliveryDate: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveDisabled: boolean;
  canWrite: boolean;
  forwarderDisplay: string;
  packingListLines?: PackingListLineResponseDto[];
  packingListLinesLoading?: boolean;
  packingListLinesError?: string | null;
};

export const CommercialStatusModal: React.FC<Props> = ({
  open,
  onClose,
  hbl,
  lockedPaid,
  lockedDelivery,
  modalPaid,
  modalDeliveryAllowed,
  modalDeliveryDate,
  setModalPaid,
  setModalDeliveryAllowed,
  setModalDeliveryDate,
  onSave,
  isSaving,
  saveDisabled,
  canWrite,
  forwarderDisplay,
  packingListLines = [],
  packingListLinesLoading = false,
  packingListLinesError = null,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusableItems = useMemo(
    () => ['button', '[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'],
    [],
  );

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableItems.join(',')),
      ).filter((el) => !el.hasAttribute('disabled'));

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          event.preventDefault();
        }
      } else if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusableItems, onClose, open]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  const readOnly = !canWrite;
  const effectiveSaveDisabled = saveDisabled || readOnly;
  const toLineNumber = (value: unknown): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  const formatFixedDisplay = (
    value: number | string | null | undefined,
    fractionDigits: number,
  ): string => {
    if (value === null || value === undefined) return '—';
    const numericValue = toLineNumber(value);
    return numericValue.toFixed(fractionDigits);
  };
  const primaryContainer = hbl.containers?.[0];
  const packingListNumber = hbl.packingList?.packingListNumber ?? hbl.packingListNumber ?? '—';
  const packingListStatus = hbl.packingList?.status ?? hbl.packingListStatus ?? '—';
  const resolvedPackingListLines = packingListLines.length
    ? packingListLines
    : hbl.packingListLines ?? [];
  const derivedPackageCount = resolvedPackingListLines.length
    ? resolvedPackingListLines.reduce(
        (total, line) => total + toLineNumber(line.numberOfPackages),
        0,
      )
    : undefined;
  const derivedCargoWeight = resolvedPackingListLines.length
    ? resolvedPackingListLines.reduce(
        (total, line) => total + toLineNumber(line.grossWeightKg),
        0,
      )
    : undefined;
  const derivedVolume = resolvedPackingListLines.length
    ? resolvedPackingListLines.reduce(
        (total, line) => total + toLineNumber(line.volumeM3),
        0,
      )
    : undefined;
  const derivedPackageTypes = Array.from(
    new Set(
      resolvedPackingListLines
        .map((line) => line.packageTypeCode)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const derivedPackageType =
    derivedPackageTypes.length > 1
      ? derivedPackageTypes.join(', ')
      : derivedPackageTypes[0];
  const derivedCargoDescriptions = Array.from(
    new Set(
      resolvedPackingListLines
        .map((line) => line.commodityDescription?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const derivedCargoDescription =
    derivedCargoDescriptions.length > 1
      ? `${derivedCargoDescriptions[0]} (+${derivedCargoDescriptions.length - 1} more)`
      : derivedCargoDescriptions[0];
  const cargoDescriptionDisplay =
    hbl.cargoDescription?.trim() || derivedCargoDescription || '—';
  const packageCountDisplay = hbl.packageCount ?? derivedPackageCount ?? '—';
  const packageTypeDisplay = hbl.packageType ?? derivedPackageType ?? '—';
  const cargoWeightDisplay = formatFixedDisplay(
    derivedCargoWeight ?? hbl.cargoWeight,
    2,
  );
  const volumeDisplay = formatFixedDisplay(derivedVolume ?? hbl.volume, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Commercial status detail"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl outline-none dark:bg-gray-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              HBL detail
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{hbl.code}</h3>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200">
            Payment & Delivery
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Parties
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Forwarder</span>
                    <span className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {forwarderDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Shipper</span>
                    <span className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {hbl.shipper || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Consignee</span>
                    <span className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {hbl.consignee || '—'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Cargo description</span>
                    <span className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {cargoDescriptionDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Logistics Details
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Container no.</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {primaryContainer?.containerNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Container type</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {primaryContainer?.containerTypeCode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Seal number</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {primaryContainer?.sealNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Packing list</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{packingListNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Packing list status</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{packingListStatus}</span>
                  </div>
                  {packingListLinesLoading ? (
                    <div className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                      Loading packing list lines...
                    </div>
                  ) : null}
                  {packingListLinesError ? (
                    <div className="sm:col-span-2 text-xs text-amber-600 dark:text-amber-300">
                      {packingListLinesError}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Destuff status</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {hbl.destuffStatus || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Package count</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {packageCountDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Package type</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {packageTypeDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Cargo weight (kg)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {cargoWeightDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Volume (m³)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {volumeDisplay}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
                <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
                        checked={modalPaid}
                        onChange={(e) => setModalPaid(e.target.checked)}
                        disabled={lockedPaid || readOnly}
                      />
                      Paid
                    </label>
                    <StatusPill active={modalPaid} label={modalPaid ? 'Yes' : 'No'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
                        checked={modalDeliveryAllowed}
                        onChange={(e) => setModalDeliveryAllowed(e.target.checked)}
                        disabled={lockedDelivery || readOnly}
                      />
                      Allow delivery
                    </label>
                    <StatusPill active={modalDeliveryAllowed} label={modalDeliveryAllowed ? 'Yes' : 'No'} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Delivery date
                    </label>
                    <input
                      type="date"
                      value={modalDeliveryDate}
                      onChange={(e) => setModalDeliveryDate(e.target.value)}
                      disabled={readOnly}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-700"
                    />
                  </div>
                </div>
                {lockedPaid ? (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Payment is already confirmed; toggle is locked.
                  </p>
                ) : null}
                {lockedDelivery ? (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Delivery is already allowed; toggle is locked.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4 text-sm dark:border-gray-700">
          {readOnly ? (
            <div className="text-xs text-amber-600 dark:text-amber-300">
              Read-only access. You cannot change payment or delivery settings.
            </div>
          ) : saveDisabled ? (
            <div className="text-xs text-amber-600 dark:text-amber-300">
              Paid & delivery allowed — nothing new to save.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 self-end">
            <Button variant="ghost" onClick={onClose} ref={cancelButtonRef}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving || effectiveSaveDisabled} className="flex items-center gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialStatusModal;
