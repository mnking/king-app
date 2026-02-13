import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/shared/utils/date-format';
import { Button } from '@/shared/components/ui/Button';
import { FormInput } from '@/shared/components/forms';
import { useExportPlan } from '@/features/stuffing-planning/hooks/use-export-plans';
import type { StuffedContainerMoveOutListItem } from '../types';
import { customsBadge, workingResultBadge } from './MoveLoadedContainerTableColumn';
import {
  truckInfoDefaultValues,
  truckInfoSchema,
  type TruckInfoForm,
} from '../schemas';
import { useEditMovedContainerInfo, useMoveContainerToPort } from '../hooks';

interface MoveLoadedContainerDetailsModalProps {
  open: boolean;
  mode?: 'view' | 'edit' | 'move';
  record: StuffedContainerMoveOutListItem | null;
  onClose: () => void;
  canCheck: boolean;
  canWrite: boolean;
}

const MoveLoadedContainerDetailsModal: React.FC<
  MoveLoadedContainerDetailsModalProps
> = ({ open, mode = 'view', record, onClose, canCheck, canWrite }) => {
  const {
    control: truckControl,
    handleSubmit: handleTruckSubmit,
    reset: resetTruck,
  } = useForm<TruckInfoForm>({
    defaultValues: truckInfoDefaultValues,
    resolver: zodResolver(truckInfoSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const moveContainer = useMoveContainerToPort();
  const editContainer = useEditMovedContainerInfo();

  const isSaving =
    moveContainer.isPending ||
    editContainer.isPending;
  const canMove = canWrite || canCheck;
  const isReadOnly =
    mode === 'view' || (mode === 'edit' && !canWrite) || (mode === 'move' && !canMove);

  const planId = record?.planStuffingId ?? '';
  const { data: exportPlan } = useExportPlan(planId, {
    enabled: open && !!planId,
  });

  const moveInfo = useMemo(() => {
    if (!record || !exportPlan) return null;
    const container = exportPlan.containers.find(
      (item) => item.id === record.containerId,
    );
    return container?.moveInfo ?? null;
  }, [exportPlan, record]);

  useEffect(() => {
    if (!open || !record) return;
    resetTruck({
      plateNumber: moveInfo?.truckNumber ?? record.truck.plateNumber ?? '',
      driverName: moveInfo?.driverName ?? record.truck.driverName ?? '',
    });
  }, [moveInfo, open, record, resetTruck]);

  const containerLabel = useMemo(() => {
    if (!record) return '';
    return `${record.containerTypeCode}${record.containerSize ? ` (${record.containerSize})` : ''}`;
  }, [record]);

  const handleMove = async (values: TruckInfoForm) => {
    if (!canMove) {
      toast.error('You do not have permission to modify loaded containers.');
      return;
    }
    if (!record) return;
    try {
      await moveContainer.mutateAsync({
        id: record.id,
        payload: {
          plateNumber: values.plateNumber,
          driverName: values.driverName,
        },
      });
      toast.success('Container moved to port');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move container');
    }
  };

  const handleEdit = async (values: TruckInfoForm) => {
    if (!canWrite) {
      toast.error('You do not have permission to modify loaded containers.');
      return;
    }
    if (!record) return;
    try {
      await editContainer.mutateAsync({
        record,
        payload: {
          plateNumber: values.plateNumber,
          driverName: values.driverName,
        },
      });
      toast.success('Container updated');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update container');
    }
  };

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {mode} loaded container
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {record.containerNumber}
              </h3>
              <span className={workingResultBadge(record.workingResultStatus)}>
                {record.workingResultStatus === 'received'
                  ? 'waiting'
                  : record.workingResultStatus}
              </span>
              <span className={customsBadge(record.getOutContainerStatus)}>
                {record.getOutContainerStatus ? 'Declared' : 'Pending customs'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {containerLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Container details
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Reference information for the stuffed container.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Plan stuffing</p>
                <p className="font-medium">{record.planStuffingNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Forwarder</p>
                <p className="font-medium">{record.forwarder || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Estimated move</p>
                <p className="font-medium">{formatDateTime(record.estimateMoveTime)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">ETD</p>
                <p className="font-medium">{formatDateTime(record.etd)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Actual move</p>
                <p className="font-medium">{formatDateTime(record.actualMoveTime)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Truck and customs
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {isReadOnly
                  ? 'Recorded truck/driver and customs declaration details.'
                  : 'Update truck/driver info before saving.'}
              </p>
            </div>
            {isReadOnly ? (
              <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Truck plate</p>
                  <p className="font-medium">
                    {(moveInfo?.truckNumber ?? record.truck.plateNumber) || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Driver</p>
                  <p className="font-medium">
                    {(moveInfo?.driverName ?? record.truck.driverName) || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Declared at</p>
                  <p className="font-medium">
                    {formatDateTime(record.customsDeclaration.declaredAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Declared by</p>
                  <p className="font-medium">
                    {record.customsDeclaration.declaredBy || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Reference No</p>
                  <p className="font-medium">
                    {record.customsDeclaration.referenceNo || '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <FormInput
                  control={truckControl}
                  name="plateNumber"
                  label="Vehicle plate number"
                  required
                  disabled={isSaving || isReadOnly}
                />
                <FormInput
                  control={truckControl}
                  name="driverName"
                  label="Driver name"
                  required
                  disabled={isSaving || isReadOnly}
                />
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'edit' && (
            <Button
              type="button"
              onClick={handleTruckSubmit(handleEdit)}
              loading={isSaving}
              disabled={isReadOnly}
            >
              Save
            </Button>
          )}
          {mode === 'move' && (
            <Button
              type="button"
              onClick={handleTruckSubmit(handleMove)}
              loading={isSaving}
              disabled={isReadOnly}
            >
              Move to Port
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoveLoadedContainerDetailsModal;
