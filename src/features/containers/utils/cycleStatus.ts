import type { ContainerCycle } from '@/features/containers/types';

export const normalizeCycleStatus = (status?: string | null) =>
  (status ?? '').trim().toUpperCase();

type CycleLike = { code?: unknown; status?: unknown } | null | undefined;

const normalizeCycleSummaryPart = (value: unknown) => {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';
  const lowered = text.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return text;
};

export const formatCycleSummary = (
  cycle: CycleLike,
  {
    separator = ' · ',
    fallback = null,
  }: { separator?: string; fallback?: string | null } = {},
) => {
  if (!cycle) return fallback;
  const code = normalizeCycleSummaryPart(cycle.code);
  const status = normalizeCycleSummaryPart(cycle.status);
  const parts = [code, status].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(separator) : fallback;
};

export const isCycleDisplayable = (cycle?: ContainerCycle | null) => {
  if (!cycle) return false;
  const normalizedStatus = normalizeCycleStatus(cycle.status);
  if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'CLOSED') {
    return false;
  }
  if (typeof cycle.isActive === 'boolean') {
    return cycle.isActive;
  }
  if (!normalizedStatus) {
    return true;
  }
  return true;
};

export const isCycleCompleted = (cycle?: ContainerCycle | null) =>
  normalizeCycleStatus(cycle?.status) === 'COMPLETED';
