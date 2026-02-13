import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField';
import { FormTextarea } from '@/shared/components/forms/FormTextarea';
import Button from '@/shared/components/ui/Button';
import { createNumberFormatter, formatNumber, parseLocalizedNumber } from '@/shared/utils';
import { FormInput } from '@/shared/components/forms/FormInput';
import type { PaymentRecordForm } from '../schemas/payment-record-schema';
import { PaymentRecordSchema } from '../schemas/payment-record-schema';
import type { ContainerPayment } from '../types';

interface RecordPaymentModalProps {
  open: boolean;
  container: ContainerPayment | null;
  defaultValues: PaymentRecordForm;
  onClose: () => void;
  onSave: (values: PaymentRecordForm) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  open,
  container,
  defaultValues,
  onClose,
  onSave,
}) => {
  const form = useForm<PaymentRecordForm>({
    resolver: zodResolver(PaymentRecordSchema),
    defaultValues,
  });

  const { control, handleSubmit, reset } = form;
  const amountInputId = useId();
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [nextCaretIndex, setNextCaretIndex] = useState<number | null>(null);
  const locale =
    typeof window === 'undefined'
      ? 'vi-VN'
      : window.navigator?.language || 'vi-VN';
  const amountFormatter = useMemo(
    () => createNumberFormatter({ locale, maximumFractionDigits: 0 }),
    [locale],
  );
  const formatAmountInput = (value?: number | null) =>
    formatNumber(value, amountFormatter);
  const parseAmountInput = (rawValue: string) =>
    parseLocalizedNumber(rawValue, { locale, allowDecimal: false });

  const getDigitCountBeforeIndex = (value: string, index: number) =>
    value.slice(0, Math.max(0, index)).replace(/[^\d]/g, '').length;

  const getIndexForDigitCount = (formatted: string, digitCount: number) => {
    if (digitCount <= 0) return 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) {
        count += 1;
        if (count >= digitCount) {
          return i + 1;
        }
      }
    }
    return formatted.length;
  };

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setNextCaretIndex(null);
    }
  }, [open, defaultValues, reset]);

  useEffect(() => {
    if (nextCaretIndex === null) return;
    const input = amountInputRef.current;
    if (!input) return;
    input.setSelectionRange(nextCaretIndex, nextCaretIndex);
    setNextCaretIndex(null);
  }, [nextCaretIndex]);

  const submit = (values: PaymentRecordForm) => {
    onSave(values);
    onClose();
  };

  if (!open || !container) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record payment
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {container.containerNumber ?? 'N/A'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(submit)}
          className="mt-6 space-y-4"
        >
          <Controller
            name="actualAmount"
            control={control}
            render={({ field, fieldState }) => (
              <FormField
                label="Actual received amount (₫)"
                error={fieldState.error}
                htmlFor={amountInputId}
              >
                <input
                  id={amountInputId}
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter received amount"
                  ref={(node) => {
                    amountInputRef.current = node;
                    field.ref(node);
                  }}
                  value={formatAmountInput(field.value)}
                  onChange={(event) => {
                    const { value, selectionStart } = event.target;
                    const digitCountBefore = getDigitCountBeforeIndex(
                      value,
                      selectionStart ?? value.length,
                    );
                    const parsed = parseAmountInput(value);
                    if (parsed === undefined) {
                      field.onChange(undefined);
                      setNextCaretIndex(0);
                      return;
                    }
                    if (parsed > Number.MAX_SAFE_INTEGER) {
                      return;
                    }
                    const nextValue = Math.max(0, parsed);
                    field.onChange(nextValue);
                    const formatted = formatAmountInput(nextValue);
                    setNextCaretIndex(
                      getIndexForDigitCount(formatted, digitCountBefore),
                    );
                  }}
                  onBlur={field.onBlur}
                  className={`
                    w-full px-3 py-2 border rounded-lg
                    bg-white dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-500 dark:placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      fieldState.error
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                />
              </FormField>
            )}
          />
          <FormInput
            name="receiptNumber"
            control={control}
            label="Receipt number"
            placeholder="Optional receipt number"
          />
          <FormTextarea
            name="note"
            control={control}
            label="Note"
            placeholder="Optional note for payment adjustments"
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save payment</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
