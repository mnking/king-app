import type {
  Container,
  ContainerType,
  ContainerCycle,
  ContainerTransaction,
  ContainerSnapshot,
} from '@/features/containers/types';

// Mock Container Types (reference data)
export const mockContainerTypes: ContainerType[] = [
  {
    id: 'type-22g1',
    code: '22G1',
    size: '20ft',
    description: "Dry (bách hóa) tiêu chuẩn 8'6\"",
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'type-22r1',
    code: '22R1',
    size: '20ft',
    description: 'Reefer (lạnh) 20ft',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'type-42g1',
    code: '42G1',
    size: '40ft',
    description: "Dry (bách hóa) tiêu chuẩn 8'6\"",
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'type-45g1',
    code: '45G1',
    size: '40ft',
    description: "Dry (bách hóa) High Cube 9'6\"",
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

// Mock Containers (with valid ISO 6346 check digits)
export const mockContainers: Container[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    number: 'MSCU6639870',
    containerTypeCode: '22G1',
    containerType: mockContainerTypes[0],
    createdAt: '2025-10-01T08:00:00.000Z',
    updatedAt: '2025-10-01T08:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    number: 'TEMU9876540',
    containerTypeCode: '45G1',
    containerType: mockContainerTypes[3],
    createdAt: '2025-10-01T09:00:00.000Z',
    updatedAt: '2025-10-01T09:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    number: 'CMAU1234564',
    containerTypeCode: '42G1',
    containerType: mockContainerTypes[2],
    createdAt: '2025-10-01T10:00:00.000Z',
    updatedAt: '2025-10-01T10:00:00.000Z',
  },
];

const snapshotForContainer = (container: Container): ContainerSnapshot => ({
  id: container.id,
  number: container.number,
  containerTypeCode: container.containerTypeCode,
  containerType: container.containerType,
});

export const mockContainerCycles: ContainerCycle[] = [
  {
    id: 'cycle-1',
    containerNumber: mockContainers[0].number,
    code: `${mockContainers[0].number}-2025A`,
    operationMode: 'IMPORT',
    startEvent: 'GATE_IN',
    endEvent: null,
    cargoLoading: 'FULL',
    customsStatus: 'PENDING',
    condition: 'GOOD',
    sealNumber: 'SEAL1234567',
    containerStatus: 'AVAILABLE_FOR_DELIVERY',
    status: 'ACTIVE',
    isActive: true,
    createdAt: '2025-10-01T08:00:00.000Z',
    updatedAt: '2025-10-01T08:00:00.000Z',
  },
  {
    id: 'cycle-2',
    containerNumber: mockContainers[1].number,
    code: `${mockContainers[1].number}-2025B`,
    operationMode: 'EXPORT',
    startEvent: 'GATE_IN',
    endEvent: 'GATE_OUT',
    cargoLoading: 'FULL',
    customsStatus: 'CLEARED',
    condition: 'GOOD',
    sealNumber: 'SEAL7654321',
    containerStatus: 'DEPARTED',
    status: 'COMPLETED',
    isActive: false,
    createdAt: '2025-10-01T09:00:00.000Z',
    updatedAt: '2025-10-02T10:00:00.000Z',
  },
];

export const mockContainerTransactions: ContainerTransaction[] = [
  {
    id: 'txn-1',
    containerId: mockContainers[0].id,
    containerNumber: mockContainers[0].number,
    containerSnapshot: snapshotForContainer(mockContainers[0]),
    cycleId: 'cycle-1',
    eventType: 'GATE_IN',
    cargoLoading: 'FULL',
    customsStatus: 'PENDING',
    condition: 'GOOD',
    sealNumber: 'SEAL1234567',
    status: 'AT_TERMINAL',
    timestamp: '2025-10-01T08:30:00.000Z',
    createdAt: '2025-10-01T08:30:00.000Z',
    updatedAt: '2025-10-01T08:30:00.000Z',
  },
  {
    id: 'txn-2',
    containerId: mockContainers[0].id,
    containerNumber: mockContainers[0].number,
    containerSnapshot: snapshotForContainer(mockContainers[0]),
    cycleId: 'cycle-1',
    eventType: 'YARD_IN',
    cargoLoading: 'FULL',
    customsStatus: 'PENDING',
    condition: 'GOOD',
    sealNumber: 'SEAL1234567',
    status: 'YARD',
    timestamp: '2025-10-01T09:00:00.000Z',
    createdAt: '2025-10-01T09:00:00.000Z',
    updatedAt: '2025-10-01T09:00:00.000Z',
  },
];

// Helper: Generate unique IDs
export const generateContainerId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mock-${Math.random().toString(36).slice(2, 11)}`;
};

export const generateContainerNumber = (): string => {
  const prefix = 'TEST';
  const number = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return `${prefix}${number}`;
};

export const findContainerTypeByCode = (code: string): ContainerType | undefined =>
  mockContainerTypes.find((type) => type.code === code);
