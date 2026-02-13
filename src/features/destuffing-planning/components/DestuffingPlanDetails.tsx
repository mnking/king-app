import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  Check,
  Edit,
  FileText,
  Package,
  Play,
  Receipt,
  Save,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { FormCheckbox, FormInput } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import {
  destuffingPlanHeaderSchema,
  destuffingPlanHeaderDefaultValues,
  type DestuffingPlanHeaderFormData,
} from '../schemas';
import { toDateTimeLocalFormat, fromDateTimeLocalFormat } from '@/shared/utils';
import { formatDateTime } from '@/shared/utils/date-format';
import { useUpdateDestuffingPlan } from '../hooks';
import { getPlanForwarderLabel } from '../utils/plan-transformers';
import { getContainerTypeCode } from '@/shared/features/plan/utils/plan-display-helpers';
import type { DestuffingPlan } from '../types';
import {
  CARGO_RELEASE_STATUS,
  type CargoReleaseStatus,
} from '@/shared/constants/container-status';
import {
  buildCargoReleaseNotAllowedHint,
  buildCargoReleaseNotAllowedMessage,
  buildDestuffingNotAllowedHint,
  buildDestuffingNotAllowedMessage,
  getCargoReleaseBlockedContainerLabels,
  getBlockedDestuffingContainerLabels,
} from '../utils/destuffing-start-guard';

interface DestuffingPlanDetailsProps {
  plan: DestuffingPlan | null;
  selectedPlanId: string | 'unplanned';
  onPlanSelectionChange: (id: string | 'unplanned') => void;
  onDeletePlan: (plan: DestuffingPlan) => void;
  onMarkDoing: (plan: DestuffingPlan) => void;
  onManageContainers: (plan: DestuffingPlan) => void;
  isDeletingPlan?: boolean;
  isStatusChanging?: boolean;
  className?: string;
  forwarderLabel?: string | null;
  canWrite?: boolean;
}

