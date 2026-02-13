import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Textarea } from '@/shared/components/ui/Textarea';
import { useResealContainer } from '@/features/destuffing-execution/hooks';
import { ResealSchema, type ResealFormValues } from '@/features/destuffing-execution/schemas';
import { Modal } from './Modal';

interface ResealModalProps {
  planId: string;
  containerId: string;
  onClose: () => void;
}

export const ResealModal = ({ planId, containerId, onClose }: ResealModalProps) => {
  const { mutateAsync, isLoading } = useResealContainer();
  const form = useForm<ResealFormValues>({
    resolver: zodResolver(ResealSchema),
    defaultValues: {
      newSealNumber: '',
      onHoldFlag: false,
      note: '',
    },
  });

  const onSubmit = async (values: ResealFormValues) => {
    await mutateAsync({
      planId,
      containerId,
      newSealNumber: values.newSealNumber,
      onHoldFlag: values.onHoldFlag,
      note: values.note ?? null,
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Reseal Container">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Seal Number Field */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
            New Seal Number
          </label>
          <Input
            {...form.register('newSealNumber')}
            placeholder="Enter new seal number"
            required
            className="font-mono"
          />
          {form.formState.errors.newSealNumber && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {form.formState.errors.newSealNumber.message}
            </p>
          )}
        </div>

        {/* On Hold Checkbox */}
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <label className="inline-flex items-center gap-3 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
            <input
              type="checkbox"
              {...form.register('onHoldFlag')}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600"
            />
            <span className="font-medium">Mark container on hold</span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
            Use when the container needs to pause before completion.
          </p>
        </div>

        {/* Note Field */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
            Note
          </label>
          <Textarea
            {...form.register('note')}
            placeholder="Optional note about the reseal"
            className="resize-none"
            rows={3}
          />
          {form.formState.errors.note && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {form.formState.errors.note.message}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
