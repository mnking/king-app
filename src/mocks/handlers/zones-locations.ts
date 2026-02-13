import { http, HttpResponse } from 'msw';
import {
  mockZones,
  mockLocations,
  generateId,
  generateLocationCode,
} from '../data/zones-locations';
import type {
  Zone,
  Location,
  ZoneCreateForm,
  LocationCreateForm,
  LocationLayoutRequest,
  LocationLayoutResponse,
} from '@/features/zones-locations/types';

// Use full API path to match real API URL construction
const API_URL = '/api/cfs';

// Mutable copies for CRUD operations
const zones = [...mockZones];
const locations = [...mockLocations];

export const zonesLocationsHandlers = [
  // Zone endpoints

  // GET /api/cfs/v1/zones - List zones with pagination and filtering
  http.get(`${API_URL}/v1/zones`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '20');
    const status = url.searchParams.get('status');

    let filteredZones = [...zones];

    // Filter by status
    if (status && status !== 'all') {
      filteredZones = filteredZones.filter((zone) => zone.status === status);
    }

    // Sort by code
    filteredZones.sort((a, b) => a.code.localeCompare(b.code));

    // Pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedZones = filteredZones.slice(startIndex, endIndex);

    return HttpResponse.json({
      statusCode: 200,
      data: {
        results: paginatedZones,
        total: filteredZones.length,
      },
    });
  }),

  // GET /v1/zones/:id - Get zone by ID
  http.get(`${API_URL}/v1/zones/:id`, ({ params }) => {
    const { id } = params;
    const zone = zones.find((z) => z.id === id);

    if (!zone) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Zone not found' },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      statusCode: 200,
      data: zone,
    });
  }),

  // POST /v1/zones - Create new zone
  http.post(`${API_URL}/v1/zones`, async ({ request }) => {
    const body = (await request.json()) as ZoneCreateForm;

    // Check for duplicate code
    if (zones.some((zone) => zone.code === body.code)) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Zone code already exists' },
        { status: 400 },
      );
    }

    const newZone: Zone = {
      id: generateId(),
      code: body.code,
      name: body.name,
      type: body.type,
      description: body.description,
      status: body.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    };

    zones.push(newZone);

    return HttpResponse.json(
      {
        statusCode: 201,
        data: newZone,
      },
      { status: 201 },
    );
  }),

  // PATCH /v1/zones/:id - Update zone
  http.patch(`${API_URL}/v1/zones/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();

    const zoneIndex = zones.findIndex((z) => z.id === id);
    if (zoneIndex === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Zone not found' },
        { status: 404 },
      );
    }

    const updatedZone: Zone = {
      ...zones[zoneIndex],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    zones[zoneIndex] = updatedZone;

    return HttpResponse.json({
      statusCode: 200,
      data: updatedZone,
    });
  }),

  // PATCH /v1/zones/:id/status - Update zone status
  http.patch(`${API_URL}/v1/zones/:id/status`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { status: Zone['status'] };

    const zoneIndex = zones.findIndex((z) => z.id === id);
    if (zoneIndex === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Zone not found' },
        { status: 404 },
      );
    }

    const updatedZone: Zone = {
      ...zones[zoneIndex],
      status: body.status,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    zones[zoneIndex] = updatedZone;

    return HttpResponse.json({
      statusCode: 200,
      data: updatedZone,
    });
  }),

  // DELETE /v1/zones/:id - Delete zone
  http.delete(`${API_URL}/v1/zones/:id`, ({ params }) => {
    const { id } = params;

    const zoneIndex = zones.findIndex((z) => z.id === id);
    if (zoneIndex === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Zone not found' },
        { status: 404 },
      );
    }

    // Check if zone has locations
    const zoneLocations = locations.filter((l) => l.zoneId === id);
    if (zoneLocations.length > 0) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: 'Cannot delete zone with existing locations',
        },
        { status: 400 },
      );
    }

    zones.splice(zoneIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/zones/:id/locations - Get locations for a zone
  http.get(`${API_URL}/v1/zones/:zoneId/locations`, ({ params, request }) => {
    const { zoneId } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') || '50');
    const status = url.searchParams.get('status');

    let filteredLocations = locations.filter((l) => l.zoneId === zoneId);

    // Filter by status
    if (status && status !== 'all') {
      filteredLocations = filteredLocations.filter(
        (location) => location.status === status,
      );
    }

    // Sort by display code
    filteredLocations.sort((a, b) =>
      a.displayCode.localeCompare(b.displayCode),
    );

    // Pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

    return HttpResponse.json({
      statusCode: 200,
      data: {
        results: paginatedLocations,
        total: filteredLocations.length,
      },
    });
  }),

  // Location endpoints

  // GET /v1/locations/:id - Get location by ID
  http.get(`${API_URL}/v1/locations/:id`, ({ params }) => {
    const { id } = params;
    const location = locations.find((l) => l.id === id);

    if (!location) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Location not found' },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      statusCode: 200,
      data: location,
    });
  }),

  // POST /v1/locations - Create new location
  http.post(`${API_URL}/v1/locations`, async ({ request }) => {
    const body = (await request.json()) as LocationCreateForm;

    // Find the zone to get zone code
    const zone = zones.find((z) => z.id === body.zoneId);
    if (!zone) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Zone not found' },
        { status: 404 },
      );
    }

    // Generate location codes
    let codeDetails;
    if (body.type === 'RBS') {
      codeDetails = generateLocationCode(zone.code, 'RBS', {
        rbsRow: body.rbsRow,
        rbsBay: body.rbsBay,
        rbsSlot: body.rbsSlot,
      });
    } else {
      codeDetails = generateLocationCode(zone.code, 'CUSTOM', {
        customLabel: body.customLabel,
      });
    }

    // Check for duplicate location code within the zone
    const existingLocation = locations.find(
      (l) =>
        l.zoneId === body.zoneId && l.locationCode === codeDetails.locationCode,
    );
    if (existingLocation) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: 'Location code already exists in this zone',
        },
        { status: 400 },
      );
    }

    const newLocation: Location = {
      id: generateId(),
      zoneId: body.zoneId,
      zoneCode: zone.code,
      zoneType: zone.type,
      type: body.type,
      rbsRow: body.type === 'RBS' ? body.rbsRow : null,
      rbsBay: body.type === 'RBS' ? body.rbsBay : null,
      rbsSlot: body.type === 'RBS' ? body.rbsSlot : null,
      customLabel: body.type === 'CUSTOM' ? body.customLabel : null,
      locationCode: codeDetails.locationCode,
      absoluteCode: codeDetails.absoluteCode,
      displayCode: codeDetails.displayCode,
      status: body.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    };

    locations.push(newLocation);

    return HttpResponse.json(
      {
        statusCode: 201,
        data: newLocation,
      },
      { status: 201 },
    );
  }),

  // POST /v1/zones/:zoneId/locations/layout - Bulk create RBS layout
  http.post(
    `${API_URL}/v1/zones/:zoneId/locations/layout`,
    async ({ params, request }) => {
      const { zoneId } = params;
      const body = (await request.json()) as LocationLayoutRequest;

      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) {
        return HttpResponse.json(
          { statusCode: 404, message: 'Zone not found' },
          { status: 404 },
        );
      }

      if (zone.type !== 'RBS') {
        return HttpResponse.json(
          { statusCode: 400, message: 'Layout creation only supported for RBS zones' },
          { status: 400 },
        );
      }

      const created: Location[] = [];
      const assignments: LocationLayoutResponse['assignments'] = [];

      body.layout.rows.forEach((row, rowIndex) => {
        const rbsRow = `R${String(rowIndex + 1).padStart(2, '0')}`;
        row.bays.forEach((bay, bayIndex) => {
          const rbsBay = `B${String(bayIndex + 1).padStart(2, '0')}`;

          for (let slotIndex = 0; slotIndex < bay.slotsCount; slotIndex++) {
            const rbsSlot = `S${String(slotIndex + 1).padStart(2, '0')}`;
            const codeDetails = generateLocationCode(zone.code, 'RBS', {
              rbsRow,
              rbsBay,
              rbsSlot,
            });

            // Prevent duplicates
            const exists = locations.some(
              (l) =>
                l.zoneId === zoneId &&
                l.locationCode === codeDetails.locationCode,
            );
            if (exists) {
              continue;
            }

            const newLocation: Location = {
              id: generateId(),
              zoneId,
              zoneCode: zone.code,
              zoneType: zone.type,
              type: 'RBS',
              rbsRow,
              rbsBay,
              rbsSlot,
              customLabel: null,
              locationCode: codeDetails.locationCode,
              absoluteCode: codeDetails.absoluteCode,
              displayCode: codeDetails.displayCode,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'admin',
              updatedBy: 'admin',
            };

            created.push(newLocation);
            assignments.push({
              rowIndex,
              bayIndex,
              slotIndex,
              assignedCode: codeDetails.locationCode,
            });
            locations.push(newLocation);
          }
        });
      });

      return HttpResponse.json(
        {
          statusCode: 201,
          data: {
            created,
            assignments,
          },
        },
        { status: 201 },
      );
    },
  ),

  // PATCH /v1/locations/:id - Update location
  http.patch(`${API_URL}/v1/locations/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();

    const locationIndex = locations.findIndex((l) => l.id === id);
    if (locationIndex === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Location not found' },
        { status: 404 },
      );
    }

    const currentLocation = locations[locationIndex];
    const zone = zones.find((z) => z.id === currentLocation.zoneId);

    let updatedLocation = {
      ...currentLocation,
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    // Regenerate codes if relevant fields changed
    if (body.rbsRow || body.rbsBay || body.rbsSlot || body.customLabel) {
      let codeDetails;
      if (updatedLocation.type === 'RBS') {
        codeDetails = generateLocationCode(zone!.code, 'RBS', {
          rbsRow: updatedLocation.rbsRow!,
          rbsBay: updatedLocation.rbsBay!,
          rbsSlot: updatedLocation.rbsSlot!,
        });
      } else {
        codeDetails = generateLocationCode(zone!.code, 'CUSTOM', {
          customLabel: updatedLocation.customLabel!,
        });
      }

      updatedLocation = {
        ...updatedLocation,
        locationCode: codeDetails.locationCode,
        absoluteCode: codeDetails.absoluteCode,
        displayCode: codeDetails.displayCode,
      };
    }

    locations[locationIndex] = updatedLocation;

    return HttpResponse.json({
      statusCode: 200,
      data: updatedLocation,
    });
  }),

  // PATCH /v1/locations/:id/status - Update location status
  http.patch(
    `${API_URL}/v1/locations/:id/status`,
    async ({ params, request }) => {
      const { id } = params;
      const body = (await request.json()) as { status: Location['status'] };

      const locationIndex = locations.findIndex((l) => l.id === id);
      if (locationIndex === -1) {
        return HttpResponse.json(
          { statusCode: 404, message: 'Location not found' },
          { status: 404 },
        );
      }

      const updatedLocation: Location = {
        ...locations[locationIndex],
        status: body.status,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
      };

      locations[locationIndex] = updatedLocation;

      return HttpResponse.json({
        statusCode: 200,
        data: updatedLocation,
      });
    },
  ),

  // DELETE /v1/locations/:id - Delete location
  http.delete(`${API_URL}/v1/locations/:id`, ({ params }) => {
    const { id } = params;

    const locationIndex = locations.findIndex((l) => l.id === id);
    if (locationIndex === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: 'Location not found' },
        { status: 404 },
      );
    }

    // TODO: Add check for items in location when inventory system is implemented

    locations.splice(locationIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