const BooleanChip: React.FC<{ value?: boolean; label: string; trueText?: string; falseText?: string }> = ({
  value,
  label,
  trueText = 'Yes',
  falseText = 'No',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${value
        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      }`}
  >
    {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    {label} {value ? trueText : falseText}
  </span>
);

const toCargoReleaseStatusEnum = (value?: string | null): CargoReleaseStatus | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');

  return Object.values(CARGO_RELEASE_STATUS).includes(normalized as CargoReleaseStatus)
    ? (normalized as CargoReleaseStatus)
    : null;
};

const allowDestuffingBadgeClass = (isAllowed: boolean) =>
  isAllowed
    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

const cargoReleaseBadgeClass = (status: CargoReleaseStatus | null) =>
  status === CARGO_RELEASE_STATUS.APPROVED
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

export const DestuffingPlanDetails: React.FC<DestuffingPlanDetailsProps> = ({
  plan,
  selectedPlanId,
  onPlanSelectionChange,
  onDeletePlan,
  onMarkDoing,
  onManageContainers,
  isDeletingPlan = false,
  isStatusChanging = false,
  className = '',
  forwarderLabel,
  canWrite = true,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMarkDoingConfirm, setShowMarkDoingConfirm] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [displayedPlan, setDisplayedPlan] = useState<DestuffingPlan | null>(plan);
  const [pendingPlan, setPendingPlan] = useState<DestuffingPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const updatePlanMutation = useUpdateDestuffingPlan();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DestuffingPlanHeaderFormData>({
    resolver: zodResolver(destuffingPlanHeaderSchema),
    defaultValues: destuffingPlanHeaderDefaultValues,
  });

  useEffect(() => {
    if (!isEditing) {
      setDisplayedPlan(plan);
      return;
    }

    if (plan && displayedPlan && plan.id !== displayedPlan.id) {
      setPendingPlan(plan);
      setShowSwitchConfirm(true);
    }
  }, [plan, isEditing, displayedPlan]);

  const activePlan = displayedPlan ?? plan;
  const blockedContainers = getBlockedDestuffingContainerLabels(activePlan);
  const blockedCargoReleaseContainers = getCargoReleaseBlockedContainerLabels(activePlan);
  const hasBlockedContainers =
    blockedContainers.length > 0 || blockedCargoReleaseContainers.length > 0;

  const isScheduled = activePlan?.status === 'SCHEDULED';
  const isDone = activePlan?.status === 'DONE';
  const canMarkDoing = Boolean(
    isScheduled &&
    activePlan?.equipmentBooked &&
    (activePlan?.approvedAppointment ?? activePlan?.appointmentConfirmed) &&
    !hasBlockedContainers,
  );
  const markDoingDisabledReason = [
    blockedContainers.length > 0
      ? buildDestuffingNotAllowedMessage(blockedContainers)
      : null,
    blockedCargoReleaseContainers.length > 0
      ? buildCargoReleaseNotAllowedMessage(blockedCargoReleaseContainers)
      : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;
  const markDoingHints = [
    blockedContainers.length > 0
      ? buildDestuffingNotAllowedHint(blockedContainers)
      : null,
    blockedCargoReleaseContainers.length > 0
      ? buildCargoReleaseNotAllowedHint(blockedCargoReleaseContainers)
      : null,
  ].filter(Boolean) as string[];
  const disableActions = isDeletingPlan || isStatusChanging || !activePlan;
  const resolvedForwarderLabel = activePlan
    ? forwarderLabel ?? getPlanForwarderLabel(activePlan) ?? 'Forwarder TBD'
    : 'Forwarder TBD';

  const initializeForm = (targetPlan: DestuffingPlan) => {
    const start = toDateTimeLocalFormat(targetPlan.plannedStart);
    const end = toDateTimeLocalFormat(targetPlan.plannedEnd);

    reset({
      plannedStart: start,
      plannedStartTime: '',
      plannedEnd: end,
      plannedEndTime: '',
      equipmentBooked: targetPlan.equipmentBooked,
      approvedAppointment:
        targetPlan.approvedAppointment ?? targetPlan.appointmentConfirmed ?? false,
    });
  };

  const handleEdit = () => {
    if (!activePlan) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    initializeForm(activePlan);
    setIsEditing(true);
  };

  const handleSave = async (data: DestuffingPlanHeaderFormData) => {
    if (!activePlan) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }

    await updatePlanMutation.mutateAsync({
      id: activePlan.id,
      data: {
        plannedStart: fromDateTimeLocalFormat(data.plannedStart),
        plannedEnd: fromDateTimeLocalFormat(data.plannedEnd),
        equipmentBooked: data.equipmentBooked,
        approvedAppointment: data.approvedAppointment,
      },
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    reset(destuffingPlanHeaderDefaultValues);
  };

  const handleDeleteConfirm = () => {
    if (!activePlan) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    onDeletePlan(activePlan);
    setShowDeleteConfirm(false);
  };

  const handleMarkDoingConfirm = () => {
    if (!activePlan) return;
    if (!canWrite) {
      toast.error('You do not have permission to modify destuffing plans.');
      return;
    }
    if (hasBlockedContainers) {
      const reason = [
        blockedContainers.length > 0
          ? buildDestuffingNotAllowedMessage(blockedContainers)
          : null,
        blockedCargoReleaseContainers.length > 0
          ? buildCargoReleaseNotAllowedMessage(blockedCargoReleaseContainers)
          : null,
      ]
        .filter(Boolean)
        .join(' ');
      toast.error(reason || 'Cannot mark doing.');
      setShowMarkDoingConfirm(false);
      return;
    }
    onMarkDoing(activePlan);
    setShowMarkDoingConfirm(false);
  };

  const handleDiscardAndSwitch = () => {
    if (!pendingPlan) return;
    initializeForm(pendingPlan);
    setDisplayedPlan(pendingPlan);
    setPendingPlan(null);
    setShowSwitchConfirm(false);
  };

  const handleCancelSwitch = () => {
    if (!displayedPlan) return;
    onPlanSelectionChange(displayedPlan.id);
    setPendingPlan(null);
    setShowSwitchConfirm(false);
  };

  if (!activePlan || selectedPlanId === 'unplanned') {
    return (
      <div
        className={`h-full flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 ${className}`}
      >
        <div className="text-center text-gray-800 dark:text-gray-100">
          <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No destuffing plan selected
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Select a plan from the left panel to review its schedule and containers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}
    >
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {activePlan.code}
              </h2>
              {isDone && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
                  <Check className="h-4 w-4" />
                  Completed
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
              <span className="text-xs uppercase tracking-wide text-gray-500">Forwarder</span>
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-200">
                {resolvedForwarderLabel}
              </span>
            </div>
            {!isEditing ? (
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Planned Start</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatDateTime(activePlan.plannedStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Planned End</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatDateTime(activePlan.plannedEnd)}
                    </p>
                  </div>
                  {isDone && activePlan.executionEnd && (
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Completion Time</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        {formatDateTime(activePlan.executionEnd)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BooleanChip
                    label="Equipment"
                    value={activePlan.equipmentBooked}
                    trueText="Booked"
                    falseText="Pending"
                  />
                  <BooleanChip
                    label="Appointment"
                    value={activePlan.approvedAppointment ?? activePlan.appointmentConfirmed}
                    trueText="Confirmed"
                    falseText="Pending"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned Start (Local time)</p>
                    <div className="mt-2">
                      <FormInput
                        name="plannedStart"
                        control={control}
                        type="datetime-local"
                        valueMode="string"
                        label="Date & Time"
                        required
                      />
                    </div>
                    {errors.plannedStart && (
                      <p className="mt-1 text-sm text-red-600">{errors.plannedStart.message}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Planned End (Local time)</p>
                    <div className="mt-2">
                      <FormInput
                        name="plannedEnd"
                        control={control}
                        type="datetime-local"
                        valueMode="string"
                        label="Date & Time"
                        required
                      />
                    </div>
                    {errors.plannedEnd && (
                      <p className="mt-1 text-sm text-red-600">{errors.plannedEnd.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormCheckbox name="equipmentBooked" control={control} label="Equipment booked" />
                  <FormCheckbox
                    name="approvedAppointment"
                    control={control}
                    label="Appointment confirmed"
                  />
                </div>
              </form>
            )}
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isScheduled || disableActions}
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disableActions}
                    onClick={() => onManageContainers(activePlan)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Containers
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMarkDoing || isStatusChanging}
                    title={markDoingDisabledReason}
                    onClick={() => setShowMarkDoingConfirm(true)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Mark Doing
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={!isScheduled || isDeletingPlan}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={updatePlanMutation.isPending}
                    onClick={handleSubmit(handleSave)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
            {!isEditing && hasBlockedContainers && markDoingHints.length > 0 && (
              <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                  <div className="space-y-1">
                    <p className="font-semibold">Mark Doing is disabled.</p>
                    {markDoingHints.map((hint) => (
                      <p key={hint}>{hint}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Containers</p>
            <p className="text-xs text-gray-500">{activePlan.containers.length} assigned container(s)</p>
          </div>
        </div>
        <div className="space-y-3">
          {activePlan.containers.map((planContainer) => {
            const hblNumbers = (planContainer.hbls || [])
              .map((hbl) => hbl.hblNo)
              .filter(Boolean);
            const typeCode = getContainerTypeCode(planContainer);
            const orderCode = planContainer.orderContainer?.bookingOrder?.code || planContainer.orderContainer?.orderCode;
            const bookingNumber = planContainer.orderContainer?.bookingOrder?.bookingNumber;
            const cargoReleaseStatus = planContainer.orderContainer?.cargoReleaseStatus;
            const cargoReleaseStatusEnum = toCargoReleaseStatusEnum(cargoReleaseStatus);
            const allowDestuffing =
              planContainer.orderContainer?.allowStuffingOrDestuffing === true;
            const isPriority = planContainer.orderContainer?.isPriority;

            return (
              <div
                key={planContainer.id}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 p-5"
              >
                {/* Header: Container Number + Priority Badge + Type */}
                <div className="flex items-start gap-3 mb-4">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                      {planContainer.orderContainer?.containerNo ?? '—'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">
                        {typeCode ? typeCode : 'Type: N/A'}
                      </span>
                      {planContainer.orderContainer?.sealNumber && (
                        <>
                          <span>•</span>
                          <span>Seal: {planContainer.orderContainer.sealNumber ?? '—'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isPriority && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 whitespace-nowrap transition-colors duration-150">
                        <Zap className="h-3.5 w-3.5" />
                        High Priority
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-t dark:border-gray-700 pt-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</p>
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {orderCode ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Booking Number</p>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {bookingNumber ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MBL</p>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {planContainer.orderContainer?.mblNumber ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {planContainer.orderContainer?.forwarderName ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Pills (Cargo Release) */}
                {cargoReleaseStatus && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cargoReleaseBadgeClass(cargoReleaseStatusEnum)}`}
                    >
                      Cargo Release: {cargoReleaseStatusEnum ?? cargoReleaseStatus}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${allowDestuffingBadgeClass(allowDestuffing)}`}
                    >
                      Allow Destuffing: {allowDestuffing ? 'Allowed' : 'Not Allowed'}
                    </span>
                  </div>
                )}

                {/* HBLs Section */}
                {hblNumbers.length > 0 && (
                  <div className="border-t dark:border-gray-700 pt-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      House B/L ({hblNumbers.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto p-1 -m-1">
                      <div className="flex flex-wrap gap-1.5">
                        {hblNumbers.map((hblNo) => (
                          <span
                            key={hblNo}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-mono font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            {hblNo}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ConfirmDialog
              open={showDeleteConfirm}
              message="Delete Plan"
              description={`Delete plan ${activePlan.code}? All containers return to the unplanned list.`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              intent="danger"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      )}

      {showMarkDoingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowMarkDoingConfirm(false)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ConfirmDialog
              open={showMarkDoingConfirm}
              message="Mark Plan Doing"
              description={`Start executing ${activePlan.code}? The plan will move to IN_PROGRESS.`}
              confirmLabel="Mark Doing"
              cancelLabel="Cancel"
              intent="primary"
              onConfirm={handleMarkDoingConfirm}
              onCancel={() => setShowMarkDoingConfirm(false)}
            />
          </div>
        </div>
      )}

      {showSwitchConfirm && displayedPlan && pendingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ConfirmDialog
              open={showSwitchConfirm}
              message="Unsaved Changes"
              description={`You have unsaved changes for ${displayedPlan.code}. Discard and switch to ${pendingPlan.code}?`}
              confirmLabel="Discard"
              cancelLabel="Cancel"
              intent="warning"
              onConfirm={handleDiscardAndSwitch}
              onCancel={handleCancelSwitch}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DestuffingPlanDetails;
