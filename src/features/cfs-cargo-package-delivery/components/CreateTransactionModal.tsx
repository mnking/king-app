import React from 'react';
import { X } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { FormInput, FormSingleSelect } from '@/shared/components/forms';

import type {
  CreatePackageTransactionPayload,
  PackageTransactionPartyType,
} from '../types/package-transaction-types';

type CreateTransactionFormValues = {
  partyName: string;
  partyType: string;
};

export const CreateTransactionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Pick<CreatePackageTransactionPayload, 'partyName' | 'partyType'>) => Promise<void>;
}> = ({ open, onClose, onSubmit }) => {
  const schema = React.useMemo(
    () =>
      z.object({
        partyName: z.string().trim().min(1, 'Party name is required').max(255),
        partyType: z
          .string()
          .min(1, 'Party type is required')
          .refine(
            (value) => ['FORWARDER', 'CONSIGNEE', 'SHIPPER'].includes(value),
            'Party type is required',
          ),
      }),
    [],
  );

  const { control, handleSubmit, reset } = useForm<CreateTransactionFormValues>({
    defaultValues: { partyName: '', partyType: '' },
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  React.useEffect(() => {
    if (!open) return;
    reset({ partyName: '', partyType: '' });
  }, [open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Create transaction
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Create a new warehouse delivery transaction for this packing list.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              partyName: values.partyName.trim(),
              partyType: values.partyType as PackageTransactionPartyType,
            });
          })}
        >
          <FormInput<CreateTransactionFormValues>
            control={control}
            name="partyName"
            label="Party name"
            required
            placeholder="e.g., ACME Logistics"
          />
          <FormSingleSelect<CreateTransactionFormValues>
            control={control}
            name="partyType"
            label="Party type"
            required
            options={[
              { value: 'FORWARDER', label: 'Forwarder' },
              { value: 'CONSIGNEE', label: 'Consignee' },
              { value: 'SHIPPER', label: 'Shipper' },
            ]}
            placeholder="Select party type..."
          />

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

