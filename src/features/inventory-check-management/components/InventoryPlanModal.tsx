import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { FormDateTimeInput, FormSingleSelect, FormTextarea } from '@/shared/components/forms';
import type { InventoryPlanCheck } from '../types';
import {
  inventoryPlanFormDefaultValues,
  inventoryPlanFormSchema,
  type InventoryPlanFormData,
} from '../schemas';
import { StatusStepper } from '@/shared/components';
import { useDocumentDownload } from '@/features/document-service';

export type InventoryPlanModalMode = 'create' | 'edit' | 'view';

interface InventoryPlanModalProps {
  open: boolean;
  mode: InventoryPlanModalMode;
  plan: InventoryPlanCheck | null;
  onClose: () => void;
  onSave: (payload: InventoryPlanFormData) => Promise<void>;
  isSaving?: boolean;
  hasWorkingPlan?: boolean;
  onStartCheck?: (plan: InventoryPlanCheck) => void;
  canWrite: boolean;
}

const typeOptions = [
  { value: 'INTERNAL', label: 'INTERNAL' },
  { value: 'CUSTOM', label: 'CUSTOM' },
];

const statusLabels: Record<InventoryPlanCheck['status'], string> = {
  CREATED: 'Created',
  RECORDING: 'Recording',
  RECORDED: 'Recorded',
  EXPLAINED: 'Explained',
  ADJUSTING: 'Adjusting',
  DONE: 'Done',
  CANCELED: 'Canceled',
};

const statusDescriptions: Record<InventoryPlanCheck['status'], string> = {
  CREATED: 'Plan created and waiting to start.',
  RECORDING: 'Plan check is in progress.',
  RECORDED: 'Recording complete, review discrepancies.',
  EXPLAINED: 'Mismatch explanations documented.',
  ADJUSTING: 'Inventory adjustment in progress.',
  DONE: 'Plan check closed and finalized.',
  CANCELED: 'Plan check canceled.',
};

