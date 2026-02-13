import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { CellValidationError } from '@/shared/schemas/excel-import';

export function ExcelValidationSummary(props: { errorCount: number; errors?: CellValidationError[] }) {
  const { errorCount, errors } = props;

  if (errorCount === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200">No validation errors.</p>
        </div>
      </div>
    );
  }

  const topErrors = (errors ?? []).slice(0, 5);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <div className="space-y-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Found {errorCount} issue(s). Please fix the Excel file.
          </p>

          {topErrors.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
              {topErrors.map((e, idx) => (
                <li key={`${e.rowNumber}:${e.colIndex}:${idx}`}>
                  Row {e.rowNumber}, column {e.colLetter}: {e.message}
                </li>
              ))}
              {errorCount > topErrors.length && <li>…and {errorCount - topErrors.length} more</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExcelValidationSummary;
