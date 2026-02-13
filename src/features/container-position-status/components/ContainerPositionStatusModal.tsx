import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import type { ContainerPositionRow, PositionStatus } from '../types';

type ContainerPositionStatusModalProps = {
  open: boolean;
  container: ContainerPositionRow | null;
  mode?: 'view' | 'edit';
  onClose: () => void;
  onSave: (
    payload: Pick<
      ContainerPositionRow,
      'id' | 'sealNumber' | 'eta' | 'positionStatus'
    >,
  ) => Promise<void>;
  isSaving?: boolean;
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const positionOptions: Array<{ label: string; value: PositionStatus }> = [
  { label: 'N/A', value: null },
  { label: 'Discharged', value: 'AT_PORT' },
  { label: 'Stored', value: 'IN_YARD' },
];

const ContainerPositionStatusModal: React.FC<
  ContainerPositionStatusModalProps
> = ({ open, container, mode = 'edit', onClose, onSave, isSaving = false }) => {
  const [sealNumber, setSealNumber] = useState('');
  const [eta, setEta] = useState('');
  const [positionStatus, setPositionStatus] = useState<PositionStatus>(null);

  useEffect(() => {
    if (!open || !container) return;
    setSealNumber(container.sealNumber ?? '');
    setEta(toDateInputValue(container.eta));
    setPositionStatus(container.positionStatus ?? null);
  }, [container, open]);

  const title = useMemo(() => {
    const actionLabel = mode === 'view' ? 'View' : 'Edit';
    return `${actionLabel} container ${container?.containerNumber ?? ''}`.trim();
  }, [container?.containerNumber, mode]);

  const isReadOnly = mode === 'view';

  if (!open || !container) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isReadOnly
                ? 'Review seal number, ETA, and position status.'
                : 'Update seal number, ETA, and position status, then save to persist changes.'}
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

        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (isReadOnly) return;
            await onSave({
              id: container.id,
              sealNumber: sealNumber.trim(),
              eta: eta || container.eta,
              positionStatus,
            });
          }}
        >
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Container details
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Context for the current container.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Container
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {container.containerNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Order
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {container.orderId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Forwarder
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {container.forwarder}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Current status
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {container.positionStatus
                    ? container.positionStatus
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Seal number"
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
              placeholder="SL-XXXX"
              disabled={isReadOnly}
            />
            <Input
              label="ETA"
              type="date"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              disabled={isReadOnly}
            />
            <div className="md:col-span-2 space-y-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Position status
                <select
                  value={positionStatus ?? ''}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {positionOptions.map((option) => (
                    <option
                      key={option.label}
                      value={option.value ?? ''}
                      className="text-gray-900"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {!isReadOnly && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={positionStatus !== null}
                    onClick={() => setPositionStatus('AT_PORT')}
                  >
                    Discharge
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={
                      !(
                        positionStatus === null ||
                        positionStatus === 'AT_PORT'
                      )
                    }
                    onClick={() => setPositionStatus('IN_YARD')}
                  >
                    Store
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" loading={isSaving}>
                Save changes
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerPositionStatusModal;
