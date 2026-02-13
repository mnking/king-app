import React, { useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertCircle, ArrowLeft, CheckCircle2, PackageOpen, Clock, Pencil, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import {
  useCompleteLineInspection,
  useLineInspectionDetail,
  useRecordPackageInspection,
  useUpdateLineInspection,
} from '../hooks';
import type { LineInspection, PackageCheckData } from '../types';
import { InboundPackageCheckingModal } from './InboundPackageCheckingModal';
import { LineCompletionSchema } from '../schemas';

interface LineInspectionDetailProps {
  lineInspectionId: string;
  line?: Partial<LineInspection> | null;
  onCheckPackages?: () => void;
  onLineUpdated?: (lineInspectionId: string) => void;
  onCompleteLine?: () => void;
  onBack: () => void;
  sessionId?: string;
}

type LineCompletionFormValues = z.infer<typeof LineCompletionSchema>;

const cargoTypeOptions = [
  { value: '', label: 'Select cargo type' },
  { value: 'GENERAL', label: 'General' },
  { value: 'DANGEROUS', label: 'Dangerous' },
  { value: 'REFRIGERATED', label: 'Refrigerated' },
  { value: 'OVERSIZED', label: 'Oversized' },
  { value: 'LIQUID', label: 'Liquid' },
  { value: 'BULK', label: 'Bulk' },
];

export const LineInspectionDetail: React.FC<LineInspectionDetailProps> = ({
  lineInspectionId,
  line: initialLine,
  onCheckPackages,
  onLineUpdated,
  onCompleteLine,
  onBack,
  sessionId,
}) => {
  const formatCargoQuantity = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (Number.isInteger(value)) return String(value);
    const asString = String(value);
    return /\.0+$/.test(asString) ? asString.replace(/\.0+$/, '') : asString;
  };

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const recordPackageInspection = useRecordPackageInspection();
  const completeLineInspection = useCompleteLineInspection();
  const updateLineInspection = useUpdateLineInspection();
  const {
    data: line,
    isLoading,
    isError,
    refetch,
  } = useLineInspectionDetail(lineInspectionId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineCompletionFormValues>({
    resolver: zodResolver(LineCompletionSchema),
  });

  const mergedLine = useMemo(() => {
    return { ...(initialLine ?? {}), ...(line ?? {}) };
  }, [initialLine, line]);

  const packageInspections = useMemo(() => {
    if (Array.isArray(line?.packageInspections)) {
      return line.packageInspections;
    }
    if (Array.isArray(mergedLine.packageInspections)) {
      return mergedLine.packageInspections;
    }
    return [];
  }, [line?.packageInspections, mergedLine.packageInspections]);

  const checkedFromInspections = useMemo(() => {
    if (packageInspections.length === 0) return 0;
    return packageInspections.reduce(
      (sum: number, pkg: any) => sum + (pkg.packageCount ?? 0),
      0,
    );
  }, [packageInspections]);

  const derivedCounts = useMemo(() => {
    const actual =
      typeof line?.actualPackageCount === 'number'
        ? line.actualPackageCount
        : typeof line?.totalPackages === 'number'
          ? line.totalPackages
          : typeof mergedLine.actualPackageCount === 'number'
            ? mergedLine.actualPackageCount
            : typeof mergedLine.totalPackages === 'number'
              ? mergedLine.totalPackages
              : 0;
    const checked =
      packageInspections.length > 0
        ? checkedFromInspections
        : typeof line?.checkedPackages === 'number'
          ? line.checkedPackages
          : typeof mergedLine.checkedPackages === 'number'
            ? mergedLine.checkedPackages
            : 0;
    return {
      actual,
      checked,
      remaining: Math.max(actual - checked, 0),
    };
  }, [
    checkedFromInspections,
    line,
    mergedLine.actualPackageCount,
    mergedLine.checkedPackages,
    mergedLine.totalPackages,
    packageInspections.length,
  ]);

  const groupedPackageInspections = useMemo(() => {
    if (!Array.isArray(packageInspections) || packageInspections.length === 0) {
      return [];
    }

    const normalizeKey = (value: unknown) =>
      typeof value === 'string' ? value.toLowerCase() : '';
    const normalizeDisplay = (value: unknown) =>
      typeof value === 'string' ? value.toUpperCase() : undefined;
    const groups = new Map<string, any>();

    packageInspections.forEach((item: any) => {
      const rawCondition =
        item.conditionStatus ?? item.statusCheck ?? item.statusCheck;
      const rawRegulatory =
        item.regulatoryStatus ?? item.customsCheck ?? item.customsCheck;
      const condition = normalizeDisplay(rawCondition);
      const regulatory = normalizeDisplay(rawRegulatory);
      const key = `${normalizeKey(rawCondition)}|${normalizeKey(rawRegulatory)}`;

      const existing = groups.get(key);
      if (existing) {
        existing.packageCount += item.packageCount ?? 0;
        return;
      }

      groups.set(key, {
        ...item,
        condition,
        regulatory,
        packageCount: item.packageCount ?? 0,
        groupKey: key,
      });
    });

    return Array.from(groups.values()).sort((a, b) => {
      const byCondition = normalizeKey(a.condition).localeCompare(normalizeKey(b.condition));
      if (byCondition !== 0) {
        return byCondition;
      }
      return normalizeKey(a.regulatory).localeCompare(normalizeKey(b.regulatory));
    });
  }, [packageInspections]);

  useEffect(() => {
    if (mergedLine) {
      reset({
        actualPackageCount: derivedCounts.actual,
        actualCargoQuantity: mergedLine.actualCargoQuantity ?? 0,
        regulatoryCargoType: mergedLine.regulatoryCargoType ?? '',
        regulatoryCargoDescription: mergedLine.regulatoryCargoDescription ?? '',
      });
    }
  }, [derivedCounts.actual, mergedLine, reset]);

  const isCompleted =
    mergedLine?.checkedFlag === true ||
    mergedLine?.checkedFlag === 'yes' ||
    (mergedLine?.checkedFlag as any) === 'checked';

  const handleSavePackage = async (data: PackageCheckData) =>
    new Promise<void>((resolve, reject) => {
      recordPackageInspection.mutate(
        {
          lineInspectionId,
          sessionId: sessionId ?? mergedLine?.sessionId,
          data,
        },
        {
          onSuccess: () => {
            onLineUpdated?.(lineInspectionId);
            void refetch().finally(() => {
              resolve();
            });
          },
          onError: (error) => {
            reject(error);
          },
        },
      );
    });

  const onSubmitCompletion = handleSubmit((values) => {
    if (!mergedLine) return;
    if (derivedCounts.checked !== values.actualPackageCount) {
      toast.error('Checked packages must equal actual package count');
      return;
    }
    completeLineInspection.mutate(
      {
        lineInspectionId,
        sessionId: mergedLine.sessionId,
        payload: values,
      },
      {
        onSuccess: () => {
          onCompleteLine?.();
        },
      },
    );
  });

  const onSubmitUpdate = handleSubmit((values) => {
    updateLineInspection.mutate(
      {
        lineInspectionId,
        sessionId: sessionId ?? mergedLine?.sessionId,
        payload: values,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          onLineUpdated?.(lineInspectionId);
          void refetch();
        },
      },
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !mergedLine) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Failed to load line inspection.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-blue-700 underline hover:text-blue-800 dark:text-blue-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to session
        </button>
        {isCompleted ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-800 dark:bg-green-900/30 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            <Clock className="h-4 w-4" />
            Pending
          </span>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
              Line
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              #{mergedLine.lineNumber ?? '—'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
              Checked Packages{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {derivedCounts.checked}/{derivedCounts.actual}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Packing List Line
                </p>
              </div>
              <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Package Count
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {mergedLine.totalPackages ?? '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cargo Quantity
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {mergedLine.quantity != null
                      ? `${formatCargoQuantity((mergedLine as any).quantity)} ${(mergedLine as any).unitOfMeasure ?? ''}`.trim()
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cargo Type
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {(mergedLine as any).cargoType ?? '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cargo Description
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {(mergedLine as any).commodityDescription ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Line Inspection Actuals
                </p>
                {!isCompleted && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            reset();
                            setIsEditing(false);
                          }}
                          className="h-8 w-24 gap-2"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={onSubmitUpdate}
                          className="h-8 w-24 gap-2"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-8 w-24 gap-2 shadow-sm shadow-blue-500/30 hover:shadow-blue-500/40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {isEditing ? (
                <>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      label="Package Count"
                      error={errors.actualPackageCount?.message}
                      disabled={isCompleted}
                      {...register('actualPackageCount', { valueAsNumber: true })}
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      label="Cargo Quantity"
                      error={errors.actualCargoQuantity?.message}
                      disabled={isCompleted}
                      {...register('actualCargoQuantity', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Cargo Type
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        disabled={isCompleted}
                        {...register('regulatoryCargoType')}
                      >
                        {cargoTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Cargo Description"
                      disabled={isCompleted}
                      {...register('regulatoryCargoDescription')}
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-200 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Package Count
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {mergedLine.actualPackageCount ?? '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cargo Quantity
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {mergedLine.actualCargoQuantity != null
                        ? `${formatCargoQuantity(mergedLine.actualCargoQuantity)} ${(mergedLine as any).unitOfMeasure ?? ''}`.trim()
                        : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cargo Type
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {mergedLine.regulatoryCargoType ?? '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cargo Description
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {mergedLine.regulatoryCargoDescription ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Package Inspections
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <PackageOpen className="h-4 w-4" />
                {groupedPackageInspections.length} rows
              </div>
            </div>
            {groupedPackageInspections.length > 0 ? (
              <div className="space-y-3">
                {groupedPackageInspections.map((item: any) => {
                  const condition = item.condition;
                  const regulatory = item.regulatory;
                  const conditionStyle =
                    condition === 'NORMAL' || condition === 'normal'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100'
                      : condition === 'PACKAGE_DAMAGED' || condition === 'package_damaged'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100';
                  const regulatoryStyle =
                    regulatory === 'PASSED' || regulatory === 'passed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100'
                      : regulatory === 'ON_HOLD' || regulatory === 'on_hold'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100';
                  return (
                    <div
                      key={item.groupKey}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Packages
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-50">
                          {item.packageCount}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                          Status Check
                          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${conditionStyle}`}>
                            {condition ?? '—'}
                          </span>
                          Customs Check
                          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${regulatoryStyle}`}>
                            {regulatory ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                No package inspections recorded yet
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCompleted || derivedCounts.remaining <= 0}
              onClick={() => {
                onCheckPackages?.();
                setIsPackageModalOpen(true);
              }}
              className="gap-2"
            >
              <PackageOpen className="h-4 w-4" />
              Check Packages
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={completeLineInspection.isPending}
              disabled={isCompleted || completeLineInspection.isSuccess}
              onClick={onSubmitCompletion}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Line
            </Button>
          </div>
        </div>
      </div>

      <InboundPackageCheckingModal
        lineInspectionId={lineInspectionId}
        lineNumber={mergedLine.lineNumber}
        remainingPackages={derivedCounts.remaining}
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        onSave={handleSavePackage}
      />
    </div>
  );
};
