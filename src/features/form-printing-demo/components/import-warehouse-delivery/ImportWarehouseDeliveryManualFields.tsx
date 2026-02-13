import type { Control } from 'react-hook-form';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import type { ImportWarehouseDeliveryManualFields as ImportWarehouseDeliveryManualFieldsValue } from '@/shared/features/form-printing';

interface ImportWarehouseDeliveryManualFieldsProps {
  control: Control<ImportWarehouseDeliveryManualFieldsValue>;
}

export const ImportWarehouseDeliveryManualFields = ({
  control,
}: ImportWarehouseDeliveryManualFieldsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <FormInput
        control={control}
        name="receipt.receiptNo"
        label="Receipt No (WHI-YYMMDD000)"
        required
        placeholder="WHI-YYMMDD000"
      />
      <FormInput
        control={control}
        name="receipt.receiptDate"
        label="Receipt Date"
        type="date"
        required
      />
      <FormInput
        control={control}
        name="delivery.batchNo"
        label="Batch No"
        required
        placeholder="Enter batch number"
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
