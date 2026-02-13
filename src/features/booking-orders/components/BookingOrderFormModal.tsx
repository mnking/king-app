import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  BookingOrderCreateSchema,
  createBookingOrderDefaultValues,
} from '../schemas';
import type {
  BookingOrder,
  BookingOrderContainer,
  BookingOrderCreateForm,
  ContainerSummary,
  CargoNature,
  CargoProperties,
} from '../types';
import type { Forwarder } from '@/features/forwarder/types';
import { FormInput, FormDateInput, FormTextarea, FormForwarderSingleSelect } from '@/shared/components/forms';
import ContainerTable from './ContainerTable';
import Button from '@/shared/components/ui/Button';
import { useUnsavedChanges } from '@/shared/hooks';
import { useAuth } from '@/features/auth/useAuth';

// Type for containers that may have deserialized fields at the top level
type ContainerWithSummary = BookingOrderContainer & {
  summary?: ContainerSummary | null;
  // Deserialized fields (when data comes from deserializeContainerFromResponse)
  isAtYard?: boolean;
  cargoNature?: CargoNature;
  cargoProperties?: CargoProperties;
};

const parseCargoProperties = (value: unknown): CargoProperties => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as CargoProperties;
};

const normalizeContainersForForm = (containers?: BookingOrderContainer[]) =>
  (containers ?? []).map((container) => {
    const { summary, ...rest } = container as ContainerWithSummary;

    const fallbackSummary = summary ?? null;

    // If data has already been deserialized (via apiCFS deserializeContainerFromResponse),
    // the fields will be at the top level. Otherwise, extract from summary.
    const rawCargoNature = rest.cargoNature ?? fallbackSummary?.cargo_nature;
    const rawCargoProps = rest.cargoProperties ?? fallbackSummary?.cargo_properties ?? null;
    const isAtYardValue = rest.isAtYard !== undefined ? rest.isAtYard : (fallbackSummary?.is_atyard ?? false);

    return {
      ...rest,
      isAtYard: isAtYardValue,
      cargoNature: rawCargoNature,
      cargoProperties: parseCargoProperties(rawCargoProps),
      containerFile: container.containerFile ?? null,
      eta: container.eta ?? null,
    };
  });

interface BookingOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  order?: BookingOrder | null;
  onSave: (
    data: BookingOrderCreateForm | (Partial<BookingOrderCreateForm> & { id: string }),
  ) => Promise<void>;
  onApprove?: (order: BookingOrder) => Promise<boolean> | boolean;
  canApprove?: boolean;
  forwarders?: Forwarder[];
  forwardersLoading?: boolean;
}

