export type DonePlanSortField = 'plannedStart';

export interface DonePlanFilterState {
  plannedStartFrom?: string;
  plannedStartTo?: string;
  executionStartFrom?: string;
  executionStartTo?: string;
  search?: string;
  orderBy: DonePlanSortField;
  orderDir: 'asc' | 'desc';
}

export const DONE_PLAN_PAGE_SIZE = 50;

const formatIsoDate = (date: Date) => date.toISOString();

export const getDefaultDonePlanFilters = (): DonePlanFilterState => {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  return {
    plannedStartFrom: formatIsoDate(firstDay),
    plannedStartTo: formatIsoDate(now),
    orderBy: 'plannedStart',
    orderDir: 'asc',
  };
};

export const mapFiltersToQueryParams = (filters: DonePlanFilterState) => {
  const params: {
    plannedStart?: { from?: string; to?: string };
    executionStart?: { from?: string; to?: string };
    search?: string;
    orderBy?: DonePlanSortField;
    orderDir?: 'asc' | 'desc';
  } = {};

  if (filters.plannedStartFrom || filters.plannedStartTo) {
    params.plannedStart = {
      from: filters.plannedStartFrom,
      to: filters.plannedStartTo,
    };
  }

  if (filters.executionStartFrom || filters.executionStartTo) {
    params.executionStart = {
      from: filters.executionStartFrom,
      to: filters.executionStartTo,
    };
  }

  if (filters.search) {
    params.search = filters.search;
  }

  params.orderBy = filters.orderBy;
  params.orderDir = filters.orderDir;

  return params;
};

