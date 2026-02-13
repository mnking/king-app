import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  ImportWarehouseReceivingManualFields,
  RenderIssue,
} from '@/shared/features/form-printing';
import { ImportWarehouseReceivingManualFields as ManualFields } from './ImportWarehouseReceivingManualFields';
import { importWarehouseReceivingSchema } from '../../schemas/import-warehouse-receiving.schema';

interface ImportWarehouseReceivingModalProps {
  open: boolean;
  issues: RenderIssue[];
  initialFields: ImportWarehouseReceivingManualFields;
  onSubmit: (fields: ImportWarehouseReceivingManualFields) => void;
  onClose: () => void;
}

export const ImportWarehouseReceivingModal = ({
  open,
  issues,
  initialFields,
  onSubmit,
  onClose,
}: ImportWarehouseReceivingModalProps) => {
  const { control, handleSubmit, reset } = useForm<ImportWarehouseReceivingManualFields>({
    defaultValues: initialFields,
    resolver: zodResolver(importWarehouseReceivingSchema),
    mode: 'onSubmit',
  });

  useEffect(() => {
    reset(initialFields);
  }, [initialFields, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Complete missing fields</p>
            <p className="text-xs text-slate-500">Fill required info before printing</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 transition hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 px-4 py-4">
            {issues.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Missing information</p>
                <ul className="list-disc pl-5">
                  {issues.map((issue) => (
                    <li key={issue.field}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <ManualFields control={control} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Save & Print
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