export const BookingOrderFormModal: React.FC<BookingOrderFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  order,
  onSave,
  onApprove,
  canApprove = true,
  forwarders,
  forwardersLoading = false,
}) => {
  const { can } = useAuth();
  const canWriteOrders = can?.('order_management:write') ?? false;
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isReadOnly = isView || (order?.status === 'APPROVED') || !canWriteOrders;
  const isImportDerivedReadOnly = true;

  const derivePolPodFromOrder = React.useCallback((source?: BookingOrder | null) => {
    const containers = source?.containers ?? [];
    for (const container of containers) {
      const firstHbl = (container as any)?.hbls?.[0];
      if (!firstHbl) continue;
      const pol = firstHbl.pol ?? firstHbl.summary?.pol ?? null;
      const pod = firstHbl.pod ?? firstHbl.summary?.pod ?? null;
      if (pol || pod) {
        return { pol, pod };
      }
    }
    return { pol: null, pod: null };
  }, []);

  const methods = useForm<BookingOrderCreateForm>({
    resolver: zodResolver(BookingOrderCreateSchema),
    defaultValues:
      (isEdit || isView) && order
        ? {
            agentId: order.agentId,
            agentCode: order.agentCode || undefined,
            bookingNumber: order.bookingNumber || null,
            eta: order.eta,
            vesselCode: order.vesselCode || '',
            voyage: order.voyage,
            subVoyage: order.subVoyage || null,
            notes: order.notes || null,
            containers: normalizeContainersForForm(order.containers),
            ...(derivePolPodFromOrder(order) as any),
          }
        : ({
            ...createBookingOrderDefaultValues(),
            pol: null,
            pod: null,
          } as any),
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, isDirty, errors },
  } = methods;

  const hasManualErrors = (() => {
    const check = (value: unknown): boolean => {
      if (!value || typeof value !== 'object') return false;
      if ('type' in value && (value as { type?: unknown }).type === 'manual') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.some(check);
      }
      return Object.values(value as Record<string, unknown>).some(check);
    };

    return check(errors);
  })();

  const [isApproving, setIsApproving] = React.useState(false);

  // Use unsaved changes guard hook
  const { handleClose } = useUnsavedChanges({
    isDirty,
    isSubmitting,
    isReadOnly,
    onClose,
    reset,
  });

  // Reset form when modal opens/closes or mode/order changes
  React.useEffect(() => {
    if (isOpen) {
      if ((isEdit || isView) && order) {
        reset({
          agentId: order.agentId,
          agentCode: order.agentCode || undefined,
          bookingNumber: order.bookingNumber || null,
          eta: order.eta,
          vesselCode: order.vesselCode || '',
          voyage: order.voyage,
          subVoyage: order.subVoyage || null,
          notes: order.notes || null,
          containers: normalizeContainersForForm(order.containers),
          ...(derivePolPodFromOrder(order) as any),
        });
      } else {
        reset({
          ...createBookingOrderDefaultValues(),
          pol: null,
          pod: null,
        } as any);
      }
    }
  }, [derivePolPodFromOrder, isOpen, isEdit, isView, order, reset, mode]);

  const onSubmit = async (data: BookingOrderCreateForm) => {
    if (isReadOnly || hasManualErrors) return;

    try {
      const { pol: _pol, pod: _pod, ...payload } = data as any;
      if (isEdit && order) {
        await onSave({ ...payload, id: order.id });
      } else {
        await onSave(payload);
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to save booking order:', error);
    }
  };

  const canShowApprove = mode === 'view' && order?.status === 'DRAFT' && Boolean(onApprove);

  const handleApproveClick = async () => {
    if (!order || !onApprove || isApproving) return;
    if (!canApprove) return;

    try {
      setIsApproving(true);
      const ok = await onApprove(order);
      if (ok) {
        handleClose();
      }
    } finally {
      setIsApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isView
              ? 'View Booking Order'
              : isEdit
                ? 'Edit Booking Order'
                : 'Create New Booking Order'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Status Badge (for edit/view mode) */}
        {order && (
          <div className="mb-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                order.status === 'APPROVED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {order.status === 'APPROVED' ? '✓ Approved' : '○ Draft'}
            </span>
            {order.code && (
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                Order Code: <span className="font-medium">{order.code}</span>
              </span>
            )}
          </div>
        )}


        {/* Form */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Booking Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Booking Details
              </h3>

              {/* Row 1: Agent + Booking Number - 2 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormForwarderSingleSelect
                  name="agentId"
                  label="Agent / Forwarder"
                  control={control}
                  codeFieldName="agentCode"
                  setValue={setValue}
                  required
                  disabled={isReadOnly || isImportDerivedReadOnly}
                  forwarders={forwarders}
                  forwardersLoading={forwardersLoading}
                />

                <FormInput
                  name="bookingNumber"
                  label="Booking Number"
                  control={control}
                  placeholder="Enter booking number (optional)"
                  disabled={isReadOnly}
                />
              </div>

              {/* Row 2: Vessel + ETA - 2 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  name="vesselCode"
                  label="Vessel Name"
                  control={control}
                  placeholder="Enter vessel name"
                  required
                  disabled={isReadOnly || isImportDerivedReadOnly}
                />

                <FormDateInput
                  name="eta"
                  label="ETA (Estimated Time of Arrival)"
                  control={control}
                  required
                  disabled={isReadOnly}
                />
              </div>

              {/* Row 3: Voyage + Sub-Voyage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  name="voyage"
                  label="Voyage Number"
                  control={control}
                  placeholder="Enter main voyage number"
                  required
                  disabled={isReadOnly || isImportDerivedReadOnly}
                />
                <FormInput
                  name="subVoyage"
                  label="Sub-Voyage Number"
                  control={control}
                  placeholder="Enter segment voyage (optional)"
                  disabled={isReadOnly}
                />
              </div>

              {/* Row 4: POL + POD (read-only, derived from first eligible HBL) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  name={'pol' as any}
                  label="Port of Loading (POL)"
                  control={control as any}
                  placeholder="Auto-filled from first eligible HBL"
                  disabled
                />
                <FormInput
                  name={'pod' as any}
                  label="Port of Discharge (POD)"
                  control={control as any}
                  placeholder="Auto-filled from first eligible HBL"
                  disabled
                />
              </div>

              {/* Notes - Full width */}
              <FormTextarea
                name="notes"
                label="Notes"
                control={control}
                placeholder="Add any additional notes (optional)"
                rows={3}
                disabled={isReadOnly}
              />
            </div>

            {/* Container Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              {/* UI Tip */}
              <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>Tip: Click on any container row to expand and edit details.</span>
                </p>
              </div>
              <ContainerTable
                isReadOnly={isReadOnly}
                formMode={mode}
                forwarders={forwarders}
                orderId={order?.id}
                orderStatus={order?.status}
              />
            </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {canShowApprove && (
              <Button
                type="button"
                variant="primary"
                onClick={handleApproveClick}
                disabled={isSubmitting || !canApprove}
                loading={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {!isReadOnly && (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || hasManualErrors}
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEdit
                    ? 'Update Order'
                    : 'Save as Draft'}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
          </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default BookingOrderFormModal;
