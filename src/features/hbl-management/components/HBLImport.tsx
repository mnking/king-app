import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ExcelImportWizard } from '@/shared/components/excel-import';
import { Button } from '@/shared/components/ui/Button';
import { HBL_IMPORT_TEMPLATE } from '@/features/hbl-management/import/templates/hbl-import.template';
import { createHblImportValidator } from '@/features/hbl-management/import/validators/validate-hbl-import';
import type { ExcelParseContext } from '@/shared/schemas/excel-import';
import ForwarderModal from '@/features/forwarder/components/ForwarderModal';
import { useCreateForwarder } from '@/features/forwarder/hooks/use-forwarders-query';
import { ContainerNumberPicker } from '@/features/containers/components/ContainerNumberPicker';
import { containerFieldSchema } from '@/features/containers/schemas';
import { containerQueryKeys } from '@/features/containers';
import { toastService } from '@/shared/services/toast/toast.service';
import { parseExcelDmyDate } from '@/shared/utils/excel-date';
import {
  forwardersApi,
  hblsApi,
  type ImportHblMappingDto,
  type ImportHistoryResponseDto,
} from '@/services/apiForwarder';

const containerQuickCreateSchema = z.object({
  container: containerFieldSchema,
});

type ContainerQuickCreateForm = z.infer<typeof containerQuickCreateSchema>;

const getLabelCellText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getCellText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }
  return null;
};

const normalizeHeaderLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/:$/, '');

const findRawValueNextToLabel = (aoa: unknown[][], label: string): unknown | null => {
  const target = normalizeHeaderLabel(label);

  for (const row of aoa) {
    const cells = Array.isArray(row) ? row : [];
    for (let i = 0; i < cells.length; i += 1) {
      const cell = getLabelCellText(cells[i]);
      if (!cell) continue;
      if (normalizeHeaderLabel(cell) === target) {
        return cells[i + 1] ?? null;
      }
    }
  }
  return null;
};

const formatImportErrorDetail = (detail: unknown): string => {
  if (detail === null || detail === undefined) return 'Import failed';
  if (typeof detail === 'string') return detail;
  if (typeof detail !== 'object') return String(detail);

  const record = detail as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : null;
  const error = typeof record.error === 'string' ? record.error : null;
  const rowIndex =
    typeof record.rowIndex === 'number'
      ? record.rowIndex
      : typeof record.row === 'number'
        ? record.row
        : null;
  const hblCode = typeof record.hblCode === 'string' ? record.hblCode : null;
  const field = typeof record.field === 'string' ? record.field : null;

  const meta: string[] = [];
  if (rowIndex !== null) meta.push(`Row ${rowIndex}`);
  if (hblCode) meta.push(`HBL ${hblCode}`);
  if (field) meta.push(`Field ${field}`);

  if (message) return message;
  if (error) return meta.length ? `${meta.join(' · ')}: ${error}` : error;

  if (meta.length) return `${meta.join(' · ')}: Error`;
  return 'Import failed';
};

const getImportErrorMessage = (history?: ImportHistoryResponseDto | null): string => {
  const details = history?.errorDetails;
  if (Array.isArray(details) && details.length > 0) {
    return formatImportErrorDetail(details[0]);
  }
  return 'Import failed';
};

