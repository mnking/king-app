import type {
  InventoryPlanCheck,
  InventoryPlanCheckQueryParams,
  InventoryPlanCheckQueryResult,
} from '@/features/inventory-check-management/types';
import type { InventoryPlanFormData } from '@/features/inventory-check-management/schemas';

let inventoryPlanChecks: InventoryPlanCheck[] = [
  {
    id: 'plan-0001',
    estimateStartTime: '2024-09-12T08:00:00Z',
    type: 'INTERNAL',
    note: 'Cycle count for Zone A fast movers.',
    membersNote: 'Assigned to morning shift.',
    actualStartTime: '',
    resultDocument: null,
    actualEndTime: '',
    locationMismatchFlag: false,
    qtyMismatchFlag: false,
    status: 'CREATED',
  },
  {
    id: 'plan-0002',
    estimateStartTime: '2024-09-10T09:30:00Z',
    type: 'CUSTOM',
    note: 'Cold storage spot check.',
    membersNote: 'Coordinate with QA team.',
    actualStartTime: '2024-09-10T09:45:00Z',
    resultDocument: {
      id: 'doc-9002',
      name: 'Inventory_Check_Results_2024-09-10.pdf',
      mimeType: 'application/pdf',
      url: '/files/plan-0002.pdf',
      sizeBytes: 245760,
    },
    actualEndTime: '',
    locationMismatchFlag: true,
    qtyMismatchFlag: true,
    status: 'DONE',
  },
  {
    id: 'plan-0003',
    estimateStartTime: '2024-09-08T07:00:00Z',
    type: 'CUSTOM',
    note: 'Rack 12 weekly inventory audit.',
    membersNote: 'Complete before noon.',
    actualStartTime: '2024-09-08T07:05:00Z',
    resultDocument: {
      id: 'doc-9003',
      name: 'Inventory_Check_Results_2024-09-08.pdf',
      mimeType: 'application/pdf',
      url: '/files/plan-0003.pdf',
      sizeBytes: 198432,
    },
    actualEndTime: '2024-09-08T14:15:00Z',
    locationMismatchFlag: false,
    qtyMismatchFlag: true,
    status: 'DONE',
  },
  {
    id: 'plan-0004',
    estimateStartTime: '2024-09-06T08:00:00Z',
    type: 'CUSTOM',
    note: 'Oversize cargo reconciliation.',
    membersNote: 'Verify pallet labels.',
    actualStartTime: '2024-09-06T08:10:00Z',
    resultDocument: null,
    actualEndTime: '2024-09-06T12:40:00Z',
    locationMismatchFlag: false,
    qtyMismatchFlag: false,
    status: 'DONE',
  },
  {
    id: 'plan-0005',
    estimateStartTime: '2024-09-05T10:00:00Z',
    type: 'INTERNAL',
    note: 'Bay 1 partial count.',
    membersNote: 'Paused due to inbound surge.',
    actualStartTime: '',
    resultDocument: null,
    actualEndTime: '',
    locationMismatchFlag: false,
    qtyMismatchFlag: false,
    status: 'CANCELED',
  }
];

const generateId = () =>
  `plan-${Math.random().toString(36).slice(2, 8)}`;

const matchesDateRange = (
  value: string,
  from?: string,
  to?: string,
): boolean => {
  if (!from && !to) return true;
  if (!value) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  if (from) {
    const fromTime = Date.parse(from);
    if (!Number.isNaN(fromTime) && time < fromTime) {
      return false;
    }
  }
  if (to) {
    const toTime = Date.parse(to);
    if (!Number.isNaN(toTime) && time > toTime) {
      return false;
    }
  }
  return true;
};

const matchesMismatchFlags = (
  plan: InventoryPlanCheck,
  flags?: Array<'location' | 'qty'>,
) => {
  if (!flags || flags.length === 0) return true;
  return flags.some((flag) => {
    if (flag === 'location') return plan.locationMismatchFlag;
    if (flag === 'qty') return plan.qtyMismatchFlag;
    return false;
  });
};

export const fetchInventoryPlanChecks = async (
  params: InventoryPlanCheckQueryParams = {},
): Promise<InventoryPlanCheckQueryResult> => {
  const filtered = inventoryPlanChecks.filter((plan) => {
    if (params.type && plan.type !== params.type) {
      return false;
    }

    if (
      !matchesDateRange(
        plan.estimateStartTime,
        params.estimateStartFrom,
        params.estimateStartTo,
      )
    ) {
      return false;
    }

    if (
      !matchesDateRange(
        plan.actualStartTime,
        params.actualStartFrom,
        params.actualStartTo,
      )
    ) {
      return false;
    }

    if (
      !matchesDateRange(
        plan.actualEndTime,
        params.actualEndFrom,
        params.actualEndTo,
      )
    ) {
      return false;
    }

    if (!matchesMismatchFlags(plan, params.mismatchFlags)) {
      return false;
    }

    return true;
  });

  return {
    results: filtered,
    total: filtered.length,
  };
};

export const createInventoryPlanCheck = async (
  payload: InventoryPlanFormData,
): Promise<InventoryPlanCheck> => {
  const created: InventoryPlanCheck = {
    id: generateId(),
    estimateStartTime: payload.estimateStartTime,
    type: payload.type,
    note: payload.note ?? '',
    membersNote: payload.membersNote ?? '',
    actualStartTime: '',
    resultDocument: null,
    actualEndTime: '',
    locationMismatchFlag: false,
    qtyMismatchFlag: false,
    status: 'CREATED',
  };

  inventoryPlanChecks = [created, ...inventoryPlanChecks];
  return created;
};

export const updateInventoryPlanCheck = async (
  id: string,
  payload: InventoryPlanFormData,
): Promise<InventoryPlanCheck | null> => {
  let updated: InventoryPlanCheck | null = null;
  inventoryPlanChecks = inventoryPlanChecks.map((plan) => {
    if (plan.id !== id) return plan;
    updated = {
      ...plan,
      estimateStartTime: payload.estimateStartTime,
      type: payload.type,
      note: payload.note ?? '',
      membersNote: payload.membersNote ?? '',
    };
    return updated;
  });

  return updated;
};

export const deleteInventoryPlanCheck = async (id: string): Promise<void> => {
  inventoryPlanChecks = inventoryPlanChecks.filter((plan) => plan.id !== id);
};

export const startInventoryPlanCheck = async (
  id: string,
): Promise<InventoryPlanCheck | null> => {
  let updated: InventoryPlanCheck | null = null;
  const now = new Date().toISOString();
  inventoryPlanChecks = inventoryPlanChecks.map((plan) => {
    if (plan.id !== id) return plan;
    updated = {
      ...plan,
      status: 'RECORDING',
      actualStartTime: now,
    };
    return updated;
  });

  return updated;
};
