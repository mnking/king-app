/**
 * Test Data Factory for Integration Tests
 *
 * Provides functions to create test data via real API calls
 */

import {
  apiRequest,
  generateContainerNumber,
  generateSealNumber,
  getTodayISO,
  randomAlphaNum,
  pick,
  type TestResourceTracker,
} from './test-utils';

const PORTS = ['VNSGN', 'VNHPH', 'SGSIN', 'CNSHA', 'HKHKG', 'JPTYO', 'KRPUS'];
const CONTAINER_TYPES = ['22G1', '42G1', '45G1', '22R1', '45R1'];

// ===========================
// Forwarder Creation
// ===========================

export interface TestForwarder {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
}

/**
 * Create a test forwarder
 */
export async function createTestForwarder(
  token: string,
  tracker: TestResourceTracker
): Promise<TestForwarder> {
  const code = `FWD${randomAlphaNum(6)}`;
  const name = `Test Forwarder ${code}`;

  const response = await apiRequest<{ data: TestForwarder }>(
    '/api/forwarder/v1/forwarders',
    token,
    {
      method: 'POST',
      body: {
        code,
        name,
        type: 'Forwarder',
        status: 'Active',
      },
    }
  );

  const forwarder = response.data;
  tracker.forwarderIds.push(forwarder.id);

  return forwarder;
}

/**
 * Get or create a test forwarder
 */
export async function ensureTestForwarder(
  token: string,
  tracker: TestResourceTracker
): Promise<TestForwarder> {
  try {
    // Try to get existing forwarder
    const response = await apiRequest<{ data: { results: TestForwarder[] } }>(
      '/api/forwarder/v1/forwarders?itemsPerPage=1',
      token
    );

    if (response.data.results.length > 0) {
      return response.data.results[0];
    }
  } catch {
    // If list fails, try to create
  }

  return createTestForwarder(token, tracker);
}

// ===========================
// Vessel/Shipping Line Creation
// ===========================

export interface TestVessel {
  id: string;
  code: string;
  name: string;
}

/**
 * Create a test vessel/shipping line
 */
export async function createTestVessel(
  token: string,
  _tracker: TestResourceTracker
): Promise<TestVessel> {
  const code = `VSL${randomAlphaNum(6)}`;
  const name = `Test Vessel ${code}`;

  const response = await apiRequest<{ data: TestVessel }>(
    '/api/carrier/v1/shipping-lines',
    token,
    {
      method: 'POST',
      body: {
        code,
        name,
        type: 'NORMAL',
        status: 'Active',
      },
    }
  );

  // Note: We don't track vessel IDs for cleanup as they may be reusable
  return response.data;
}

/**
 * Get or create a test vessel
 */
export async function ensureTestVessel(
  token: string,
  tracker: TestResourceTracker
): Promise<TestVessel> {
  try {
    // Try to get existing vessel
    const response = await apiRequest<{ data: { results: TestVessel[] } }>(
      '/api/carrier/v1/shipping-lines?itemsPerPage=1',
      token
    );

    if (response.data.results.length > 0) {
      return response.data.results[0];
    }
  } catch {
    // If list fails, try to create
  }

  return createTestVessel(token, tracker);
}

// ===========================
// Container Creation
// ===========================

export interface TestContainer {
  id: string;
  number: string;
  containerTypeCode: string;
}

/**
 * Create a test container
 */
export async function createTestContainer(
  token: string,
  tracker: TestResourceTracker,
  typeCode?: string
): Promise<TestContainer> {
  const number = generateContainerNumber();
  const containerTypeCode = typeCode || pick(CONTAINER_TYPES);

  const response = await apiRequest<{ data: TestContainer }>(
    '/api/container/v1/containers',
    token,
    {
      method: 'POST',
      body: {
        number,
        containerTypeCode,
      },
    }
  );

  const container = response.data;
  tracker.containerIds.push(container.id);

  return container;
}

/**
 * Create multiple test containers in parallel
 */
export async function createTestContainers(
  token: string,
  tracker: TestResourceTracker,
  count: number
): Promise<TestContainer[]> {
  // Create all containers in parallel for better performance
  const containerPromises = Array.from({ length: count }, () =>
    createTestContainer(token, tracker)
  );

  const containers = await Promise.all(containerPromises);

  return containers;
}

