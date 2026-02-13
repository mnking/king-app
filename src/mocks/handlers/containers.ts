import { http, HttpResponse } from 'msw';
import {
  mockContainers,
  mockContainerTypes,
  mockContainerCycles,
  mockContainerTransactions,
  generateContainerId,
  generateContainerNumber,
  findContainerTypeByCode,
} from '../data/containers';
import type {
  Container,
  ContainerType,
  ContainerCycle,
  ContainerTransaction,
  ContainerSnapshot,
} from '@/features/containers/types';
import type {
  ContainerCycleEndForm,
  ContainerCycleFormValues,
  ContainerTransactionFormValues,
  ContainerTypeFormValues,
  ContainerFormValues,
} from '@/features/containers/schemas';

const API_URL = '/api/container';

const containers: Container[] = [...mockContainers];
const containerTypes: ContainerType[] = [...mockContainerTypes];
const containerCycles: ContainerCycle[] = [...mockContainerCycles];
const containerTransactions: ContainerTransaction[] = [...mockContainerTransactions];

const paginate = <T,>(items: T[], page = 1, itemsPerPage = 10) => {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return {
    results: items.slice(start, end),
    total: items.length,
  };
};

const findContainerById = (id: string) => containers.find((container) => container.id === id);
const findContainerByNumber = (number: string) =>
  containers.find((container) => container.number === number);

const toSnapshot = (container: Container): ContainerSnapshot => ({
  id: container.id,
  number: container.number,
  containerTypeCode: container.containerTypeCode,
  containerType: container.containerType,
});