export default function HBLImport() {
  const navigate = useNavigate();
  const [defaultMapping, setDefaultMapping] = useState<ImportHblMappingDto | null>(null);
  const [latestHistory, setLatestHistory] = useState<ImportHistoryResponseDto | null>(null);
  const [issuerId, setIssuerId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
  const [isUploadLocked, setIsUploadLocked] = useState(false);
  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);
  const [isForwarderModalOpen, setIsForwarderModalOpen] = useState(false);
  const [containerResolveInfo, setContainerResolveInfo] = useState<string>('');
  const uploadAttemptRef = useRef(0);
  const validator = useMemo(() => createHblImportValidator(defaultMapping), [defaultMapping]);
  const createForwarder = useCreateForwarder();
  const queryClient = useQueryClient();

  const containerForm = useForm<ContainerQuickCreateForm>({
    resolver: zodResolver(containerQuickCreateSchema),
    defaultValues: { container: { id: null, number: '', typeCode: null } },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!isContainerModalOpen) return;
    setContainerResolveInfo('');
    containerForm.reset({ container: { id: null, number: '', typeCode: null } });
  }, [containerForm, isContainerModalOpen]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await hblsApi.getDefaultImportMapping();
        if (!cancelled) setDefaultMapping(response.data);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetImportSession = useCallback(async () => {
    // Invalidate all in-flight async updates from previous upload attempts.
    uploadAttemptRef.current += 1;
    setLatestHistory(null);
    setIssuerId(null);
    setActiveAttemptId(null);
    await queryClient.cancelQueries({ queryKey: ['hbl-import-history'] });
    queryClient.removeQueries({ queryKey: ['hbl-import-history'] });
  }, [queryClient]);

  const handleResetStatus = useCallback(() => {
    void resetImportSession();
  }, [resetImportSession]);

  const resolveIssuerIdFromFile = useCallback(
    async (file: File): Promise<string | null> => {
      const forwarderCodeLabel = defaultMapping?.header?.forwarderCode ?? 'Mã Đại lý:';

      try {
        const XLSX = await import('xlsx');
        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames?.[0];
        if (!sheetName) return null;
        const ws = workbook.Sheets[sheetName];
        if (!ws) return null;

        const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const forwarderCodeRaw = findRawValueNextToLabel(aoa, forwarderCodeLabel);
        const forwarderCode = getCellText(forwarderCodeRaw);
        if (!forwarderCode) return null;

        const forwarder = await forwardersApi.getByCode(forwarderCode);
        return forwarder.data.id;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    [defaultMapping],
  );

  const latestHistoryQuery = useQuery({
    queryKey: ['hbl-import-history', issuerId, activeAttemptId],
    queryFn: async () => {
      if (!issuerId) {
        throw new Error('Missing issuerId for import history');
      }
      const response = await hblsApi.getImportHistoryLatest(issuerId);
      return response.data;
    },
    enabled: Boolean(issuerId && activeAttemptId !== null),
    refetchInterval: (query) => {
      const status = (query.state.data as ImportHistoryResponseDto | undefined)?.status;
      if (!issuerId || activeAttemptId === null) return false;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 2_000;
    },
    refetchIntervalInBackground: true,
    retry: (failureCount) => failureCount < 2,
  });

  const displayHistory = latestHistoryQuery.data ?? latestHistory;
  const externalErrors = useMemo(() => {
    if (!displayHistory || displayHistory.status !== 'FAILED') return [];
    const details = displayHistory.errorDetails;
    if (!Array.isArray(details) || details.length === 0) return [];
    return details.map(formatImportErrorDetail);
  }, [displayHistory]);

  const statusSummary = useMemo(() => {
    if (!displayHistory) return null;
    const isCompleted = displayHistory.status === 'COMPLETED';

    return (
      <>
        <div className="font-medium">Latest import status</div>
        <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
          <div>Status: {displayHistory.status}</div>
          <div>Process ID: {displayHistory.processImportId ?? '—'}</div>
          <div>Total rows: {displayHistory.totalRows}</div>
          {isCompleted && (
            <div>
              Success/Failed: {displayHistory.successCount}/{displayHistory.failedCount}
            </div>
          )}
        </div>
      </>
    );
  }, [displayHistory]);

  const externalStatusText = useMemo(() => {
    if (!displayHistory) return null;
    if (displayHistory.status === 'PROCESSING') return 'Processing import...';
    if (displayHistory.status === 'INIT') return 'Queued for processing...';
    return null;
  }, [displayHistory]);

  useEffect(() => {
    if (displayHistory?.status === 'COMPLETED') {
      setIsUploadLocked(true);
    }
  }, [displayHistory?.status]);

  const renderHeaderInfo = useCallback(
    (context: ExcelParseContext) => {
      const labels = {
        forwarderCode: defaultMapping?.header?.forwarderCode ?? 'Mã Đại lý:',
        forwarderName: defaultMapping?.header?.forwarderName ?? 'Tên Đại lý:',
        containerNumber: defaultMapping?.header?.containerNumber ?? 'Số cont:',
        mbl: defaultMapping?.header?.mbl ?? 'Số Master Bill:',
        vesselName: defaultMapping?.header?.vesselName ?? 'Tên Tàu:',
        containerSize: defaultMapping?.header?.containerSize ?? 'Kích cỡ:',
        sealNumber: defaultMapping?.header?.sealNumber ?? 'Số Seal:',
        voyageNumber: defaultMapping?.header?.voyageNumber ?? 'Số chuyến:',
        arrivalDate: defaultMapping?.header?.arrivalDate ?? 'Ngày cập:',
      };

      const getHeaderText = (label: string) => getCellText(findRawValueNextToLabel(context.headerRows, label));
      const getHeaderDateDisplay = (label: string) => {
        const raw = findRawValueNextToLabel(context.headerRows, label);
        const parsed = parseExcelDmyDate(raw);
        return parsed?.display ?? getCellText(raw);
      };

      const entries = [
        { label: 'Mã đại lý', value: getHeaderText(labels.forwarderCode) },
        { label: 'Tên đại lý', value: getHeaderText(labels.forwarderName) },
        { label: 'Số cont', value: getHeaderText(labels.containerNumber) },
        { label: 'Số MBL', value: getHeaderText(labels.mbl) },
        { label: 'Tên tàu', value: getHeaderText(labels.vesselName) },
        { label: 'Kích cỡ', value: getHeaderText(labels.containerSize) },
        { label: 'Số seal', value: getHeaderText(labels.sealNumber) },
        { label: 'Số chuyến', value: getHeaderText(labels.voyageNumber) },
        { label: 'Ngày cập', value: getHeaderDateDisplay(labels.arrivalDate) },
      ];

      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Thông tin header
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((item) => (
              <div key={item.label}>
                <div className="text-slate-500 dark:text-slate-400">{item.label}</div>
                <div className="text-slate-900 dark:text-slate-100">{item.value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    [defaultMapping],
  );

  return (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-screen-2xl min-w-0 px-4 py-6 sm:px-6">
        <div className="mb-6">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate('/hbl-management')}
            className="mb-4 bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/30 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 focus:ring-2 focus:ring-blue-400/60 dark:bg-blue-500 dark:text-white dark:shadow-blue-500/30 dark:ring-blue-400/50 dark:hover:bg-blue-400 dark:hover:shadow-blue-400/40 dark:focus:ring-blue-300/70"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to HBL management
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">HBL Import</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload an Excel file, validate, then submit for import.
          </p>
        </div>

        <div className="w-full min-w-0 rounded-lg bg-white p-6 shadow dark:bg-slate-900">
          <ExcelImportWizard
            template={HBL_IMPORT_TEMPLATE}
            validate={validator}
            templateUrl={encodeURI('/templates/4. CSNU7679146.xlsx')}
            templateFileName="HBL Import Template.xlsx"
            renderHeaderInfo={renderHeaderInfo}
            statusSummary={statusSummary}
            externalErrors={externalErrors}
            externalStatusText={externalStatusText}
            onResetStatus={handleResetStatus}
            extraActions={
              <>
                <Button variant="outline" onClick={() => setIsContainerModalOpen(true)}>
                  <Package className="mr-2 h-4 w-4" />
                  Create container
                </Button>
                <Button variant="outline" onClick={() => setIsForwarderModalOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create forwarder
                </Button>
              </>
            }
            isUploadLocked={isUploadLocked}
            onFileChange={() => setIsUploadLocked(false)}
            onSubmit={async ({ file, data }) => {
              void data; // Backend parses XLSX; client-side data is preview-only.
              await resetImportSession();

              const attemptId = uploadAttemptRef.current + 1;
              uploadAttemptRef.current = attemptId;
              setActiveAttemptId(attemptId);

              try {
                const issuerIdPromise = resolveIssuerIdFromFile(file).then((resolvedId) => {
                  if (uploadAttemptRef.current !== attemptId) return null;
                  setIssuerId(resolvedId);
                  return resolvedId;
                });

                const initResponse = await hblsApi.import({ file, validateOnly: true });
                if (uploadAttemptRef.current !== attemptId) return;
                setLatestHistory(initResponse.data);

                const processImportId = initResponse.data.processImportId;
                if (!processImportId) {
                  throw new Error('Missing processImportId from validation response');
                }

                const confirmResponse = await hblsApi.import({
                  file,
                  validateOnly: false,
                  processImportId,
                });
                if (uploadAttemptRef.current !== attemptId) return;
                setLatestHistory(confirmResponse.data);

                if (confirmResponse.data.status === 'FAILED') {
                  throw new Error(getImportErrorMessage(confirmResponse.data));
                }

                if (confirmResponse.data.status === 'COMPLETED') {
                  setIsUploadLocked(true);
                  toast.success(`Import completed: totalRows=${confirmResponse.data.totalRows}`);
                  return;
                }

                await issuerIdPromise;
                if (uploadAttemptRef.current !== attemptId) return;

                toast.success(`Import submitted: totalRows=${confirmResponse.data.totalRows}`);
              } catch (e) {
                if (uploadAttemptRef.current !== attemptId) return;
                const message = e instanceof Error ? e.message : 'Import failed';
                toast.error(message);
                throw e;
              }
            }}
          />
        </div>
      </div>

      <ForwarderModal
        open={isForwarderModalOpen}
        mode="create"
        forwarder={null}
        onClose={() => setIsForwarderModalOpen(false)}
        onSave={async (payload) => {
          try {
            await createForwarder.mutateAsync(payload);
            toast.success('Forwarder created');
            setIsForwarderModalOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create forwarder');
            throw err;
          }
        }}
        isSaving={createForwarder.isPending}
      />

      {isContainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create container</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Search a container; if not found, create it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsContainerModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                <Controller
                  control={containerForm.control}
                  name="container"
                  render={({ field, fieldState }) => (
                    <ContainerNumberPicker
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      onResolved={({ value, existed }) => {
                        const message = `Container ${existed ? 'found' : 'created'}: ${value.number}`;
                        setContainerResolveInfo(
                          `Container ${existed ? 'found' : 'created'}: ${value.number} (ID: ${value.id}, Type: ${value.typeCode})`
                        );
                        if (existed) {
                          toastService.info(message);
                        } else {
                          toastService.success(message);
                          queryClient.invalidateQueries({ queryKey: containerQueryKeys.all });
                        }
                      }}
                      required
                      autoFocus
                    />
                  )}
                />
              </div>

              {containerResolveInfo && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-900 dark:text-blue-300">{containerResolveInfo}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContainerModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
