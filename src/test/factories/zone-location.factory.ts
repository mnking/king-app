import { mockZones, mockLocations } from '@/mocks/data/zones-locations';

/**
 * Quick access to test zones
 */
export const testZones = {
  first: mockZones[0],
  all: mockZones,
};

/**
 * Quick access to test locations
 */
export const testLocations = {
  first: mockLocations[0],
  all: mockLocations,
};

/**
 * Build a zone with optional overrides
 */
export const buildZone = (overrides?: Partial<typeof mockZones[0]>) => ({
  ...mockZones[0],
  id: crypto.randomUUID(),
  name: `Test Zone ${Date.now()}`,
  code: `ZONE-${Date.now()}`,
  ...overrides,
});

/**
 * Build a location with optional overrides
 */
export const buildLocation = (overrides?: Partial<typeof mockLocations[0]>) => ({
  ...mockLocations[0],
  id: crypto.randomUUID(),
  name: `Test Location ${Date.now()}`,
  code: `LOC-${Date.now()}`,
  ...overrides,
});

/**
 * Test scenarios for edge cases
 */
export const zoneLocationScenarios = {
  /** Active zone */
  activeZone: () =>
    buildZone({
      is_active: true,
    }),

  /** Inactive zone */
  inactiveZone: () =>
    buildZone({
      is_active: false,
    }),

  /** Active location */
  activeLocation: () =>
    buildLocation({
      is_active: true,
    }),

  /** Inactive location */
  inactiveLocation: () =>
    buildLocation({
      is_active: false,
    }),

  /** Zone with locations */
  zoneWithLocations: (locationCount: number) => {
    const zone = buildZone();
    const locations = Array.from({ length: locationCount }, () =>
      buildLocation({ zone_id: zone.id }),
    );
    return { zone, locations };
  },

  /** Batch of zones */
  batchZones: (count: number) =>
    Array.from({ length: count }, (_, i) =>
      buildZone({
        name: `Zone ${i}`,
        code: `ZONE-${i}`,
      }),
    ),

  /** Batch of locations */
  batchLocations: (count: number) =>
    Array.from({ length: count }, (_, i) =>
      buildLocation({
        name: `Location ${i}`,
        code: `LOC-${i}`,
      }),
    ),
};
