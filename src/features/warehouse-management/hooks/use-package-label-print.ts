import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { usePdfRender } from '@/shared/features/form-printing';
import { getTemplateMapper } from '@/shared/features/form-printing/templates';
import type {
  RenderContext,
  RenderIssue,
  RenderPayload,
} from '@/shared/features/form-printing';

type TemplateCode = 'CARGO_PACKAGE_LABEL';

interface PrintOptions {
  context: RenderContext<TemplateCode> | null;
  overrides?: Partial<RenderPayload<TemplateCode>>;
  onIssues?: (issues: RenderIssue[]) => void;
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

const resolveIssues = <TCode extends TemplateCode>(
  issues: RenderIssue[],
  payload: RenderPayload<TCode>,
) =>
  issues.filter((issue) => {
    const value = getFieldValue(payload, issue.field);
    return !isTruthyValue(value);
  });

export const usePackageLabelPrint = () => {
  const mapper = useMemo(() => getTemplateMapper('CARGO_PACKAGE_LABEL'), []);
  const renderMutation = usePdfRender<TemplateCode>();

  const print = useCallback(
    async ({ context, overrides, onIssues }: PrintOptions) => {
      if (!context) {
        const issue = {
          field: 'context',
          message: 'Missing source data for printing. Please select a record first.',
          severity: 'error' as const,
        };
        onIssues?.([issue]);
        toast.error(issue.message);
        return;
      }

      const { payload, issues } = mapper(context);
      const mergedPayload = deepMerge(payload, overrides);
      const unresolvedIssues = resolveIssues(issues, mergedPayload);
      const hasBlockingErrors = unresolvedIssues.some(
        (issue) => issue.severity === 'error',
      );

      onIssues?.(unresolvedIssues);

      if (unresolvedIssues.length && hasBlockingErrors) {
        const first = unresolvedIssues[0];
        toast.error(first?.message || 'Please complete required fields before printing.');
        return;
      }

      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.opener = null;
      }

      const blob = await renderMutation.mutateAsync({
        templateCode: 'CARGO_PACKAGE_LABEL',
        payload: mergedPayload,
      });
      const url = URL.createObjectURL(blob);

      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    },
    [mapper, renderMutation],
  );

  return { print, isPending: renderMutation.isPending };
};