// ===========================
// HBL Creation
// ===========================

export interface TestHBL {
  id: string;
  code: string;
  receivedAt: string;
  issuerId: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  cargoDescription: string;
  packageCount: number;
  packageType: string;
  cargoWeight: number;
  volume: number;
  vesselName: string;
  voyageNumber: string;
  pol: string;
  pod: string;
  status: string;
  containers: Array<{
    containerNumber: string;
    containerTypeCode: string;
    sealNumber: string;
  }>;
}

/**
 * Create a test HBL
 */
export async function createTestHBL(
  token: string,
  tracker: TestResourceTracker,
  issuerId: string,
  container: TestContainer,
  sealNumber?: string
): Promise<TestHBL> {
  const timestamp = Date.now().toString().slice(-8);
  const code = `HBL${timestamp}${randomAlphaNum(4)}`;
  const seal = sealNumber || generateSealNumber();
  const pol = pick(PORTS);
  let pod = pick(PORTS);
  if (pod === pol) {
    pod = pick(PORTS.filter(p => p !== pol));
  }

  const response = await apiRequest<{ data: TestHBL }>(
    '/api/forwarder/v1/hbls',
    token,
    {
      method: 'POST',
      body: {
        code,
        receivedAt: getTodayISO(),
        document: '',
        issuerId,
        shipper: `Test Shipper ${randomAlphaNum(4)}`,
        consignee: `Test Consignee ${randomAlphaNum(4)}`,
        notifyParty: `Test Notify ${randomAlphaNum(4)}`,
        cargoDescription: `Test cargo for integration testing`,
        packageCount: 10 + Math.floor(Math.random() * 20),
        packageType: 'CTN',
        cargoWeight: 1000 + Math.floor(Math.random() * 5000),
        volume: 10 + Math.floor(Math.random() * 20),
        vesselName: 'MV Test Vessel',
        voyageNumber: `V${randomAlphaNum(4)}`,
        pol,
        pod,
        containers: [
          {
            containerNumber: container.number,
            containerTypeCode: container.containerTypeCode,
            sealNumber: seal,
          },
        ],
      },
    }
  );

  const hbl = response.data;
  tracker.hblIds.push(hbl.id);

  return hbl;
}

/**
 * Approve an HBL
 */
export async function approveTestHBL(
  token: string,
  hblId: string
): Promise<void> {
  await apiRequest(`/api/forwarder/v1/hbls/${hblId}/approve`, token, {
    method: 'POST',
  });
}

/**
 * Create and approve an HBL
 */
export async function createApprovedTestHBL(
  token: string,
  tracker: TestResourceTracker,
  issuerId: string,
  container: TestContainer,
  sealNumber?: string
): Promise<TestHBL> {
  const hbl = await createTestHBL(token, tracker, issuerId, container, sealNumber);
  await approveTestHBL(token, hbl.id);
  return hbl;
}

// ===========================
// Complete Test Setup
// ===========================

export interface TestSetupResult {
  forwarder: TestForwarder;
  vessel: TestVessel;
  containers: TestContainer[];
  hbls: TestHBL[];
}

/**
 * Setup complete test environment with forwarder, vessel, containers, and HBLs
 */
export async function setupCompleteTestEnvironment(
  token: string,
  tracker: TestResourceTracker,
  options: {
    containerCount?: number;
    createHBLs?: boolean;
    approveHBLs?: boolean;
  } = {}
): Promise<TestSetupResult> {
  const { containerCount = 2, createHBLs = true, approveHBLs = true } = options;

  // Create forwarder and vessel
  const [forwarder, vessel] = await Promise.all([
    ensureTestForwarder(token, tracker),
    ensureTestVessel(token, tracker),
  ]);

  // Create containers
  const containers = await createTestContainers(token, tracker, containerCount);

  // Create HBLs in parallel if requested
  const hbls: TestHBL[] = [];
  if (createHBLs) {
    const hblPromises = containers.map((container) =>
      approveHBLs
        ? createApprovedTestHBL(token, tracker, forwarder.id, container)
        : createTestHBL(token, tracker, forwarder.id, container)
    );

    const createdHBLs = await Promise.all(hblPromises);
    hbls.push(...createdHBLs);
  }

  return {
    forwarder,
    vessel,
    containers,
    hbls,
  };
}
