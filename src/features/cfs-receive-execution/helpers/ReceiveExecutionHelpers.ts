import type { ExecutionPlan } from '../hooks/use-plan-execution';
import type { AttachmentPlaceholder } from '@/shared/features/plan/types';

export type ExecutionContainer = ExecutionPlan['containers'][number];

export type ActionType =
  | 'receive'
  | 'problem'
  | 'adjusted'
  | 'reject'
  | 'defer'
  | 'view-receive'
  | 'view-problem'
  | 'view-adjusted';

type OrderContainerWithExtras = ExecutionContainer['orderContainer'] & {
  orderCode?: string | null;
};

export const getOrderCode = (container: ExecutionContainer): string | null => {
  const orderContainer = container.orderContainer as OrderContainerWithExtras;
  return orderContainer.bookingOrder?.code ?? orderContainer.orderCode ?? null;
};

export const getHblNumbers = (container: ExecutionContainer): string[] => {
  const orderContainer = container.orderContainer;
  const numbers = [
    ...(orderContainer.enrichedHbls?.map((hbl) => hbl.hblNo).filter(Boolean) ?? []),
    ...(orderContainer.hbls?.map((hbl) => hbl.hblNo).filter(Boolean) ?? []),
  ];
  return Array.from(new Set(numbers));
};

export const mapSummaryStringsToPlaceholders = (
  entries?: string[] | null,
): AttachmentPlaceholder[] =>
  (entries ?? []).map((entry, index) => ({
    id: `${entry}-${index}`,
    name: entry,
    size: 0,
    type: 'application/octet-stream',
  }));

export const mapPlaceholdersToStrings = (
  items?: AttachmentPlaceholder[] | null,
): string[] => (items ?? []).map((item) => item.name).filter(Boolean);
