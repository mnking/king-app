/**
 * Integration Tests: Delete Booking Order (T027)
 *
 * Tests booking order deletion against real API (http://localhost:8000)
 *
 * Test Coverage:
 * - Delete draft order without containers
 * - Delete draft order with containers
 * - Cannot delete non-existent order
 * - Cannot delete approved order (if applicable)
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

describe('Booking Order Delete Integration Tests (T027)', () => {
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

  describe('Delete Draft Orders', () => {
    it('should delete empty draft order', async () => {
      // Create empty draft order
      const createPayload = {
        agentId: testSetup.forwarder.id,
        agentCode: testSetup.forwarder.code,
        vesselId: testSetup.vessel.id,
        vesselCode: testSetup.vessel.code,
        eta: getFutureDateISO(7),
        voyage: 'V200',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: 'To be deleted',
        containers: [],
      };

      const createResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: createPayload,
        }
      );

      const orderId = createResponse.data.id;
      // Don't track - we're testing deletion

      // Delete the order
      await apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
        method: 'DELETE',
      });

      // Verify order is deleted - trying to fetch should fail
      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
          method: 'GET',
        })
      ).rejects.toThrow(/404|not found/i);
    });

    it('should delete draft order with containers and HBLs', async () => {
      // Create draft with containers
      const hbl = testSetup.hbls[0];
      const container = testSetup.containers[0];

      const createPayload = {
        agentId: testSetup.forwarder.id,
        agentCode: testSetup.forwarder.code,
        vesselId: testSetup.vessel.id,
        vesselCode: testSetup.vessel.code,
        eta: getFutureDateISO(7),
        voyage: 'V201',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: 'Draft with containers - to be deleted',
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
            isCustomsCleared: false,
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
      };

      const createResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: createPayload,
        }
      );

      const orderId = createResponse.data.id;

      // Delete the order
      await apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
        method: 'DELETE',
      });

      // Verify order is deleted
      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
          method: 'GET',
        })
      ).rejects.toThrow(/404|not found/i);
    });

    it('should delete draft order with multiple containers', async () => {
      // Create draft with multiple containers
      const [hbl1, hbl2] = testSetup.hbls;
      const [container1, container2] = testSetup.containers;

      const createPayload = {
        agentId: testSetup.forwarder.id,
        agentCode: testSetup.forwarder.code,
        vesselId: testSetup.vessel.id,
        vesselCode: testSetup.vessel.code,
        eta: getFutureDateISO(7),
        voyage: 'V202',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: 'Multiple containers - to be deleted',
        containers: [
          {
            containerId: container1.id,
            containerNo: container1.number,
            sealNumber: hbl1.containers[0].sealNumber,
            summary: {
              typeCode: container1.containerTypeCode,
              tareWeightKg: null,
            },
            isPriority: false,
            isCustomsCleared: false,
            yardFreeFrom: null,
            yardFreeTo: null,
            extractFrom: null,
            extractTo: null,
            hbls: [
              {
                hblId: hbl1.id,
                hblNo: hbl1.code,
                summary: {
                  receivedAt: hbl1.receivedAt,
                  issuerName: testSetup.forwarder.name,
                  shipper: hbl1.shipper,
                  consignee: hbl1.consignee,
                  pol: hbl1.pol,
                  pod: hbl1.pod,
                  vesselName: hbl1.vesselName,
                  voyageNumber: hbl1.voyageNumber,
                  packages: hbl1.packageCount,
                },
              },
            ],
          },
          {
            containerId: container2.id,
            containerNo: container2.number,
            sealNumber: hbl2.containers[0].sealNumber,
            summary: {
              typeCode: container2.containerTypeCode,
              tareWeightKg: null,
            },
            isPriority: true,
            isCustomsCleared: true,
            yardFreeFrom: getFutureDateISO(10),
            yardFreeTo: getFutureDateISO(20),
            extractFrom: getFutureDateISO(10),
            extractTo: getFutureDateISO(20),
            hbls: [
              {
                hblId: hbl2.id,
                hblNo: hbl2.code,
                summary: {
                  receivedAt: hbl2.receivedAt,
                  issuerName: testSetup.forwarder.name,
                  shipper: hbl2.shipper,
                  consignee: hbl2.consignee,
                  pol: hbl2.pol,
                  pod: hbl2.pod,
                  vesselName: hbl2.vesselName,
                  voyageNumber: hbl2.voyageNumber,
                  packages: hbl2.packageCount,
                },
              },
            ],
          },
        ],
      };

      const createResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: createPayload,
        }
      );

      const orderId = createResponse.data.id;

      // Delete the order
      await apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
        method: 'DELETE',
      });

      // Verify order is deleted
      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
          method: 'GET',
        })
      ).rejects.toThrow(/404|not found/i);
    });
  });

  describe('Error Handling', () => {
    it('should fail when deleting with invalid UUID format', async () => {
      const invalidUUID = '12345678-1234-1234-1234-123456789012';

      // Backend validates UUID format first (returns 400 for invalid UUIDs)
      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${invalidUUID}`, token, {
          method: 'DELETE',
        })
      ).rejects.toThrow(/400|Validation failed|uuid/i);
    });

    it('should fail when deleting with invalid ID format', async () => {
      const invalidId = 'not-a-valid-uuid';

      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${invalidId}`, token, {
          method: 'DELETE',
        })
      ).rejects.toThrow();
    });

    it('should fail when trying to delete already deleted order', async () => {
      // Create and delete order
      const createPayload = {
        agentId: testSetup.forwarder.id,
        agentCode: testSetup.forwarder.code,
        vesselId: testSetup.vessel.id,
        vesselCode: testSetup.vessel.code,
        eta: getFutureDateISO(7),
        voyage: 'V203',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: 'To be deleted twice',
        containers: [],
      };

      const createResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: createPayload,
        }
      );

      const orderId = createResponse.data.id;

      // First deletion - should succeed
      await apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
        method: 'DELETE',
      });

      // Second deletion - should fail
      await expect(
        apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
          method: 'DELETE',
        })
      ).rejects.toThrow(/404|not found/i);
    });
  });

  describe('Idempotency', () => {
    it('should return proper status codes for successful deletion', async () => {
      // Create order
      const createPayload = {
        agentId: testSetup.forwarder.id,
        agentCode: testSetup.forwarder.code,
        vesselId: testSetup.vessel.id,
        vesselCode: testSetup.vessel.code,
        eta: getFutureDateISO(7),
        voyage: 'V204',
        subVoyage: null,
        transportTripCount: '1',
        subTripCount: null,
        notes: 'Testing status codes',
        containers: [],
      };

      const createResponse = await apiRequest<{ data: any }>(
        '/api/cfs/v1/booking-orders',
        token,
        {
          method: 'POST',
          body: createPayload,
        }
      );

      const orderId = createResponse.data.id;

      // Delete should not throw (returns 204 No Content or similar)
      const deleteResult = await apiRequest(`/api/cfs/v1/booking-orders/${orderId}`, token, {
        method: 'DELETE',
      });

      // Result should be undefined for 204 No Content
      expect(deleteResult).toBeUndefined();
    });
  });

  // Note: "Cannot Delete Approved Orders" test is deferred to approve integration test (T032)
  // where we can properly test approval and deletion restrictions together
});
