import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  getBookingOrders,
  getBookingOrderById,
  createBookingOrder,
  updateBookingOrder,
  deleteBookingOrder,
  approveBookingOrder,
  serializeContainerToPayload,
  deserializeContainerFromResponse,
  serializeHBLToPayload,
  deserializeHBLFromResponse,
} from '../apiCFS';
import type {
  BookingOrder,
  BookingOrderContainer,
  BookingOrderHBL,
  ContainerFormData,
  HBLFormData,
} from '@/features/booking-orders/types';

// ===========================
// MSW Server Setup
// ===========================

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ===========================
// Test Data Fixtures
// ===========================

const mockBookingOrder: BookingOrder = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  code: 'BO-2025-0001',
  status: 'APPROVED',
  enteredAt: '2025-10-10T00:00:00Z',
  agentId: '456e4567-e89b-12d3-a456-426614174001',
  agentCode: 'PACFWD',
  eta: '2025-10-15',
  vesselId: '789e4567-e89b-12d3-a456-426614174002',
  vesselCode: 'MAE',
  voyage: 'VY1234',
  subVoyage: null,
  transportTripCount: null,
  subTripCount: null,
  notes: null,
  approvedBy: 'user123',
  approvedAt: '2025-10-10T10:00:00Z',
  containers: [],
  createdAt: '2025-10-10T00:00:00Z',
  updatedAt: '2025-10-10T10:00:00Z',
};

const mockContainerWithSummary: BookingOrderContainer = {
  id: 'cont-123',
  orderId: '123e4567-e89b-12d3-a456-426614174000',
  containerId: 'cont-456',
  containerNo: 'MSCU1234567',
  sealNumber: 'SEAL123',
  yardFreeFrom: '2025-10-10',
  yardFreeTo: '2025-10-15',
  extractFrom: '2025-10-16',
  extractTo: '2025-10-20',
  isPriority: true,
  isCustomsCleared: false,
  summary: {
    typeCode: '45G1',
    tareWeightKg: 3800,
    cargo_nature: 'DG',
    cargo_properties: {
      imoClass: '3',
      unNumber: 'UN 1203',
      dgPage: 'Vol.2 p.324',
      flashPoint: '+23°C (cc)',
    },
    is_atyard: true,
  },
  hbls: [],
};

const mockHBLWithSummary: BookingOrderHBL = {
  id: 'hbl-123',
  orderContainerId: 'cont-123',
  hblId: 'hbl-456',
  hblNo: 'HBL-0001',
  summary: {
    consignee: 'ABC Trading Co.',
    packages: 100,
  },
};

// ===========================
// Helper Function Tests
// ===========================