export const containersHandlers = [
  // Container Type endpoints
  http.get(`${API_URL}/v1/container-types`, () =>
    HttpResponse.json({
      results: containerTypes,
      total: containerTypes.length,
    }),
  ),

  http.post(`${API_URL}/v1/container-types`, async ({ request }) => {
    const payload = (await request.json()) as ContainerTypeFormValues;
    if (!payload.code || !payload.size) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    if (findContainerTypeByCode(payload.code)) {
      return HttpResponse.json({ message: 'Type exists' }, { status: 409 });
    }
    const newType: ContainerType = {
      id: `type-${payload.code}`,
      code: payload.code,
      size: payload.size,
      description: payload.description ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    containerTypes.push(newType);
    return HttpResponse.json(newType, { status: 201 });
  }),

  http.patch(`${API_URL}/v1/container-types/:code`, async ({ params, request }) => {
    const payload = (await request.json()) as ContainerTypeFormValues;
    const type = findContainerTypeByCode(String(params.code));
    if (!type) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    type.size = payload.size ?? type.size;
    type.description = payload.description ?? type.description;
    type.updatedAt = new Date().toISOString();
    return HttpResponse.json(type);
  }),

  http.delete(`${API_URL}/v1/container-types/:code`, ({ params }) => {
    const index = containerTypes.findIndex((type) => type.code === params.code);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    containerTypes.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  // Container endpoints
  http.get(`${API_URL}/v1/containers`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const itemsPerPage = Number(url.searchParams.get('itemsPerPage') ?? '10');

    const sorted = [...containers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return HttpResponse.json(paginate(sorted, page, itemsPerPage));
  }),

  http.post(`${API_URL}/v1/containers`, async ({ request }) => {
    const payload = (await request.json()) as ContainerFormValues;
    if (!payload.number || !payload.containerTypeCode) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }
    if (findContainerByNumber(payload.number)) {
      return HttpResponse.json({ message: 'Number exists' }, { status: 409 });
    }
    const type = findContainerTypeByCode(payload.containerTypeCode);
    if (!type) {
      return HttpResponse.json({ message: 'Invalid type' }, { status: 400 });
    }
    const container: Container = {
      id: generateContainerId(),
      number: payload.number,
      containerTypeCode: payload.containerTypeCode,
      containerType: type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    containers.unshift(container);
    return HttpResponse.json(container, { status: 201 });
  }),

  http.get(`${API_URL}/v1/containers/:id`, ({ params }) => {
    const container = findContainerById(String(params.id));
    if (!container) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const currentCycle =
      containerCycles.find((cycle) => cycle.containerNumber === container.number && cycle.isActive) ??
      null;
    const cycleTransactions = containerTransactions.filter(
      (transaction) => transaction.cycleId === currentCycle?.id,
    );
    return HttpResponse.json({
      ...container,
      currentCycle,
      currentCycleTransactionCount: cycleTransactions.length,
    });
  }),

  http.get(`${API_URL}/v1/containers/by-number/:number`, ({ params }) => {
    const container = findContainerByNumber(String(params.number));
    if (!container) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const currentCycle =
      containerCycles.find((cycle) => cycle.containerNumber === container.number && cycle.isActive) ??
      null;
    const cycleTransactions = containerTransactions.filter(
      (transaction) => transaction.cycleId === currentCycle?.id,
    );
    return HttpResponse.json({
      ...container,
      currentCycle,
      currentCycleTransactionCount: cycleTransactions.length,
    });
  }),

  http.patch(`${API_URL}/v1/containers/:id`, async ({ params, request }) => {
    const payload = (await request.json()) as Partial<ContainerFormValues>;
    const container = findContainerById(String(params.id));
    if (!container) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    if (payload.containerTypeCode) {
      const type = findContainerTypeByCode(payload.containerTypeCode);
      if (!type) {
        return HttpResponse.json({ message: 'Invalid type' }, { status: 400 });
      }
      container.containerType = type;
      container.containerTypeCode = type.code;
    }
    container.updatedAt = new Date().toISOString();
    return HttpResponse.json(container);
  }),

  http.delete(`${API_URL}/v1/containers/:id`, ({ params }) => {
    const index = containers.findIndex((container) => container.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    containers.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  http.get(`${API_URL}/v1/containers/:id/last-transaction`, ({ params }) => {
    const container = findContainerById(String(params.id));
    if (!container) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const transaction = [...containerTransactions]
      .filter((txn) => txn.containerId === container.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!transaction) {
      return HttpResponse.json({ message: 'No transaction' }, { status: 404 });
    }
    return HttpResponse.json(transaction);
  }),

  // Container transactions
  http.get(`${API_URL}/v1/container-transactions`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const itemsPerPage = Number(url.searchParams.get('itemsPerPage') ?? '10');
    const containerNumber = url.searchParams.get('containerNumber');
    const eventType = url.searchParams.get('eventType');

    let results = [...containerTransactions];
    if (containerNumber) {
      results = results.filter((txn) => txn.containerNumber === containerNumber);
    }
    if (eventType) {
      results = results.filter((txn) => txn.eventType === eventType);
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return HttpResponse.json(paginate(results, page, itemsPerPage));
  }),

  http.post(`${API_URL}/v1/container-transactions`, async ({ request }) => {
    const payload = (await request.json()) as ContainerTransactionFormValues;
    const container =
      findContainerByNumber(payload.containerNumber) ??
      ((): Container => {
        const type = containerTypes[0];
        const newContainer: Container = {
          id: generateContainerId(),
          number: payload.containerNumber || generateContainerNumber(),
          containerTypeCode: type.code,
          containerType: type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        containers.push(newContainer);
        return newContainer;
      })();

    const transaction: ContainerTransaction = {
      id: generateContainerId(),
      containerId: container.id,
      containerNumber: container.number,
      containerSnapshot: toSnapshot(container),
      cycleId: payload.cycleId ?? containerCycles[0]?.id ?? 'cycle-ad-hoc',
      eventType: payload.eventType,
      cargoLoading: payload.cargoLoading ?? 'FULL',
      customsStatus: payload.customsStatus ?? 'PENDING',
      condition: payload.condition ?? 'GOOD',
      sealNumber: payload.sealNumber ?? null,
      status: payload.status ?? 'RECORDED',
      timestamp: payload.timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    containerTransactions.unshift(transaction);
    return HttpResponse.json(transaction, { status: 201 });
  }),

  http.delete(`${API_URL}/v1/container-transactions/:id`, ({ params }) => {
    const index = containerTransactions.findIndex((txn) => txn.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    containerTransactions.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  http.get(`${API_URL}/v1/containers/:number/transactions`, ({ params, request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const itemsPerPage = Number(url.searchParams.get('itemsPerPage') ?? '10');
    const results = containerTransactions.filter(
      (txn) => txn.containerNumber === params.number,
    );
    return HttpResponse.json(paginate(results, page, itemsPerPage));
  }),

  // Container cycles
  http.get(`${API_URL}/v1/container-cycles`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const itemsPerPage = Number(url.searchParams.get('itemsPerPage') ?? '10');
    return HttpResponse.json(paginate(containerCycles, page, itemsPerPage));
  }),

  http.post(`${API_URL}/v1/container-cycles`, async ({ request }) => {
    const payload = (await request.json()) as ContainerCycleFormValues;
    const cycle: ContainerCycle = {
      id: generateContainerId(),
      containerNumber: payload.containerNumber,
      code: payload.code ?? `${payload.containerNumber}-${Date.now()}`,
      operationMode: payload.operationMode ?? 'IMPORT',
      startEvent: payload.startEvent,
      endEvent: payload.endEvent ?? null,
      cargoLoading: payload.cargoLoading ?? 'FULL',
      customsStatus: payload.customsStatus ?? 'PENDING',
      condition: payload.condition ?? 'GOOD',
      sealNumber: payload.sealNumber ?? null,
      containerStatus: payload.containerStatus ?? 'IN_PROGRESS',
      status: payload.status ?? 'ACTIVE',
      isActive: payload.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    containerCycles.unshift(cycle);
    return HttpResponse.json(cycle, { status: 201 });
  }),

  http.post(`${API_URL}/v1/container-cycles/:id/end`, async ({ params, request }) => {
    const payload = (await request.json()) as ContainerCycleEndForm;
    const cycle = containerCycles.find((item) => item.id === params.id);
    if (!cycle) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    cycle.endEvent = payload.endEvent;
    cycle.status = payload.status ?? 'COMPLETED';
    cycle.isActive = false;
    cycle.updatedAt = new Date().toISOString();
    return HttpResponse.json(cycle);
  }),

  http.delete(`${API_URL}/v1/container-cycles/:id`, ({ params }) => {
    const index = containerCycles.findIndex((cycle) => cycle.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    containerCycles.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),
];
