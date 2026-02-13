import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FileSearch, Loader2, Upload } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { ExcelFileDropzone } from '@/shared/components/ui/ExcelFileDropzone';
import { ExcelSheetSelector } from './ExcelSheetSelector';
import { ExcelPreviewTable } from './ExcelPreviewTable';
import { ExcelValidationSummary } from './ExcelValidationSummary';

import { useExcelWorkbookParser } from '@/shared/hooks/useExcelWorkbookParser';
import type {
  CellValidationError,
  ExcelParseContext,
  ExcelTemplate,
  ExcelValidator,
  ParsedRow,
} from '@/shared/schemas/excel-import';

export function ExcelImportWizard<T extends Record<string, unknown>>(props: {
  template: ExcelTemplate;
  validate: ExcelValidator<T>;
  onSubmit: (params: { file: File; data: T[] }) => Promise<void>;
  templateUrl?: string;
  templateFileName?: string;
  renderHeaderInfo?: (context: ExcelParseContext) => ReactNode;
  extraActions?: ReactNode;
  onFileChange?: (file: File | null) => void;
  isUploadLocked?: boolean;
  externalErrors?: string[];
  statusSummary?: ReactNode;
  externalStatusText?: string | null;
  onResetStatus?: () => void;
}) {
  const {
    template,
    validate,
    onSubmit,
    templateUrl,
    templateFileName,
    renderHeaderInfo,
    extraActions,
    onFileChange,
    isUploadLocked,
    externalErrors,
    statusSummary,
    externalStatusText,
    onResetStatus,
  } = props;

  const parser = useExcelWorkbookParser<T>({ template });

  const [parseRows, setParseRows] = useState<Array<ParsedRow<T>>>([]);
  const [errors, setErrors] = useState<CellValidationError[]>([]);
  const [parseContext, setParseContext] = useState<ExcelParseContext | null>(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errorCount = errors.length;

  const doParseAndValidate = useCallback(async () => {
    if (parser.status !== 'ready') return;

    setIsParsing(true);
    setSubmitError(null);
    onResetStatus?.();

    try {
      const result = await parser.parseSelectedSheet();
      if (!result) return;

      setParseRows(result.rows);
      setParseContext(result.context);
      const errs = validate({ rows: result.rows, context: result.context });
      setErrors(errs);
      setHasValidated(true);
    } finally {
      setIsParsing(false);
    }
  }, [onResetStatus, parser, validate]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setParseRows([]);
      setErrors([]);
      setParseContext(null);
      setHasValidated(false);
      setSubmitError(null);
      onResetStatus?.();

      onFileChange?.(file);
      await parser.loadFile(file);
    },
    [onFileChange, onResetStatus, parser],
  );

  const handleSheetChange = useCallback(
    (sheetName: string) => {
      parser.selectSheet(sheetName);
      setParseRows([]);
      setErrors([]);
      setParseContext(null);
      setHasValidated(false);
      setSubmitError(null);
      onResetStatus?.();
    },
    [onResetStatus, parser],
  );

  const canParse = !!parser.file && parser.status === 'ready' && !isSubmitting && !isParsing;
  const canSubmit =
    !!parser.file &&
    parseRows.length > 0 &&
    errorCount === 0 &&
    !isSubmitting &&
    !isParsing &&
    !isUploadLocked;

  const handleSubmit = useCallback(async () => {
    if (!parser.file) return;
    if (errorCount > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    onResetStatus?.();

    try {
      const data = parseRows.map((r) => r.data);
      await onSubmit({ file: parser.file, data });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [onResetStatus, parser.file, errorCount, parseRows, onSubmit]);

  const handleReset = useCallback(() => {
    parser.reset();
    setParseRows([]);
    setErrors([]);
    setParseContext(null);
    setHasValidated(false);
    setSubmitError(null);
    onResetStatus?.();
    onFileChange?.(null);
  }, [onFileChange, onResetStatus, parser]);

  const uploadLabel = isSubmitting ? 'Uploading...' : 'Upload';
  const statusText = isSubmitting ? 'Uploading...' : isParsing ? 'Parsing & validating...' : null;

  const errorMessages = useMemo(() => {
    const list = [submitError, ...(externalErrors ?? [])].filter(
      (message): message is string => Boolean(message),
    );
    return Array.from(new Set(list));
  }, [submitError, externalErrors]);

  const statusMessages = useMemo(() => {
    const list = [statusText, externalStatusText].filter(
      (message): message is string => Boolean(message),
    );
    return Array.from(new Set(list));
  }, [statusText, externalStatusText]);

  const showStatusPanel =
    statusMessages.length > 0 || errorMessages.length > 0 || hasValidated || Boolean(statusSummary);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-lg font-medium text-slate-900 dark:text-slate-100">
          1. Select Excel File
        </h3>
        <ExcelFileDropzone
          onFileSelect={handleFileSelect}
          onClear={handleReset}
          allowedExtensions={template.allowedExtensions}
          maxFileSizeMb={template.maxFileSizeMb}
          selectedFile={parser.file}
          templateUrl={templateUrl}
          templateFileName={templateFileName}
        />
      </section>

      {parser.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{parser.error}</p>
        </div>
      )}

      {parser.status === 'ready' && parser.selectedSheet && (
        <section className="space-y-3">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">2. Select Sheet</h3>
          <ExcelSheetSelector
            sheetNames={parser.sheetNames}
            value={parser.selectedSheet}
            onChange={handleSheetChange}
          />
        </section>
      )}

      {parser.status === 'ready' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              3. Preview &amp; Validation
            </h3>

            <div className="flex flex-wrap gap-3">
              {extraActions}
              <Button variant="secondary" onClick={doParseAndValidate} disabled={!canParse}>
                <FileSearch className="mr-2 h-4 w-4" />
                Parse &amp; Validate
              </Button>

              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isSubmitting}
              >
                {!isSubmitting && <Upload className="mr-2 h-4 w-4" />}
                {uploadLabel}
              </Button>
            </div>
          </div>

          {showStatusPanel && (
            <div className="space-y-3">
              {statusMessages.length > 0 && (
                <div
                  className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{statusMessages.join(' / ')}</span>
                </div>
              )}

              {statusSummary && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {statusSummary}
                </div>
              )}

              {errorMessages.length > 0 && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
                  role="alert"
                >
                  <div className="font-medium">Action required</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {errorMessages.slice(0, 5).map((message, index) => (
                      <li key={`${message}-${index}`}>{message}</li>
                    ))}
                    {errorMessages.length > 5 && (
                      <li>...and {errorMessages.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {hasValidated && <ExcelValidationSummary errorCount={errorCount} errors={errors} />}
            </div>
          )}

          {renderHeaderInfo && parseContext && (
            <div>{renderHeaderInfo(parseContext)}</div>
          )}
          <ExcelPreviewTable columns={template.columns} rows={parseRows} errors={errors} />
        </section>
      )}
    </div>
  );
}

export default ExcelImportWizard;
