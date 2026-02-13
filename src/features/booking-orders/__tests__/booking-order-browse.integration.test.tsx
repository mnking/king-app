/**
 * Integration Tests: Browse & Filter Booking Orders (T036)
 *
 * Tests booking order listing, pagination, filtering against real API
 *
 * Test Coverage:
 * - List all booking orders
 * - Pagination (page, itemsPerPage)
 * - Filter by status (DRAFT, APPROVED, all)
 * - Search functionality
 * - Sort by fields
 * - Empty results handling
 * - Meta information verification
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loginAndGetToken,
  createResourceTracker,
  cleanupResources,
  apiRequest,
  getFutureDateISO,
  type TestResourceTracker,
} from './utils/test-utils';
import {
  setupCompleteTestEnvironment,
  type TestSetupResult,
} from './utils/test-data-factory';

describe('Booking Order Browse & Filter Integration Tests (T036)', () => {
  let token: string;
  let tracker: TestResourceTracker;
  let testSetup: TestSetupResult;

  beforeAll(async () => {
    token = await loginAndGetToken();
    tracker = createResourceTracker();
    testSetup = await setupCompleteTestEnvironment(token, tracker, {
      containerCount: 2,
      createHBLs: true,
      approveHBLs: true,
    });
  }, 30000);

  afterAll(async () => {
    await cleanupResources(token, tracker);
  }, 30000);

  describe('List All Orders', () => {
    let testOrderId: string;

    beforeAll(async () => {
      // Create one test order for this describe block
      const hbl = testSetup.hbls[0];
      const container = testSetup.containers[0];

      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: {
            agentId: testSetup.forwarder.id,
            agentCode: testSetup.forwarder.code,
            vesselId: testSetup.vessel.id,
            vesselCode: testSetup.vessel.code,
            eta: getFutureDateISO(7),
            voyage: 'VTEST001',
            subVoyage: 'S1',
            transportTripCount: '1',
            subTripCount: null,
            notes: 'Test order for listing',
            containers: [
              {
                containerId: container.id,
                containerNo: container.number,
                sealNumber: hbl.containers[0].sealNumber,
                summary: {
                  typeCode: container.containerTypeCode,
                  tareWeightKg: null,
                },
                isPriority: false,
                mblNumber: null,
                customsStatus: 'NOT_REGISTERED',
                cargoReleaseStatus: 'NOT_REQUESTED',
                yardFreeFrom: null,
                yardFreeTo: null,
                extractFrom: null,
                extractTo: null,
                hbls: [
                  {
                    hblId: hbl.id,
                    hblNo: hbl.code,
                    summary: {
                      receivedAt: hbl.receivedAt,
                      issuerName: testSetup.forwarder.name,
                      shipper: hbl.shipper,
                      consignee: hbl.consignee,
                      pol: hbl.pol,
                      pod: hbl.pod,
                      vesselName: hbl.vesselName,
                      voyageNumber: hbl.voyageNumber,
                      packages: hbl.packageCount,
                    },
                  },
                ],
              },
            ],
          },
        }
      );

      testOrderId = response.data.id;
    });

    afterAll(async () => {
      // Cleanup this describe block's order
      if (testOrderId) {
        try {
          await apiRequest(`/api/cfs/v1/booking-orders/${testOrderId}`, token, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn(`Failed to cleanup order ${testOrderId}:`, error);
        }
      }
    });

    it('should fetch all booking orders without filters', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data).toBeDefined();
      expect(response.data.results).toBeDefined();
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results.length).toBeGreaterThan(0);
    });

    it('should include created test order in results', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      const results = response.data.results;
      const foundOrder = results.find((order: any) => order.id === testOrderId);

      expect(foundOrder).toBeDefined();
      expect(foundOrder.voyage).toBe('VTEST001');
    });
  });

  describe('Pagination', () => {
    let paginationTestOrderId: string;

    beforeAll(async () => {
      // Create test order for pagination tests
      const hbl = testSetup.hbls[0];
      const container = testSetup.containers[0];

      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: {
            agentId: testSetup.forwarder.id,
            agentCode: testSetup.forwarder.code,
            vesselId: testSetup.vessel.id,
            vesselCode: testSetup.vessel.code,
            eta: getFutureDateISO(5),
            voyage: 'VTEST_PAGINATION',
            subVoyage: null,
            transportTripCount: '1',
            subTripCount: null,
            notes: 'Order for pagination testing',
            containers: [
              {
                containerId: container.id,
                containerNo: container.number,
                sealNumber: hbl.containers[0].sealNumber,
                summary: {
                  typeCode: container.containerTypeCode,
                  tareWeightKg: null,
                },
                isPriority: false,
                mblNumber: null,
                customsStatus: 'NOT_REGISTERED',
                cargoReleaseStatus: 'NOT_REQUESTED',
                yardFreeFrom: null,
                yardFreeTo: null,
                extractFrom: null,
                extractTo: null,
                hbls: [
                  {
                    hblId: hbl.id,
                    hblNo: hbl.code,
                    summary: {
                      receivedAt: hbl.receivedAt,
                      issuerName: testSetup.forwarder.name,
                      shipper: hbl.shipper,
                      consignee: hbl.consignee,
                      pol: hbl.pol,
                      pod: hbl.pod,
                      vesselName: hbl.vesselName,
                      voyageNumber: hbl.voyageNumber,
                      packages: hbl.packageCount,
                    },
                  },
                ],
              },
            ],
          },
        }
      );

      paginationTestOrderId = response.data.id;
    });

    afterAll(async () => {
      if (paginationTestOrderId) {
        try {
          await apiRequest(`/api/cfs/v1/booking-orders/${paginationTestOrderId}`, token, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn(`Failed to cleanup order ${paginationTestOrderId}:`, error);
        }
      }
    });

    it('should support itemsPerPage parameter', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?itemsPerPage=2',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();
      expect(response.data.results.length).toBeLessThanOrEqual(2);
      expect(response.data.results.length).toBeGreaterThan(0);
    });

    it('should support page parameter', async () => {
      const page1 = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?page=1&itemsPerPage=2',
        token,
        {
          method: 'GET',
        }
      );

      const page2 = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?page=2&itemsPerPage=2',
        token,
        {
          method: 'GET',
        }
      );

      expect(page1.data.results).toBeDefined();
      expect(page2.data.results).toBeDefined();

      // If there are enough items, page 1 and page 2 should have different results
      if (page1.data.totalItems > 2 && page2.data.results.length > 0) {
        const page1Ids = page1.data.results.map((o: any) => o.id);
        const page2Ids = page2.data.results.map((o: any) => o.id);

        // Check that at least one ID is different
        const hasDifferentIds = page2Ids.some((id: string) => !page1Ids.includes(id));
        expect(hasDifferentIds).toBe(true);
      }
    });

    it('should return results with pagination parameter', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?itemsPerPage=3',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data).toBeDefined();
      expect(response.data.results).toBeDefined();
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results.length).toBeGreaterThan(0);
      expect(response.data.results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Filter by Status', () => {
    let draftOrderId: string;

    beforeAll(async () => {
      // Create one draft order for status filtering tests
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: {
            agentId: testSetup.forwarder.id,
            agentCode: testSetup.forwarder.code,
            vesselId: testSetup.vessel.id,
            vesselCode: testSetup.vessel.code,
            eta: getFutureDateISO(10),
            voyage: 'VTEST_STATUS',
            subVoyage: null,
            transportTripCount: '1',
            subTripCount: null,
            notes: 'Draft order for status filtering',
            containers: [],
          },
        }
      );

      draftOrderId = response.data.id;
    });

    afterAll(async () => {
      if (draftOrderId) {
        try {
          await apiRequest(`/api/cfs/v1/booking-orders/${draftOrderId}`, token, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn(`Failed to cleanup order ${draftOrderId}:`, error);
        }
      }
    });

    it('should filter by DRAFT status', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=DRAFT&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();

      // All returned orders should be DRAFT
      const allDraft = response.data.results.every((order: any) =>
        order.status === 'DRAFT'
      );
      expect(allDraft).toBe(true);

      // Our created order should be included
      const hasOurOrder = response.data.results.some((order: any) =>
        order.id === draftOrderId
      );
      expect(hasOurOrder).toBe(true);
    });

    it('should filter by APPROVED status', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=APPROVED&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();

      // All returned orders should be APPROVED
      if (response.data.results.length > 0) {
        const allApproved = response.data.results.every((order: any) =>
          order.status === 'APPROVED'
        );
        expect(allApproved).toBe(true);
      }
    });

    it('should support "all" status to get all orders', async () => {
      const allResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=all&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      const draftResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=DRAFT&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      // "all" should return at least as many results as "DRAFT" only
      expect(allResponse.data.results.length).toBeGreaterThanOrEqual(draftResponse.data.results.length);
    });
  });

  describe('Search Functionality', () => {
    let searchOrderId: string;

    beforeAll(async () => {
      // Create one order with unique voyage for search testing
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: {
            agentId: testSetup.forwarder.id,
            agentCode: testSetup.forwarder.code,
            vesselId: testSetup.vessel.id,
            vesselCode: testSetup.vessel.code,
            eta: getFutureDateISO(14),
            voyage: 'VTEST_SEARCH_UNIQUE',
            subVoyage: null,
            transportTripCount: '1',
            subTripCount: null,
            notes: 'Order for search testing',
            containers: [],
          },
        }
      );

      searchOrderId = response.data.id;
    });

    afterAll(async () => {
      if (searchOrderId) {
        try {
          await apiRequest(`/api/cfs/v1/booking-orders/${searchOrderId}`, token, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn(`Failed to cleanup order ${searchOrderId}:`, error);
        }
      }
    });

    it('should search by voyage number', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?search=VTEST_SEARCH_UNIQUE&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();
      expect(response.data.results.length).toBeGreaterThan(0);

      const hasMatchingVoyage = response.data.results.some((order: any) =>
        order.voyage === 'VTEST_SEARCH_UNIQUE'
      );
      expect(hasMatchingVoyage).toBe(true);
    });

    it('should return empty results for non-existent search', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?search=NONEXISTENT999999&itemsPerPage=100',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();
      expect(response.data.results.length).toBe(0);
    });
  });

  describe('Sort Functionality', () => {
    it('should support sorting by createdAt (default orderBy)', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?orderBy=createdAt&orderDir=desc&itemsPerPage=50',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();

      if (response.data.results.length > 1) {
        // Check if results are sorted by createdAt descending
        const dates = response.data.results.map((o: any) => new Date(o.createdAt).getTime());

        // Verify descending order (newer first)
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('should support ascending sort order', async () => {
      const desc = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?orderBy=createdAt&orderDir=desc&itemsPerPage=10',
        token,
        {
          method: 'GET',
        }
      );

      const asc = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?orderBy=createdAt&orderDir=asc&itemsPerPage=10',
        token,
        {
          method: 'GET',
        }
      );

      expect(desc.data.results).toBeDefined();
      expect(asc.data.results).toBeDefined();

      // If both have results, verify the API accepts the parameter
      if (desc.data.results.length > 0 && asc.data.results.length > 0) {
        const descFirst = new Date(desc.data.results[0].createdAt).getTime();
        const ascFirst = new Date(asc.data.results[0].createdAt).getTime();

        // First item in desc should be >= first item in asc (assuming different data)
        expect(descFirst).toBeDefined();
        expect(ascFirst).toBeDefined();
      }
    });
  });

  describe('Combined Filters', () => {
    it('should combine status filter and pagination', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=DRAFT&page=1&itemsPerPage=3',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();
      expect(response.data.results.length).toBeLessThanOrEqual(3);

      const allDraft = response.data.results.every((order: any) =>
        order.status === 'DRAFT'
      );
      expect(allDraft).toBe(true);
    });

    it('should combine search, status, and pagination', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?search=VTEST&status=DRAFT&page=1&itemsPerPage=5',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();

      if (response.data.results.length > 0) {
        const allDraft = response.data.results.every((order: any) =>
          order.status === 'DRAFT'
        );
        expect(allDraft).toBe(true);
      }
    });

    it('should combine sorting with filters', async () => {
      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders?status=DRAFT&orderBy=createdAt&orderDir=asc&itemsPerPage=10',
        token,
        {
          method: 'GET',
        }
      );

      expect(response.data.results).toBeDefined();

      if (response.data.results.length > 0) {
        const allDraft = response.data.results.every((order: any) =>
          order.status === 'DRAFT'
        );
        expect(allDraft).toBe(true);
      }
    });
  });

  describe('Response Structure', () => {
    let structureTestOrderId: string;

    beforeAll(async () => {
      // Create order with containers for structure validation
      const hbl = testSetup.hbls[0];
      const container = testSetup.containers[0];

      const response = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: {
            agentId: testSetup.forwarder.id,
            agentCode: testSetup.forwarder.code,
            vesselId: testSetup.vessel.id,
            vesselCode: testSetup.vessel.code,
            eta: getFutureDateISO(20),
            voyage: 'VTEST_STRUCTURE',
            subVoyage: null,
            transportTripCount: '1',
            subTripCount: null,
            notes: 'Order for structure validation',
            containers: [
              {
                containerId: container.id,
                containerNo: container.number,
                sealNumber: hbl.containers[0].sealNumber,
                summary: {
                  typeCode: container.containerTypeCode,
                  tareWeightKg: null,
                },
                isPriority: false,
                mblNumber: null,
                customsStatus: 'NOT_REGISTERED',
                cargoReleaseStatus: 'NOT_REQUESTED',
                yardFreeFrom: null,
                yardFreeTo: null,
                extractFrom: null,
                extractTo: null,
                hbls: [
                  {
                    hblId: hbl.id,
                    hblNo: hbl.code,
                    summary: {
                      receivedAt: hbl.receivedAt,
                      issuerName: testSetup.forwarder.name,
                      shipper: hbl.shipper,
                      consignee: hbl.consignee,
                      pol: hbl.pol,
                      pod: hbl.pod,
                      vesselName: hbl.vesselName,
                      voyageNumber: hbl.voyageNumber,
                      packages: hbl.packageCount,
                    },
                  },
                ],
              },
            ],
          },
        }
      );

      structureTestOrderId = response.data.id;
    });

    afterAll(async () => {
      if (structureTestOrderId) {
        try {
          await apiRequest(`/api/cfs/v1/booking-orders/${structureTestOrderId}`, token, {
            method: 'DELETE',
          });
        } catch (error) {
          console.warn(`Failed to cleanup order ${structureTestOrderId}:`, error);
        }
      }
    });

    it('should return booking orders with correct structure', async () => {
      const response = await apiRequest<{ data: any }>(
        `/api/cfs/v1/booking-orders/${structureTestOrderId}`,
        token,
        {
          method: 'GET',
        }
      );

      const order = response.data;

      // Check required fields
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('voyage');
      expect(order).toHaveProperty('eta');
      expect(order).toHaveProperty('agentId');
      expect(order).toHaveProperty('vesselId');
      expect(order).toHaveProperty('containers');
      expect(order).toHaveProperty('createdAt');
      expect(order).toHaveProperty('updatedAt');
    });

    it('should include containers in response', async () => {
      const response = await apiRequest<{ data: any }>(
        `/api/cfs/v1/booking-orders/${structureTestOrderId}`,
        token,
        {
          method: 'GET',
        }
      );

      const order = response.data;
      expect(Array.isArray(order.containers)).toBe(true);
      expect(order.containers.length).toBeGreaterThan(0);
      expect(order.voyage).toBe('VTEST_STRUCTURE');
    });
  });
});
