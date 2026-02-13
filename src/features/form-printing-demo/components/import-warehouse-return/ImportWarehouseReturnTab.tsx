import { AlertTriangle, CheckCircle2, FileDown } from 'lucide-react';
import { FormPrintButton } from '@/shared/features/form-printing/components/FormPrintButton';
import { PackingListSelectionTable } from '../PackingListSelectionTable';
import { ImportWarehouseReceivingModal } from '../import-warehouse-receiving/ImportWarehouseReceivingModal';
import { useImportWarehouseReturnTab } from '../../hooks/useImportWarehouseReturnTab';

export const ImportWarehouseReturnTab = () => {
  const {
    selectedPackingListId,
    handleSelectPackingList,
    manualFields,
    setManualFields,
    setIssueHints,
    context,
    isLoading,
    isFetching,
    unresolved,
    hasBlocking,
  } = useImportWarehouseReturnTab();

  return (
    <div className="space-y-4">
      <PackingListSelectionTable
        selectedId={selectedPackingListId}
        onSelect={handleSelectPackingList}
      />

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileDown className="h-4 w-4" />
            Print Import Warehouse Return Note
          </div>
          <FormPrintButton
            templateCode="IMPORT_WAREHOUSE_RETURN_NOTE"
            context={context as any}
            overrides={manualFields as any}
            disabled={!context || isLoading || isFetching}
            onIssues={setIssueHints}
            fileName="import-warehouse-return-note.pdf"
            renderModal={({ open, issues: unresolvedIssues, onSubmit, onClose }) => (
              <ImportWarehouseReceivingModal
                open={open}
                issues={unresolvedIssues}
                initialFields={manualFields}
                onClose={onClose}
                onSubmit={(fields) => {
                  setManualFields(fields);
                  onSubmit(fields as any);
                }}
              />
            )}
          >
            Download PDF
          </FormPrintButton>
        </div>
        <div className="space-y-1 text-sm">
          {unresolved.length ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">
                  {hasBlocking
                    ? 'Please complete required fields before printing'
                    : 'Some optional fields are missing'}
                </p>
                <ul className="list-disc pl-5">
                  {unresolved.map((issue) => (
                    <li key={issue.field}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              All required fields are ready. You can print now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
