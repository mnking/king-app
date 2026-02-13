import type {
  DestuffingPlanContainer,
  HblDestuffStatus,
} from '@/features/destuffing-execution/types';

type PlanContainerHbl = {
  hblId?: string | null;
  id?: string | null;
  hblNo?: string | null;
  hblCode?: string | null;
  packingListNo?: string | null;
  summary?: { packingListNo?: string | null } | null;
};

export const formatStatus = (value?: string | null) => value ?? 'waiting';

export const getContainerBaseHbls = (
  container: DestuffingPlanContainer,
): HblDestuffStatus[] => {
  const rawHbls = Array.isArray(container.hbls)
    ? (container.hbls as PlanContainerHbl[])
    : [];
  const unique = new Map<string, HblDestuffStatus>();

  rawHbls.forEach((hbl) => {
    const hblId = hbl?.hblId ?? hbl?.id ?? null;
    if (!hblId || unique.has(hblId)) return;

    const hblCode = hbl?.hblCode ?? hbl?.hblNo ?? hblId;
    unique.set(hblId, {
      hblId,
      hblCode,
      packingListId: null,
      packingListNo: null,
      bypassStorageFlag: null,
      destuffStatus: 'waiting',
      inspectionSessionId: null,
      destuffResult: null,
    });
  });

  return Array.from(unique.values());
};

export const mergePlannedHbls = (
  base: HblDestuffStatus[],
  enriched?: HblDestuffStatus[] | null,
): HblDestuffStatus[] => {
  if (!enriched?.length) return base;
  const lookup = new Map(enriched.map((item) => [item.hblId, item]));
  return base.map((item) => ({
    ...item,
    ...lookup.get(item.hblId),
  }));
};

export const getStatusAccentColor = (status: string) => {
  if (status === 'in-progress') return 'border-l-green-500 dark:border-l-green-400';
  if (status === 'done') return 'border-l-blue-500 dark:border-l-blue-400';
  return 'border-l-gray-300 dark:border-l-gray-600';
};

export const renderWorkingStatus = (status: string) => {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border';
  if (status === 'waiting') {
    return (
      <span className={`${base} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600`}>
        Waiting
      </span>
    );
  }
  if (status === 'in-progress') {
    return (
      <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700`}>
        In Progress
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className={`${base} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700`}>
        Done
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600`}>
      {status}
    </span>
  );
};

export const renderHblStatus = (status: HblDestuffStatus['destuffStatus']) => {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border';

  if (status === 'waiting') return (
    <span className={`${base} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600`} role="status">
      Waiting
    </span>
  );
  if (status === 'in-progress') return (
    <span className={`${base} bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700`} role="status">
      In Progress
    </span>
  );
  if (status === 'done') return (
    <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700`} role="status">
      Done
    </span>
  );
  if (status === 'on-hold') return (
    <span className={`${base} bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700`} role="status">
      On Hold
    </span>
  );
  return null;
};
