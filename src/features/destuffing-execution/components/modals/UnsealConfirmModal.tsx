import { X, Unlock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useUnsealContainer } from '@/features/destuffing-execution/hooks';
import { Modal } from './Modal';

interface UnsealConfirmModalProps {
  planId: string;
  containerId: string;
  containerNumber?: string | null;
  onClose: () => void;
}

export const UnsealConfirmModal = ({
  planId,
  containerId,
  containerNumber,
  onClose,
}: UnsealConfirmModalProps) => {
  const { mutateAsync, isLoading } = useUnsealContainer();

  const handleConfirm = async () => {
    await mutateAsync({ planId, containerId });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Unseal Container">
      <div className="flex items-start gap-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-900/20">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-700/60">
          <Unlock className="h-5 w-5" />
        </span>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
          {/* Container Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Container
            </span>
            <span className="rounded-md bg-gray-900 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm dark:bg-gray-100 dark:text-gray-900">
              {containerNumber ?? containerId}
            </span>
          </div>

          {/* Description */}
          <p className="leading-relaxed text-gray-600 dark:text-gray-300">
            Unsealing will start the destuffing process and mark this container as{' '}
            <span className="font-semibold text-green-700 dark:text-green-300">In Progress</span>.
          </p>

          {/* Info List */}
          <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 dark:bg-green-400" />
              Seal data will be captured by the backend flow.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 dark:bg-green-400" />
              HBL actions will be unlocked after this step.
            </li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onClose} className="min-w-[96px]">
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={isLoading}
          onClick={handleConfirm}
          className="min-w-[112px]"
        >
          <Unlock className="mr-1.5 h-4 w-4" />
          Unseal
        </Button>
      </div>
    </Modal>
  );
};
