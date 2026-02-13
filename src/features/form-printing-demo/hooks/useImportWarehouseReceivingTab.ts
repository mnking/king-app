import { useMemo, useState } from 'react';
import type { ImportWarehouseReceivingManualFields, RenderIssue } from '@/shared/features/form-printing';
import { getTemplateMapper } from '@/shared/features/form-printing/templates';
import { useDestuffReceiptData } from './useDestuffReceiptData';
import { generateReceiptNo } from '../helpers';

const DEFAULT_MANUAL_FIELDS: ImportWarehouseReceivingManualFields = {
  receipt: {
    receiptNo: '',
    receiptDate: '',
  },
  shipment: {
    note: '',
  },
};

export const useImportWarehouseReceivingTab = () => {
  const [selectedPackingListId, setSelectedPackingListId] = useState<string | null>(null);
  const [manualFields, setManualFields] =
    useState<ImportWarehouseReceivingManualFields>({
      ...DEFAULT_MANUAL_FIELDS,
      receipt: {
        ...DEFAULT_MANUAL_FIELDS.receipt,
        receiptNo: generateReceiptNo('WHE'),
      },
    });
  const [issueHints, setIssueHints] = useState<RenderIssue[]>([]);

  const { context, isLoading, isFetching } = useDestuffReceiptData(selectedPackingListId);
  const mapper = useMemo(() => getTemplateMapper('IMPORT_WAREHOUSE_RECEIVING_NOTE'), []);

  const { unresolved, hasBlocking } = useMemo(() => {
    if (!context) {
      const missingSelection: RenderIssue = {
        field: 'packingList',
        message: 'Select a packing list to continue.',
        severity: 'error',
      };
      return { unresolved: [missingSelection], hasBlocking: true };
    }
    const { payload, issues: baseIssues } = mapper(context);
    const merged = {
      ...payload,
      receipt: {
        ...payload.receipt,
        ...manualFields.receipt,
      },
      shipment: {
        ...payload.shipment,
        ...manualFields.shipment,
      },
    };
    const remaining = baseIssues.filter((issue) => {
      const parts = issue.field.split('.');
      let value: any = merged;
      for (const part of parts) {
        if (value == null) break;
        value = value[part];
      }
      return value == null || (typeof value === 'string' && !value.trim());
    });
    const activeIssues = issueHints.length ? issueHints : remaining;
    return {
      unresolved: activeIssues,
      hasBlocking: activeIssues.some((i) => i.severity === 'error'),
    };
  }, [context, issueHints, mapper, manualFields]);

  const handleSelectPackingList = (id: string | null) => {
    setSelectedPackingListId(id);
    setIssueHints([]);
  };

  return {
    selectedPackingListId,
    handleSelectPackingList,
    manualFields,
    setManualFields,
    issueHints,
    setIssueHints,
    context,
    isLoading,
    isFetching,
    unresolved,
    hasBlocking,
  };
};
