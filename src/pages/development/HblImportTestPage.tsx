import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ExcelImportWizard } from '@/shared/components/excel-import';
import { HBL_IMPORT_TEMPLATE } from '@/features/hbl-management/import/templates/hbl-import.template';
import { createHblImportValidator } from '@/features/hbl-management/import/validators/validate-hbl-import';
import type { ExcelParseContext } from '@/shared/schemas/excel-import';
import {
  forwardersApi,
  hblsApi,
  type ImportHblMappingDto,
  type ImportHistoryResponseDto,
} from '@/services/apiForwarder';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getStringCell = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeHeaderLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/:$/, '');

const findValueNextToLabel = (aoa: unknown[][], label: string): string | null => {
  const target = normalizeHeaderLabel(label);

  for (const row of aoa) {
    const cells = Array.isArray(row) ? row : [];
    for (let i = 0; i < cells.length; i += 1) {
      const cell = getStringCell(cells[i]);
      if (!cell) continue;
      if (normalizeHeaderLabel(cell) === target) {
        return getStringCell(cells[i + 1]);
      }
    }
  }
  return null;
};

export default function HblImportTestPage() {
  const [defaultMapping, setDefaultMapping] = useState<ImportHblMappingDto | null>(null);
  const [latestHistory, setLatestHistory] = useState<ImportHistoryResponseDto | null>(null);
  const [isUploadLocked, setIsUploadLocked] = useState(false);
  const validator = useMemo(() => createHblImportValidator(defaultMapping), [defaultMapping]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await hblsApi.getDefaultImportMapping();
        if (!cancelled) setDefaultMapping(response.data);
      } catch (e) {
        // Dev page only; fall back to hardcoded label matching.
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
        const forwarderCode = findValueNextToLabel(aoa, forwarderCodeLabel);
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

  const pollLatestHistory = useCallback(async (issuerId: string) => {
    const deadlineMs = 60_000;
    const intervalMs = 2_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < deadlineMs) {
      try {
        const response = await hblsApi.getImportHistoryLatest(issuerId);
        setLatestHistory(response.data);

        if (response.data.status === 'COMPLETED') return response.data;
        if (response.data.status === 'FAILED') throw new Error('Import failed');
      } catch (e) {
        console.error(e);
      }

      await sleep(intervalMs);
    }

    throw new Error('Timed out while waiting for import completion');
  }, []);

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

      const entries = [
        { label: 'Mã đại lý', value: findValueNextToLabel(context.headerRows, labels.forwarderCode) },
        { label: 'Tên đại lý', value: findValueNextToLabel(context.headerRows, labels.forwarderName) },
        { label: 'Số cont', value: findValueNextToLabel(context.headerRows, labels.containerNumber) },
        { label: 'Số MBL', value: findValueNextToLabel(context.headerRows, labels.mbl) },
        { label: 'Tên tàu', value: findValueNextToLabel(context.headerRows, labels.vesselName) },
        { label: 'Kích cỡ', value: findValueNextToLabel(context.headerRows, labels.containerSize) },
        { label: 'Số seal', value: findValueNextToLabel(context.headerRows, labels.sealNumber) },
        { label: 'Số chuyến', value: findValueNextToLabel(context.headerRows, labels.voyageNumber) },
        { label: 'Ngày cập', value: findValueNextToLabel(context.headerRows, labels.arrivalDate) },
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
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">HBL Import (Dev Test)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload an Excel file, select sheet, validate, then upload (real backend 2-step).
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
          {latestHistory && (
            <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <div className="font-medium">Latest import status</div>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <div>Status: {latestHistory.status}</div>
                <div>Process ID: {latestHistory.processImportId ?? '—'}</div>
                <div>Total rows: {latestHistory.totalRows}</div>
                <div>
                  Success/Failed: {latestHistory.successCount}/{latestHistory.failedCount}
                </div>
              </div>
            </div>
          )}

          <ExcelImportWizard
            template={HBL_IMPORT_TEMPLATE}
            validate={validator}
            templateUrl={encodeURI('/templates/4. CSNU7679146.xlsx')}
            templateFileName="4. CSNU7679146.xlsx"
            renderHeaderInfo={renderHeaderInfo}
            isUploadLocked={isUploadLocked}
            onFileChange={() => setIsUploadLocked(false)}
            onSubmit={async ({ file, data }) => {
              void data; // Backend parses XLSX; client-side data is preview-only.

              setLatestHistory(null);

              try {
                const issuerIdPromise = resolveIssuerIdFromFile(file);

                const initResponse = await hblsApi.import({ file, validateOnly: true });
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
                setLatestHistory(confirmResponse.data);

                const issuerId = await issuerIdPromise;
                if (issuerId) {
                  try {
                    const finalHistory = await pollLatestHistory(issuerId);
                    if (finalHistory.status === 'COMPLETED') {
                      setIsUploadLocked(true);
                    }
                    toast.success(`Import completed: totalRows=${finalHistory.totalRows}`);
                  } catch (e) {
                    console.error(e);
                    toast.success(`Import submitted: totalRows=${confirmResponse.data.totalRows}`);
                  }
                  return;
                }

                if (confirmResponse.data.status === 'COMPLETED') {
                  setIsUploadLocked(true);
                }
                toast.success(`Import submitted: totalRows=${confirmResponse.data.totalRows}`);
              } catch (e) {
                const message = e instanceof Error ? e.message : 'Import failed';
                toast.error(message);
                throw e;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
