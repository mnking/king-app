import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DestuffingPlan } from '../types';

// Zod validation schema
const RemoveOnHoldSchema = z.object({
  updatedTime: z.string().min(1, 'Updated time is required'),
  note: z.string().min(10, 'Note must be at least 10 characters'),
});

type RemoveOnHoldFormData = z.infer<typeof RemoveOnHoldSchema>;

interface RemoveOnHoldStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: DestuffingPlan['containers'][number] | null;
}

export const RemoveOnHoldStatusModal: React.FC<RemoveOnHoldStatusModalProps> = ({
  isOpen,
  onClose,
  container,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RemoveOnHoldFormData>({
    resolver: zodResolver(RemoveOnHoldSchema),
    defaultValues: {
      updatedTime: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
      note: '',
    },
  });

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        updatedTime: new Date().toISOString().slice(0, 16),
        note: '',
      });
    }
  }, [isOpen, reset]);

  // Placeholder action for remove on-hold
  const onSubmit = async (data: RemoveOnHoldFormData) => {
    setIsSubmitting(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Log to console in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Placeholder Action] Remove on-hold status for container ${container?.orderContainer.containerNo}`,
        data,
      );
    }

    // Show info toast
    toast.info(
      'Feature under development - On-hold status removal will be available after backend integration',
      { duration: 4000 },
    );

    setIsSubmitting(false);
    // Note: Modal remains open for user to review or close manually
  };

  // Handle file upload click (placeholder)
  const handleFileUploadClick = () => {
    toast.info('Document upload feature under development', { duration: 3000 });
  };

  if (!isOpen || !container) {
    return null;
  }

  const containerNo = container.orderContainer.containerNo || 'Unknown';
  const sealNumber = container.orderContainer.sealNumber || '—';
  const mblNumber = container.orderContainer.mblNumber || '—';
  const forwarderName = container.orderContainer.bookingOrder?.agentCode || '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-onhold-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          <h2 id="remove-onhold-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Remove Container On-Hold Status
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6">
          {/* Preview Mode Warning Banner */}
          <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Preview Mode
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                This action will not persist - backend integration pending.
              </p>
            </div>
          </div>

          {/* Display-Only Information */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Container Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Container Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{containerNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Seal Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{sealNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MBL Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{mblNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{forwarderName}</p>
              </div>
            </div>
          </section>

          {/* Input Fields */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Removal Details
            </h3>

            {/* Updated Time */}
            <div>
              <label
                htmlFor="updatedTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Updated Time <span className="text-red-500">*</span>
              </label>
              <input
                id="updatedTime"
                type="datetime-local"
                {...register('updatedTime')}
                className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border ${
                  errors.updatedTime
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } rounded-lg focus:outline-none focus:ring-2 transition-all duration-150`}
              />
              {errors.updatedTime && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.updatedTime.message}
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="note"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                id="note"
                rows={4}
                {...register('note')}
                placeholder="Enter reason for removing on-hold status..."
                className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border ${
                  errors.note
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } rounded-lg focus:outline-none focus:ring-2 transition-all duration-150 resize-none`}
              />
              {errors.note && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.note.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 10 characters required
              </p>
            </div>

            {/* Document Upload Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supporting Document
              </label>
              <button
                type="button"
                onClick={handleFileUploadClick}
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium">Document upload - Coming soon</span>
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Document upload feature is under development
              </p>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Remove Container On Hold
          </button>
        </div>
      </div>
    </div>
  );
};