describe('Summary Field Serialization', () => {
  describe('serializeContainerToPayload', () => {
    it('should map form, date, and cargo metadata fields to summary JSONB object', () => {
      const formData: ContainerFormData = {
        containerId: 'cont-456',
        containerNo: 'MSCU1234567',
        isPriority: true,
        isAtYard: true,
        typeCode: '45G1',
        tareWeightKg: 3800,
        cargoNature: 'DG',
        cargoProperties: {
          imoClass: '3',
          unNumber: 'UN 1203',
          dgPage: 'Vol.2 p.324',
          flashPoint: '+23°C (cc)',
        },
        yardFreeFrom: '2025-10-01',
        yardFreeTo: '2025-10-05',
        extractFrom: '2025-10-06',
        extractTo: '2025-10-07',
        hbls: [],
      };

      const result = serializeContainerToPayload(formData);

      expect(result).toEqual({
        containerId: 'cont-456',
        containerNo: 'MSCU1234567',
        isPriority: true,
        yardFreeFrom: '2025-10-01T00:00:00.000Z',
        yardFreeTo: '2025-10-05T00:00:00.000Z',
        extractFrom: '2025-10-06T00:00:00.000Z',
        extractTo: '2025-10-07T00:00:00.000Z',
        hbls: [],
        summary: {
          typeCode: '45G1',
          tareWeightKg: 3800,
          cargo_nature: 'DG',
          cargo_properties: {
            imoClass: '3',
            unNumber: 'UN 1203',
            dgPage: 'Vol.2 p.324',
            flashPoint: '+23°C (cc)',
          },
          is_atyard: true,
        },
      });
    });

    it('should handle null or missing cargo properties by serializing null values', () => {
      const formData: ContainerFormData = {
        containerId: 'cont-456',
        containerNo: 'MSCU1234567',
        isPriority: false,
        cargoNature: 'GC',
        cargoProperties: null,
        hbls: [],
      };

      const result = serializeContainerToPayload(formData);

      expect(result.summary).toEqual({
        typeCode: undefined,
        tareWeightKg: undefined,
        cargo_nature: 'GC',
        cargo_properties: null,
        is_atyard: false,
      });
    });
  });

  describe('deserializeContainerFromResponse', () => {
    it('should extract summary fields to top-level for form state', () => {
      const result = deserializeContainerFromResponse(mockContainerWithSummary);

      expect(result).toMatchObject({
        id: 'cont-123',
        containerId: 'cont-456',
        containerNo: 'MSCU1234567',
        typeCode: '45G1',
        tareWeightKg: 3800,
        cargoNature: 'DG',
        cargoProperties: {
          imoClass: '3',
          unNumber: 'UN 1203',
          dgPage: 'Vol.2 p.324',
          flashPoint: '+23°C (cc)',
        },
        isAtYard: true,
      });
      expect(result.summary).toBeUndefined();
    });

    it('should handle missing summary field gracefully', () => {
      const containerWithoutSummary: BookingOrderContainer = {
        ...mockContainerWithSummary,
        summary: undefined,
      };

      const result = deserializeContainerFromResponse(containerWithoutSummary);

      expect(result.typeCode).toBeUndefined();
      expect(result.cargoNature).toBeUndefined();
      expect(result.cargoProperties).toBeUndefined();
      expect(result.isAtYard).toBe(false);
    });
  });

  describe('serializeHBLToPayload', () => {
    it('should map HBL form fields to summary object', () => {
      const formData: HBLFormData = {
        hblId: 'hbl-456',
        hblNo: 'HBL-0001',
        consignee: 'ABC Trading Co.',
        packages: 100,
      };

      const result = serializeHBLToPayload(formData);

      expect(result).toEqual({
        hblId: 'hbl-456',
        hblNo: 'HBL-0001',
        summary: {
          consignee: 'ABC Trading Co.',
          packages: 100,
        },
      });
    });
  });

  describe('deserializeHBLFromResponse', () => {
    it('should extract HBL summary fields to top-level', () => {
      const result = deserializeHBLFromResponse(mockHBLWithSummary);

      expect(result).toMatchObject({
        id: 'hbl-123',
        hblId: 'hbl-456',
        hblNo: 'HBL-0001',
        consignee: 'ABC Trading Co.',
        packages: 100,
      });
      expect(result.summary).toBeUndefined();
    });

    it('should handle missing HBL summary gracefully', () => {
      const hblWithoutSummary: BookingOrderHBL = {
        ...mockHBLWithSummary,
        summary: undefined,
      };

      const result = deserializeHBLFromResponse(hblWithoutSummary);

      expect(result.consignee).toBeUndefined();
      expect(result.packages).toBeUndefined();
    });
  });
});

// ===========================
// API Method Tests
// ===========================

