import type { Control } from 'react-hook-form';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import type { ImportWarehouseReceivingManualFields } from '@/shared/features/form-printing';

interface ImportWarehouseReceivingManualFieldsProps {
  control: Control<ImportWarehouseReceivingManualFields>;
}

export const ImportWarehouseReceivingManualFields = ({
  control,
}: ImportWarehouseReceivingManualFieldsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <FormInput
        control={control}
        name="receipt.receiptNo"
        label="Receipt No (WHE-YYMMDD000)"
        required
        placeholder="WHE-YYMMDD000"
      />
      <FormInput
        control={control}
        name="receipt.receiptDate"
        label="Receipt Date"
        type="date"
        required
      />
      <FormTextarea
        control={control}
        name="shipment.note"
        label="Note"
        rows={3}
        placeholder="Add a note (optional)"
        className="md:col-span-2"
      />
    </div>
  );
};
