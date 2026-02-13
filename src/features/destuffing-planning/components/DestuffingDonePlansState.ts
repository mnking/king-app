export type DonePlanSortField = 'plannedStart';

export type DonePlansTabFilters = {
  plannedStartFrom?: string;
  plannedStartTo?: string;
  executionStartFrom?: string;
  executionStartTo?: string;
  search?: string;
  orderBy: DonePlanSortField;
  orderDir: 'asc' | 'desc';
};

export type DonePlansTabState = {
  filters: DonePlansTabFilters;
  pagination: {
    page: number;
    limit: number;
  };
  selectedPlanId: string | null;
};

export const DONE_PLANS_PAGE_SIZE = 100;

const formatIsoDate = (date: Date) => date.toISOString();

export const createDefaultDonePlansTabState = (): DonePlansTabState => {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  return {
    filters: {
      plannedStartFrom: formatIsoDate(firstDay),
      plannedStartTo: formatIsoDate(now),
      orderBy: 'plannedStart',
      orderDir: 'asc',
    },
    pagination: {
      page: 1,
      limit: DONE_PLANS_PAGE_SIZE,
    },
    selectedPlanId: null,
  };
};
