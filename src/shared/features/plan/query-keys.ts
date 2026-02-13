export const planQueryKeys = {
  all: ['receive-plans'] as const,
  lists: () => [...planQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...planQueryKeys.lists(), filters] as const,
  details: () => [...planQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...planQueryKeys.details(), id] as const,
};

export const unplannedQueryKeys = {
  all: ['unplanned-containers'] as const,
};

export const planExecutionQueryKey = (planId: string) =>
  ['cfs-planning', 'plan-execution', planId] as const;

export const inProgressPlanQueryKey = ['cfs-planning', 'plans', 'IN_PROGRESS'] as const;

