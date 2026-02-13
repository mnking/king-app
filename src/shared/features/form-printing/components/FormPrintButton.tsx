import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { usePdfDownload } from '../hooks/usePdfRender';
import { getTemplateMapper } from '../templates';
import type {
  FormTemplateCode,
  RenderContext,
  RenderIssue,
  RenderPayload,
} from '../types';

type ButtonVariant = ButtonHTMLAttributes<HTMLButtonElement>['type'];

export interface FormPrintButtonProps<TCode extends FormTemplateCode> {
  templateCode: TCode;
  context: RenderContext<TCode> | null;
  overrides?: Partial<RenderPayload<TCode>>;
  fileName?: string;
  onIssues?: (issues: RenderIssue[]) => void;
  renderModal?: (props: {
    open: boolean;
    issues: RenderIssue[];
    payload: RenderPayload<TCode> | null;
    overrides: Partial<RenderPayload<TCode>>;
    onSubmit: (overrides: Partial<RenderPayload<TCode>>) => void;
    onClose: () => void;
  }) => ReactNode;
  children?: ReactNode;
  disabled?: boolean;
  type?: ButtonVariant;
  className?: string;
}

const getFieldValue = (payload: unknown, path: string) => {
  const segments = path.split('.');
  let current: any = payload;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }

  return current;
};

const isTruthyValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const deepMerge = <T extends Record<string, any>, U extends Record<string, any>>(
  target: T,
  source?: U,
): T & U => {
  if (!source) return target as T & U;
  const output: Record<string, any> = Array.isArray(target) ? [...target] : { ...target };

  Object.entries(source).forEach(([key, value]) => {
    const existing = (output as any)[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      (output as any)[key] = deepMerge(existing, value);
    } else {
      (output as any)[key] = value;
    }
  });

  return output as T & U;
};

const resolveIssues = <TCode extends FormTemplateCode>(
  issues: RenderIssue[],
  payload: RenderPayload<TCode>,
) =>
  issues.filter((issue) => {
    const value = getFieldValue(payload, issue.field);
    return !isTruthyValue(value);
  });

export const FormPrintButton = <TCode extends FormTemplateCode>({
  templateCode,
  context,
  overrides,
  fileName,
  onIssues,
  renderModal,
  children = 'Print',
  disabled,
  type = 'button',
  className,
}: FormPrintButtonProps<TCode>) => {
  const mapper = useMemo(() => getTemplateMapper(templateCode), [templateCode]);
  const { download, isPending } = usePdfDownload<TCode>();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOverrides, setModalOverrides] = useState<Partial<RenderPayload<TCode>>>({});

  const effectiveOverrides = useMemo(
    () => deepMerge(overrides ?? ({} as Partial<RenderPayload<TCode>>), modalOverrides),
    [modalOverrides, overrides],
  );

  const mappingResult = useMemo(() => {
    if (!context) return null;
    const { payload, issues } = mapper(context);
    const merged = deepMerge(payload, effectiveOverrides);
    const remaining = resolveIssues(issues, merged);
    const blocking = remaining.some((issue) => issue.severity === 'error');

    return {
      mergedPayload: merged,
      unresolvedIssues: remaining,
      hasBlockingErrors: blocking,
      basePayload: payload,
    };
  }, [context, effectiveOverrides, mapper]);

  const mergedPayload = mappingResult?.mergedPayload;
  const unresolvedIssues = mappingResult?.unresolvedIssues ?? [];
  const hasBlockingErrors =
    !context || (mappingResult ? mappingResult.hasBlockingErrors : false);
  const basePayload = mappingResult?.basePayload ?? null;

  const handleClick = async () => {
    if (!context || !mergedPayload) {
      const issue = {
        field: 'context',
        message: 'Missing source data for printing. Please select a record first.',
        severity: 'error' as const,
      };
      onIssues?.([issue]);
      toast.error(issue.message);
      return;
    }

    // If a modal is provided, always surface it for the user to confirm/enter missing fields.
    if (renderModal) {
      onIssues?.(unresolvedIssues);
      setModalOpen(true);
      return;
    }

    if (unresolvedIssues.length && hasBlockingErrors) {
      const first = unresolvedIssues[0];
      toast.error(first?.message || 'Please complete required fields before printing.');
      return;
    }

    await download({
      templateCode,
      payload: mergedPayload,
      fileName,
    });
  };

  return (
    <>
      <Button
        type={type}
        onClick={handleClick}
        loading={isPending}
        disabled={disabled || !context || isPending}
        className={className}
      >
        {children}
      </Button>
      {renderModal &&
        renderModal({
          open: modalOpen,
          issues: unresolvedIssues,
          payload: basePayload,
          overrides: effectiveOverrides,
          onSubmit: (nextOverrides) => {
            setModalOverrides((prev) => deepMerge(prev, nextOverrides));
            setModalOpen(false);
            if (!context || !basePayload) {
              toast.error('Missing source data for printing. Please select a record first.');
              return;
            }
            const combinedPayload = deepMerge(
              basePayload as RenderPayload<TCode>,
              deepMerge(effectiveOverrides as RenderPayload<TCode>, nextOverrides as RenderPayload<TCode>),
            );
            void download({
              templateCode,
              payload: combinedPayload,
              fileName,
            });
          },
          onClose: () => setModalOpen(false),
        })}
    </>
  );
};
