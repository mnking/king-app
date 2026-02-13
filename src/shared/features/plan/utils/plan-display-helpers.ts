import { formatDateTime } from '@/shared/utils/date-format';
import type { EnrichedUnplannedContainer } from '../types';

export const formatDateTimeRange = (start?: string | null, end?: string | null) => {
  const startLabel = formatDateTime(start ?? null);
  const endLabel = formatDateTime(end ?? null);

  if (startLabel === '—' && endLabel === '—') return '—';

  return `${startLabel} → ${endLabel}`;
};

export const formatSingleDateTime = (value?: string | null) => formatDateTime(value ?? null);

const extractContainerTypeCode = (container: {
  orderContainer: EnrichedUnplannedContainer;
}): string | null => {
  const summaryType = container.orderContainer.summary?.typeCode;
  if (summaryType) return summaryType;

  const enrichedType = container.orderContainer.enrichedHbls?.find((hbl) => hbl?.containerTypeCode)
    ?.containerTypeCode;
  if (enrichedType) return enrichedType;

  return null;
};

export const getContainerTypeCode = extractContainerTypeCode;

export const getContainerSizeLabel = (typeCode?: string | null) => {
  if (!typeCode) return '—';
  const sizeMatch = typeCode.match(/^\d{2}/);
  return sizeMatch ? `${sizeMatch[0]}ft` : '—';
};

export const statusStyles: Record<string, string> = {
  WAITING:
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  RECEIVED:
    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
  REJECTED:
    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700 shadow-inner',
  DEFERRED:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700',
};

