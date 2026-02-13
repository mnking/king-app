import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import type { PackageCheckData } from '../types';
import { PackageCheckSchema } from '../schemas';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface InboundPackageCheckingModalProps {
  lineInspectionId: string;
  lineNumber?: number;
  remainingPackages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PackageCheckData) => Promise<unknown> | void;
}

const statusOptions: Array<{ value: PackageCheckData['statusCheck']; label: string }> =
  [
    { value: 'normal', label: 'Normal' },
    { value: 'package_damaged', label: 'Package Damaged' },
    { value: 'cargo_broken', label: 'Cargo Broken' },
  ];

const customsOptions: Array<{ value: PackageCheckData['customsCheck']; label: string }> =
  [
    { value: 'uninspected', label: 'Uninspected' },
    { value: 'passed', label: 'Passed' },
    { value: 'on_hold', label: 'On Hold' },
  ];

const extractServerErrorMessages = (error: unknown) => {
  if (!(error instanceof Error) || !error.message) {
    return [];
  }
  return error.message
    .split('\n')
    .map((message) => message.trim())
    .filter(Boolean);
};

export const InboundPackageCheckingModal: React.FC<
  InboundPackageCheckingModalProps
> = ({ lineInspectionId, lineNumber, remainingPackages, isOpen, onClose, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<PackageCheckData>({
    resolver: zodResolver(PackageCheckSchema),
    defaultValues: {
      packageCount: 1,
      statusCheck: 'normal',
      customsCheck: 'uninspected',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        packageCount: 1,
        statusCheck: 'normal',
        customsCheck: 'uninspected',
      });
    }
  }, [isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (values: PackageCheckData) => {
    clearErrors(['packageCount', 'root.serverError']);

    if (values.packageCount > remainingPackages) {
      setError('packageCount', {
        type: 'manual',
        message: 'Package count exceeds remaining packages',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      const serverMessages = extractServerErrorMessages(error);
      if (serverMessages.length > 0) {
        const packageCountMessage = serverMessages.find((message) =>
          /checkingpackagecount|package count/i.test(message),
        );
        if (packageCountMessage) {
          setError('packageCount', {
            type: 'server',
            message: packageCountMessage,
          });
          return;
        }

        setError('root.serverError', {
          type: 'server',
          message: serverMessages.join('\n'),
        });
        return;
      }

      // keep modal open for retry
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Cargo Inspection
              </p>
            </div>
            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
              Check Packages
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
          <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-blue-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Remaining Packages
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.max(remainingPackages, 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Line ID</p>
                <div className="flex flex-col items-end">
                  {lineNumber && (
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      #{lineNumber}
                    </span>
                  )}
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    {lineInspectionId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {errors.root?.serverError?.message && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300"
              >
                {errors.root.serverError.message}
              </div>
            )}

            <Input
              type="number"
              min={1}
              max={remainingPackages}
              step={1}
              label="Package Count"
              placeholder="Enter number of packages"
              error={errors.packageCount?.message}
              disabled={isSubmitting}
              {...register('packageCount', { valueAsNumber: true })}
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status Check
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all
                      ${option.value === 'normal'
                        ? 'border-green-200 bg-green-50/50 text-green-700 hover:border-green-300 hover:bg-green-50 hover:shadow-sm dark:border-green-900/50 dark:bg-green-900/10 dark:text-green-300'
                        : option.value === 'package_damaged'
                          ? 'border-amber-200 bg-amber-50/50 text-amber-700 hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300'
                          : 'border-red-200 bg-red-50/50 text-red-700 hover:border-red-300 hover:bg-red-50 hover:shadow-sm dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('statusCheck')}
                      disabled={isSubmitting}
                      className="absolute right-2 top-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                Customs Check
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {customsOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all
                      ${option.value === 'passed'
                        ? 'border-green-200 bg-green-50/50 text-green-700 hover:border-green-300 hover:bg-green-50 hover:shadow-sm dark:border-green-900/50 dark:bg-green-900/10 dark:text-green-300'
                        : option.value === 'on_hold'
                          ? 'border-amber-200 bg-amber-50/50 text-amber-700 hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300'
                          : 'border-blue-200 bg-blue-50/50 text-blue-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('customsCheck')}
                      disabled={isSubmitting}
                      className="absolute right-2 top-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 w-24 gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || remainingPackages <= 0}
              className="h-8 w-24 gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