describe('CFS Booking Orders API', () => {
  describe('getBookingOrders', () => {
    it('should fetch paginated list of booking orders', async () => {
      server.use(
        http.get('/api/cfs/v1/booking-orders', () => {
          return HttpResponse.json({
            statusCode: 200,
            data: {
              results: [mockBookingOrder],
              total: 1,
            },
          });
        }),
      );

      const result = await getBookingOrders();

      expect(result.statusCode).toBe(200);
      expect(result.data.results).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(result.data.results[0]).toEqual(mockBookingOrder);
    });

    it('should pass query parameters correctly', async () => {
      let capturedUrl: URL | undefined;

      server.use(
        http.get('/api/cfs/v1/booking-orders', ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json({
            statusCode: 200,
            data: { results: [], total: 0 },
          });
        }),
      );

      await getBookingOrders({
        page: 2,
        itemsPerPage: 20,
        status: 'DRAFT',
        search: 'MAE',
        orderBy: 'eta',
        orderDir: 'desc',
      });

      expect(capturedUrl?.searchParams.get('page')).toBe('2');
      expect(capturedUrl?.searchParams.get('itemsPerPage')).toBe('20');
      expect(capturedUrl?.searchParams.get('status')).toBe('DRAFT');
      expect(capturedUrl?.searchParams.get('search')).toBe('MAE');
      expect(capturedUrl?.searchParams.get('orderBy')).toBe('eta');
      expect(capturedUrl?.searchParams.get('orderDir')).toBe('desc');
    });

    it('should not include status=all in query params', async () => {
      let capturedUrl: URL | undefined;

      server.use(
        http.get('/api/cfs/v1/booking-orders', ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json({
            statusCode: 200,
            data: { results: [], total: 0 },
          });
        }),
      );

      await getBookingOrders({ status: 'all' });

      expect(capturedUrl?.searchParams.has('status')).toBe(false);
    });

    it('should throw error on failed request', async () => {
      server.use(
        http.get('/api/cfs/v1/booking-orders', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        }),
      );

      await expect(getBookingOrders()).rejects.toThrow('Failed to fetch booking orders');
    });
  });

  describe('getBookingOrderById', () => {
    it('should fetch single booking order', async () => {
      server.use(
        http.get('/api/cfs/v1/booking-orders/:id', () => {
          return HttpResponse.json({
            statusCode: 200,
            data: mockBookingOrder,
          });
        }),
      );

      const result = await getBookingOrderById('123e4567-e89b-12d3-a456-426614174000');

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockBookingOrder);
    });

    it('should deserialize container summary fields', async () => {
      const orderWithContainer = {
        ...mockBookingOrder,
        containers: [mockContainerWithSummary],
      };

      server.use(
        http.get('/api/cfs/v1/booking-orders/:id', () => {
          return HttpResponse.json({
            statusCode: 200,
            data: orderWithContainer,
          });
        }),
      );

      const result = await getBookingOrderById('123e4567-e89b-12d3-a456-426614174000');

      expect(result.data.containers[0]).toMatchObject({
        containerNo: 'MSCU1234567',
        typeCode: '45G1',
        cargoNature: 'DG',
        cargoProperties: {
          imoClass: '3',
          unNumber: 'UN 1203',
        },
      });
    });

    it('should throw error when booking order not found', async () => {
      server.use(
        http.get('/api/cfs/v1/booking-orders/:id', () => {
          return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
        }),
      );

      await expect(getBookingOrderById('non-existent-id')).rejects.toThrow(
        'Failed to fetch booking order',
      );
    });
  });

  describe('createBookingOrder', () => {
    it('should create booking order with serialized summary fields', async () => {
      let capturedPayload: any;

      server.use(
        http.post('/api/cfs/v1/booking-orders', async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json(
            {
              statusCode: 201,
              data: mockBookingOrder,
            },
            { status: 201 },
          );
        }),
      );

      const formData = {
        agentId: '456e4567-e89b-12d3-a456-426614174001',
        eta: '2025-10-15',
        vesselCode: 'MAE',
        voyage: 'VY1234',
        containers: [
          {
            containerId: 'cont-456',
            containerNo: 'MSCU1234567',
            isPriority: true,
            isAtYard: true,
            yardFreeFrom: '2025-10-01',
            yardFreeTo: '2025-10-05',
            extractFrom: '2025-10-06',
            extractTo: '2025-10-07',
            typeCode: '45G1',
            cargoNature: 'DG' as const,
            cargoProperties: {
              imoClass: '3' as const,
              unNumber: 'UN 1203',
              dgPage: 'Vol.1',
              flashPoint: '+23°C',
            },
            hbls: [
              {
                hblId: 'hbl-456',
                hblNo: 'HBL-0001',
                consignee: 'ABC Trading',
                packages: 100,
              },
            ],
          },
        ],
      };

      const result = await createBookingOrder(formData);

      expect(result.statusCode).toBe(201);
      expect(capturedPayload.eta).toBe('2025-10-15T00:00:00.000Z');
      expect(capturedPayload.vesselCode).toBe('MAE');
      expect(capturedPayload.containers[0].summary).toEqual({
        typeCode: '45G1',
        tareWeightKg: undefined,
        cargo_nature: 'DG',
        cargo_properties: {
          imoClass: '3',
          unNumber: 'UN 1203',
          dgPage: 'Vol.1',
          flashPoint: '+23°C',
        },
        is_atyard: true,
      });
      expect(capturedPayload.containers[0].yardFreeFrom).toBe('2025-10-01T00:00:00.000Z');
      expect(capturedPayload.containers[0].yardFreeTo).toBe('2025-10-05T00:00:00.000Z');
      expect(capturedPayload.containers[0].extractFrom).toBe('2025-10-06T00:00:00.000Z');
      expect(capturedPayload.containers[0].extractTo).toBe('2025-10-07T00:00:00.000Z');
      expect(capturedPayload.containers[0].hbls[0].summary).toEqual({
        consignee: 'ABC Trading',
        packages: 100,
        receivedAt: undefined,
        issuerName: undefined,
        shipper: undefined,
        pol: undefined,
        pod: undefined,
        vesselName: undefined,
        voyageNumber: undefined,
      });
    });

    it('should handle 404 error (referenced entity not found)', async () => {
      server.use(
        http.post('/api/cfs/v1/booking-orders', () => {
          return HttpResponse.json(
            {
              message: 'Agent not found',
              statusCode: 404,
            },
            { status: 404 },
          );
        }),
      );

      const formData = {
        agentId: 'non-existent-agent',
        eta: '2025-10-15',
        vesselCode: 'MAE',
        voyage: 'VY1234',
        containers: [],
      };

      await expect(createBookingOrder(formData)).rejects.toThrow('Agent not found');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post('/api/cfs/v1/booking-orders', () => {
          return HttpResponse.json(
            {
              message: 'Validation failed',
              metaData: ['agentId is required', 'eta must be a valid date'],
              statusCode: 400,
            },
            { status: 400 },
          );
        }),
      );

      const formData = {
        agentId: '',
        eta: 'invalid-date',
        vesselCode: 'MAE',
        voyage: 'VY1234',
        containers: [],
      };

      await expect(createBookingOrder(formData)).rejects.toThrow(
        'Validation failed: agentId is required, eta must be a valid date',
      );
    });
  });

  describe('updateBookingOrder', () => {
    it('should update order with partial fields (no containers)', async () => {
      let capturedPayload: any;

      server.use(
        http.patch('/api/cfs/v1/booking-orders/:id', async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            statusCode: 200,
            data: { ...mockBookingOrder, voyage: 'VY5678' },
          });
        }),
      );

      const formData = {
        voyage: 'VY5678',
        notes: 'Updated notes',
        eta: '2025-11-01',
      };

      await updateBookingOrder('123e4567-e89b-12d3-a456-426614174000', formData);

      expect(capturedPayload).toEqual({
        voyage: 'VY5678',
        notes: 'Updated notes',
        eta: '2025-11-01T00:00:00.000Z',
      });
      expect(capturedPayload.containers).toBeUndefined();
    });

    it('should serialize containers when updating', async () => {
      let capturedPayload: any;

      server.use(
        http.patch('/api/cfs/v1/booking-orders/:id', async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            statusCode: 200,
            data: mockBookingOrder,
          });
        }),
      );

      const formData = {
        containers: [
          {
            id: 'cont-123', // Existing container (has `id`)
            containerId: 'cont-456',
            containerNo: 'MSCU1234567',
            isPriority: true,
            isCustomsCleared: false,
            cargoNature: 'DG' as const,
            cargoProperties: {
              imoClass: '3' as const,
              unNumber: 'UN 1203',
            },
            hbls: [],
          },
        ],
      };

      await updateBookingOrder('123e4567-e89b-12d3-a456-426614174000', formData);

      expect(capturedPayload.containers[0].summary).toBeDefined();
      expect(capturedPayload.containers[0].summary).toEqual({
        typeCode: undefined,
        tareWeightKg: undefined,
        cargo_nature: 'DG',
        cargo_properties: {
          imoClass: '3',
          unNumber: 'UN 1203',
        },
        is_atyard: false,
      });
    });

    it('should remove undefined values from payload', async () => {
      let capturedPayload: any;

      server.use(
        http.patch('/api/cfs/v1/booking-orders/:id', async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({
            statusCode: 200,
            data: mockBookingOrder,
          });
        }),
      );

      const formData = {
        voyage: 'VY5678',
        notes: undefined, // Should be removed
        subVoyage: null, // Should be kept
      };

      await updateBookingOrder('123e4567-e89b-12d3-a456-426614174000', formData);

      expect(capturedPayload).toEqual({
        voyage: 'VY5678',
        subVoyage: null,
      });
      expect(capturedPayload.notes).toBeUndefined();
    });

    it('should handle 404 error (booking order not found)', async () => {
      server.use(
        http.patch('/api/cfs/v1/booking-orders/:id', () => {
          return HttpResponse.json(
            {
              message: 'Booking order not found',
              statusCode: 404,
            },
            { status: 404 },
          );
        }),
      );

      await expect(
        updateBookingOrder('non-existent-id', { voyage: 'VY5678' }),
      ).rejects.toThrow('Booking order not found');
    });
  });

  describe('deleteBookingOrder', () => {
    it('should delete booking order successfully', async () => {
      server.use(
        http.delete('/api/cfs/v1/booking-orders/:id', () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(
        deleteBookingOrder('123e4567-e89b-12d3-a456-426614174000'),
      ).resolves.toBeUndefined();
    });

    it('should handle error when deleting approved order', async () => {
      server.use(
        http.delete('/api/cfs/v1/booking-orders/:id', () => {
          return HttpResponse.json(
            {
              message: 'Cannot delete approved booking order',
              statusCode: 400,
            },
            { status: 400 },
          );
        }),
      );

      await expect(
        deleteBookingOrder('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Cannot delete approved booking order');
    });

    it('should parse non-JSON error messages', async () => {
      server.use(
        http.delete('/api/cfs/v1/booking-orders/:id', () => {
          return new HttpResponse('Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        }),
      );

      await expect(
        deleteBookingOrder('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('approveBookingOrder', () => {
    it('should approve booking order successfully', async () => {
      const approvedOrder = {
        ...mockBookingOrder,
        code: 'BO-2025-0001',
        status: 'APPROVED' as const,
        approvedBy: 'user123',
        approvedAt: '2025-10-10T10:00:00Z',
      };

      server.use(
        http.post('/api/cfs/v1/booking-orders/:id/approve', () => {
          return HttpResponse.json({
            statusCode: 200,
            data: approvedOrder,
          });
        }),
      );

      const result = await approveBookingOrder('123e4567-e89b-12d3-a456-426614174000');

      expect(result.statusCode).toBe(200);
      expect(result.data.code).toBe('BO-2025-0001');
      expect(result.data.status).toBe('APPROVED');
    });

    it('should deserialize container summary fields in approved order', async () => {
      const approvedOrderWithContainer = {
        ...mockBookingOrder,
        containers: [mockContainerWithSummary],
      };

      server.use(
        http.post('/api/cfs/v1/booking-orders/:id/approve', () => {
          return HttpResponse.json({
            statusCode: 200,
            data: approvedOrderWithContainer,
          });
        }),
      );

      const result = await approveBookingOrder('123e4567-e89b-12d3-a456-426614174000');

      expect(result.data.containers[0].cargoNature).toBe('DG');
      expect(result.data.containers[0].cargoProperties).toMatchObject({
        imoClass: '3',
        unNumber: 'UN 1203',
      });
    });

    it('should handle validation errors from backend', async () => {
      server.use(
        http.post('/api/cfs/v1/booking-orders/:id/approve', () => {
          return HttpResponse.json(
            {
              message: 'Validation failed',
              metaData: ['At least one container is required', 'Extract deadline is required'],
              statusCode: 400,
            },
            { status: 400 },
          );
        }),
      );

      await expect(
        approveBookingOrder('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow(
        'Validation failed: At least one container is required, Extract deadline is required',
      );
    });

    it('should handle 409 conflict error', async () => {
      server.use(
        http.post('/api/cfs/v1/booking-orders/:id/approve', () => {
          return HttpResponse.json(
            {
              message: 'Booking order already approved',
              statusCode: 409,
            },
            { status: 409 },
          );
        }),
      );

      await expect(
        approveBookingOrder('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Booking order already approved');
    });
  });
});