const statusToStepIndex: Record<InventoryPlanCheck['status'], number> = {
  CREATED: 0,
  RECORDING: 1,
  RECORDED: 2,
  EXPLAINED: 3,
  ADJUSTING: 4,
  DONE: 5,
  CANCELED: 5,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '';
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export const InventoryPlanModal: React.FC<InventoryPlanModalProps> = ({
  open,
  mode,
  plan,
  onClose,
  onSave,
  isSaving = false,
  hasWorkingPlan = false,
  onStartCheck,
  canWrite,
}) => {
  const documentDownload = useDocumentDownload();
  const {
    control,
    reset,
    handleSubmit,
  } = useForm<InventoryPlanFormData>({
    defaultValues: inventoryPlanFormDefaultValues,
    resolver: zodResolver(inventoryPlanFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const isReadOnly =
    mode === 'view' || (mode === 'edit' && plan?.status !== 'CREATED') || !canWrite;

  useEffect(() => {
    if (plan && (mode === 'edit' || mode === 'view')) {
      reset({
        estimateStartTime: plan.estimateStartTime,
        membersNote: plan.membersNote ?? '',
        note: plan.note ?? '',
        type: plan.type,
      });
      return;
    }

    reset(inventoryPlanFormDefaultValues);
  }, [mode, plan, reset]);

  const modalTitle = useMemo(() => {
    if (mode === 'edit') return 'Edit inventory plan';
    if (mode === 'view') return 'Inventory plan details';
    return 'Create inventory plan';
  }, [mode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {modalTitle}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Schedule a plan check and share context with assigned members.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'view' && plan ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Estimate start
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDateTime(plan.estimateStartTime)}
                </p>
              </div>
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Actual start
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDateTime(plan.actualStartTime)}
                </p>
              </div>
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Actual end
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDateTime(plan.actualEndTime)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Plan status
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Current progress across the inventory check lifecycle.
                  </p>
                </div>
              </div>
              <StatusStepper
                steps={[
                  {
                    key: 'created',
                    label: statusLabels.CREATED,
                    description: statusDescriptions.CREATED,
                  },
                  {
                    key: 'recording',
                    label: statusLabels.RECORDING,
                    description: statusDescriptions.RECORDING,
                  },
                  {
                    key: 'recorded',
                    label: statusLabels.RECORDED,
                    description: statusDescriptions.RECORDED,
                  },
                  {
                    key: 'explained',
                    label: statusLabels.EXPLAINED,
                    description: statusDescriptions.EXPLAINED,
                  },
                  {
                    key: 'adjusting',
                    label: statusLabels.ADJUSTING,
                    description: statusDescriptions.ADJUSTING,
                  },
                  {
                    key: 'final',
                    label: plan.status === 'CANCELED' ? statusLabels.CANCELED : statusLabels.DONE,
                    description:
                      plan.status === 'CANCELED'
                        ? statusDescriptions.CANCELED
                        : statusDescriptions.DONE,
                    status:
                      plan.status === 'CANCELED'
                        ? 'rejected'
                        : plan.status === 'DONE'
                          ? 'completed'
                          : undefined,
                  },
                ]}
                currentIndex={statusToStepIndex[plan.status] ?? 0}
                isRejected={plan.status === 'CANCELED'}
                lineInsetPercent={6}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Members note
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {plan.membersNote || '—'}
                </p>
              </div>
              <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Note
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {plan.note || '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Mismatch flags
              </p>
              {plan.status === 'CREATED' || plan.status === 'RECORDING' ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                  No data yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {plan.locationMismatchFlag ? (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      Location mismatch
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Location OK
                    </span>
                  )}
                  {plan.qtyMismatchFlag ? (
                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                      Qty mismatch
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Qty OK
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Result document
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Download the recorded result document for this plan check.
                  </p>
                </div>
              </div>

              {plan.resultDocument ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {plan.resultDocument.name}
                    {plan.resultDocument.sizeBytes ? (
                      <span className="ml-2 text-xs text-slate-500">
                        ({formatFileSize(plan.resultDocument.sizeBytes)})
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      documentDownload.mutate({
                        documentId: plan.resultDocument?.id,
                        fileName: plan.resultDocument?.name ?? undefined,
                        openInNewTab: true,
                      })
                    }
                    disabled={documentDownload.isPending}
                  >
                    Download
                  </Button>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No result document uploaded.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {plan.status === 'CREATED' && (
                <div className="text-sm text-slate-500 dark:text-slate-300 sm:mr-auto">
                  {hasWorkingPlan
                    ? 'You can only run one working plan at a time.'
                    : 'Ready to start this plan check.'}
                </div>
              )}
              {!canWrite ? (
                <div className="text-sm text-amber-600 dark:text-amber-300 sm:mr-auto">
                  Read-only access. You cannot start or modify plan checks.
                </div>
              ) : null}
              {plan.status === 'CREATED' && (
                <Button
                  type="button"
                  onClick={() => onStartCheck?.(plan)}
                  disabled={hasWorkingPlan || !canWrite}
                >
                  Start check
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-6"
            onSubmit={handleSubmit(async (values) => {
              await onSave({
                estimateStartTime: values.estimateStartTime,
                membersNote: values.membersNote ?? '',
                note: values.note ?? '',
                type: values.type,
              });
              reset(inventoryPlanFormDefaultValues);
            })}
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Plan details
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Set the estimate time and clarify any notes for the plan check.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormDateTimeInput
                    control={control}
                    name="estimateStartTime"
                    label="Estimate start time"
                    placeholder="Select date & time"
                    disabled={isReadOnly}
                  />
                  <FormSingleSelect
                    control={control}
                    name="type"
                    label="Type"
                    options={typeOptions}
                    placeholder="Select type"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="mt-4 grid gap-4">
                  <FormTextarea
                    control={control}
                    name="membersNote"
                    label="Members note"
                    placeholder="Add guidance for assigned members"
                    rows={3}
                    disabled={isReadOnly}
                  />
                  <FormTextarea
                    control={control}
                    name="note"
                    label="Note"
                    placeholder="Add internal notes"
                    rows={3}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {!isReadOnly && (
                <Button type="submit" loading={isSaving}>
                  {mode === 'edit' ? 'Save changes' : 'Create plan'}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InventoryPlanModal;
