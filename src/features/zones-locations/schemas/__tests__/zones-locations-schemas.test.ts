import { describe, it, expect } from 'vitest';
import {
  ZoneStatusEnum,
  LocationStatusEnum,
  LocationTypeEnum,
  ZoneTypeEnum,
  ZoneBaseSchema,
  ZoneCreateSchema,
  ZoneUpdateSchema,
  RBSLocationSchema,
  CustomLocationSchema,
  LocationCreateSchema,
  LocationUpdateSchema,
  zoneFormDefaults,
  locationFormDefaults,
  zoneStatusOptions,
  locationStatusOptions,
  locationTypeOptions,
  zoneTypeOptions,
} from '../zones-locations-schemas';

describe('ZoneStatusEnum', () => {
  it('should accept valid zone status values', () => {
    const validStatuses = ['active', 'inactive'];

    validStatuses.forEach((status) => {
      const result = ZoneStatusEnum.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    });
  });

  it('should reject invalid zone status values', () => {
    const invalidStatuses = ['pending', 'locked', 'archived', 123, null, undefined];

    invalidStatuses.forEach((status) => {
      const result = ZoneStatusEnum.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe('ZoneTypeEnum', () => {
  it('should accept valid zone type values', () => {
    const validTypes = ['RBS', 'CUSTOM'];

    validTypes.forEach((type) => {
      const result = ZoneTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  it('should reject invalid zone type values', () => {
    const invalidTypes = ['rbs', 'custom', 'STANDARD', 123, null, undefined];

    invalidTypes.forEach((type) => {
      const result = ZoneTypeEnum.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe('LocationStatusEnum', () => {
  it('should accept valid location status values', () => {
    const validStatuses = ['active', 'inactive', 'locked'];

    validStatuses.forEach((status) => {
      const result = LocationStatusEnum.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    });
  });

  it('should reject invalid location status values', () => {
    const invalidStatuses = ['pending', 'archived', 123, null, undefined];

    invalidStatuses.forEach((status) => {
      const result = LocationStatusEnum.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe('LocationTypeEnum', () => {
  it('should accept valid location type values', () => {
    const validTypes = ['RBS', 'CUSTOM'];

    validTypes.forEach((type) => {
      const result = LocationTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  it('should reject invalid location type values', () => {
    const invalidTypes = ['rbs', 'custom', 'STANDARD', 123, null, undefined];

    invalidTypes.forEach((type) => {
      const result = LocationTypeEnum.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe('ZoneBaseSchema', () => {
  it('should validate a complete valid zone', () => {
    const validZone = {
      code: 'A',
      name: 'Zone A',
      type: 'RBS',
      description: 'Primary storage zone',
      status: 'active',
    };

    const result = ZoneBaseSchema.safeParse(validZone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('A');
      expect(result.data.name).toBe('Zone A');
      expect(result.data.description).toBe('Primary storage zone');
      expect(result.data.status).toBe('active');
    }
  });

  it('should validate zone with minimal required fields', () => {
    const minimalZone = {
      code: 'B',
      name: 'Zone B',
      type: 'RBS',
      status: 'active',
    };

    const result = ZoneBaseSchema.safeParse(minimalZone);
    expect(result.success).toBe(true);
  });

  it('should require a valid zone type', () => {
    const zone = {
      code: 'A',
      name: 'Zone A',
      status: 'active',
      // @ts-expect-error testing invalid type
      type: 'STANDARD',
    };

    const result = ZoneBaseSchema.safeParse(zone);
    expect(result.success).toBe(false);
  });

  describe('code validation', () => {
    it('should accept single uppercase letter', () => {
      const zone = { code: 'A', name: 'Zone A', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
    });

    it('should accept two uppercase letters', () => {
      const zone = { code: 'AB', name: 'Zone AB', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
    });

    it('should reject code with more than 2 characters', () => {
      const zone = { code: 'ABC', name: 'Zone ABC', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone code must be 1-2 characters');
      }
    });

    it('should reject lowercase letters', () => {
      const zone = { code: 'a', name: 'Zone a', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone code must be 1-2 uppercase letters');
      }
    });

    it('should reject numbers in code', () => {
      const zone = { code: 'A1', name: 'Zone A1', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone code must be 1-2 uppercase letters');
      }
    });

    it('should reject code with whitespace', () => {
      const zone = { code: ' A ', name: 'Zone A', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone code must be 1-2 characters');
      }
    });

    it('should reject empty code', () => {
      const zone = { code: '', name: 'Zone', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone code is required');
      }
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const zone = { code: 'A', name: '', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone name is required');
      }
    });

    it('should reject names that exceed 100 characters', () => {
      const longName = 'A'.repeat(101);
      const zone = { code: 'A', name: longName, type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Zone name must not exceed 100 characters');
      }
    });

    it('should accept name with exactly 100 characters', () => {
      const exactName = 'A'.repeat(100);
      const zone = { code: 'A', name: exactName, type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name', () => {
      const zone = { code: 'A', name: '  Zone A  ', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Zone A');
      }
    });
  });

  describe('description validation', () => {
    it('should accept optional description', () => {
      const zone = { code: 'A', name: 'Zone A', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
    });

    it('should keep empty string description as empty string', () => {
      const zone = { code: 'A', name: 'Zone A', description: '', type: 'RBS', status: 'active' };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('');
      }
    });

    it('should preserve valid description', () => {
      const zone = {
        code: 'A',
        name: 'Zone A',
        description: 'Primary zone',
        type: 'RBS',
        status: 'active',
      };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Primary zone');
      }
    });

    it('should reject descriptions that exceed 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      const zone = {
        code: 'A',
        name: 'Zone A',
        description: longDescription,
        type: 'RBS',
        status: 'active',
      };
      const result = ZoneBaseSchema.safeParse(zone);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Description must not exceed 500 characters'
        );
      }
    });
  });
});

describe('ZoneCreateSchema', () => {
  it('should validate valid zone creation data', () => {
    const zone = {
      code: 'A',
      name: 'Zone A',
      description: 'Primary zone',
      type: 'RBS',
      status: 'active',
    };

    const result = ZoneCreateSchema.safeParse(zone);
    expect(result.success).toBe(true);
  });

  it('should apply same validations as ZoneBaseSchema', () => {
    const invalidZone = {
      code: 'abc',
      name: '',
      type: 'RBS',
      status: 'active',
    };

    const result = ZoneCreateSchema.safeParse(invalidZone);
    expect(result.success).toBe(false);
  });
});

describe('ZoneUpdateSchema', () => {
  it('should allow partial updates', () => {
    const update = { name: 'Updated Zone Name' };
    const result = ZoneUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });

  it('should not allow code updates', () => {
    const update = { code: 'B' };
    const result = ZoneUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
    if (result.success) {
      // Code should not be in the result since it's omitted
      expect(result.data).not.toHaveProperty('code');
    }
  });

  it('should validate updated fields', () => {
    const invalidUpdate = { name: 'A'.repeat(101) };
    const result = ZoneUpdateSchema.safeParse(invalidUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Zone name must not exceed 100 characters');
    }
  });

  it('should allow empty update object', () => {
    const update = {};
    const result = ZoneUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });
});

describe('RBSLocationSchema', () => {
  it('should validate complete RBS location', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'RBS',
      rbsRow: 'R01',
      rbsBay: 'B01',
      rbsSlot: 'S01',
      status: 'active',
    };

    const result = RBSLocationSchema.safeParse(location);
    expect(result.success).toBe(true);
  });

  it('should require type to be RBS literal', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'CUSTOM',
      rbsRow: 'R01',
      rbsBay: 'B01',
      rbsSlot: 'S01',
      status: 'active',
    };

    const result = RBSLocationSchema.safeParse(location);
    expect(result.success).toBe(false);
  });

  describe('rbsRow validation', () => {
    it('should accept valid row format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R01',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should accept multi-digit row numbers', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R123',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should reject invalid row format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: '01',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Row must be in format R01, R02, etc.');
      }
    });

    it('should reject row with whitespace', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: ' R01 ',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Row must be in format R01, R02, etc.');
      }
    });
  });

  describe('rbsBay validation', () => {
    it('should accept valid bay format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R01',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should reject invalid bay format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R01',
        rbsBay: '01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Bay must be in format B01, B02, etc.');
      }
    });
  });

  describe('rbsSlot validation', () => {
    it('should accept valid slot format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R01',
        rbsBay: 'B01',
        rbsSlot: 'S01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should reject invalid slot format', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'RBS',
        rbsRow: 'R01',
        rbsBay: 'B01',
        rbsSlot: '01',
        status: 'active',
      };

      const result = RBSLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Slot must be in format S01, S02, etc.');
      }
    });
  });
});

describe('CustomLocationSchema', () => {
  it('should validate complete custom location', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'CUSTOM',
      customLabel: 'DOCK01',
      status: 'active',
    };

    const result = CustomLocationSchema.safeParse(location);
    expect(result.success).toBe(true);
  });

  it('should require type to be CUSTOM literal', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'RBS',
      customLabel: 'DOCK01',
      status: 'active',
    };

    const result = CustomLocationSchema.safeParse(location);
    expect(result.success).toBe(false);
  });

  describe('customLabel validation', () => {
    it('should accept uppercase letters and numbers', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'CUSTOM',
        customLabel: 'DOCK123',
        status: 'active',
      };

      const result = CustomLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should reject lowercase letters', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'CUSTOM',
        customLabel: 'dock01',
        status: 'active',
      };

      const result = CustomLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Label must contain only uppercase letters and numbers'
        );
      }
    });

    it('should reject special characters', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'CUSTOM',
        customLabel: 'DOCK-01',
        status: 'active',
      };

      const result = CustomLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it('should reject labels exceeding 20 characters', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'CUSTOM',
        customLabel: 'A'.repeat(21),
        status: 'active',
      };

      const result = CustomLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Location label must not exceed 20 characters'
        );
      }
    });

    it('should reject label with whitespace', () => {
      const location = {
        zoneId: 'zone-123',
        type: 'CUSTOM',
        customLabel: ' DOCK01 ',
        status: 'active',
      };

      const result = CustomLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Label must contain only uppercase letters and numbers'
        );
      }
    });
  });
});

describe('LocationCreateSchema', () => {
  it('should validate RBS location via discriminated union', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'RBS',
      rbsRow: 'R01',
      rbsBay: 'B01',
      rbsSlot: 'S01',
      status: 'active',
    };

    const result = LocationCreateSchema.safeParse(location);
    expect(result.success).toBe(true);
  });

  it('should validate CUSTOM location via discriminated union', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'CUSTOM',
      customLabel: 'DOCK01',
      status: 'active',
    };

    const result = LocationCreateSchema.safeParse(location);
    expect(result.success).toBe(true);
  });

  it('should reject RBS type with custom fields', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'RBS',
      customLabel: 'DOCK01',
      status: 'active',
    };

    const result = LocationCreateSchema.safeParse(location);
    expect(result.success).toBe(false);
  });

  it('should reject CUSTOM type with RBS fields', () => {
    const location = {
      zoneId: 'zone-123',
      type: 'CUSTOM',
      rbsRow: 'R01',
      rbsBay: 'B01',
      rbsSlot: 'S01',
      status: 'active',
    };

    const result = LocationCreateSchema.safeParse(location);
    expect(result.success).toBe(false);
  });
});

describe('LocationUpdateSchema', () => {
  it('should allow partial updates with RBS fields', () => {
    const update = { rbsRow: 'R02' };
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });

  it('should allow partial updates with custom fields', () => {
    const update = { customLabel: 'DOCK02' };
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });

  it('should validate RBS row format when provided', () => {
    const update = { rbsRow: 'invalid' };
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Row must be in format R01, R02, etc.');
    }
  });

  it('should validate custom label format when provided', () => {
    const update = { customLabel: 'dock-01' };
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Label must contain only uppercase letters and numbers'
      );
    }
  });

  it('should allow empty update object', () => {
    const update = {};
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });

  it('should allow status update', () => {
    const update = { status: 'locked' };
    const result = LocationUpdateSchema.safeParse(update);

    expect(result.success).toBe(true);
  });
});

describe('zoneFormDefaults', () => {
  it('should provide sensible default values', () => {
    expect(zoneFormDefaults).toEqual({
      code: '',
      name: '',
      description: '',
      status: 'active',
      type: 'RBS',
    });
  });

  it('should have defaults that pass validation with required fields', () => {
    const zoneWithDefaults = {
      ...zoneFormDefaults,
      code: 'A',
      name: 'Zone A',
    };

    const result = ZoneCreateSchema.safeParse(zoneWithDefaults);
    expect(result.success).toBe(true);
  });
});

describe('locationFormDefaults', () => {
  it('should provide sensible RBS defaults', () => {
    expect(locationFormDefaults.RBS).toEqual({
      type: 'RBS',
      status: 'inactive',
      rbsRow: 'R01',
      rbsBay: 'B01',
      rbsSlot: 'S01',
    });
  });

  it('should provide sensible CUSTOM defaults', () => {
    expect(locationFormDefaults.CUSTOM).toEqual({
      type: 'CUSTOM',
      status: 'inactive',
      customLabel: '',
    });
  });

  it('should have RBS defaults that pass validation with zoneId', () => {
    const locationWithDefaults = {
      zoneId: 'zone-123',
      ...locationFormDefaults.RBS,
    };

    const result = LocationCreateSchema.safeParse(locationWithDefaults);
    expect(result.success).toBe(true);
  });

  it('should have CUSTOM defaults that pass validation with zoneId and label', () => {
    const locationWithDefaults = {
      zoneId: 'zone-123',
      ...locationFormDefaults.CUSTOM,
      customLabel: 'DOCK01',
    };

    const result = LocationCreateSchema.safeParse(locationWithDefaults);
    expect(result.success).toBe(true);
  });
});

describe('zoneStatusOptions', () => {
  it('should include all valid zone status values', () => {
    const expectedStatuses = ['active', 'inactive'];
    const actualStatuses = zoneStatusOptions.map((option) => option.value);

    expect(actualStatuses).toEqual(expectedStatuses);
  });

  it('should have proper labels for each status', () => {
    const expectedOptions = [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ];

    expect(zoneStatusOptions).toEqual(expectedOptions);
  });

  it('should have valid status enum values', () => {
    zoneStatusOptions.forEach((option) => {
      const result = ZoneStatusEnum.safeParse(option.value);
      expect(result.success).toBe(true);
    });
  });
});

describe('zoneTypeOptions', () => {
  it('should include all valid zone type values', () => {
    const expectedTypes = ['RBS', 'CUSTOM'];
    const actualTypes = zoneTypeOptions.map((option) => option.value);

    expect(actualTypes).toEqual(expectedTypes);
  });

  it('should have proper labels for each type', () => {
    const expectedOptions = [
      { value: 'RBS', label: 'Row-Bay-Slot (RBS)' },
      { value: 'CUSTOM', label: 'Custom Label' },
    ];

    expect(zoneTypeOptions).toEqual(expectedOptions);
  });

  it('should have valid type enum values', () => {
    zoneTypeOptions.forEach((option) => {
      const result = ZoneTypeEnum.safeParse(option.value);
      expect(result.success).toBe(true);
    });
  });
});

describe('locationStatusOptions', () => {
  it('should include all valid location status values', () => {
    const expectedStatuses = ['active', 'inactive', 'locked'];
    const actualStatuses = locationStatusOptions.map((option) => option.value);

    expect(actualStatuses).toEqual(expectedStatuses);
  });

  it('should have proper labels for each status', () => {
    const expectedOptions = [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'locked', label: 'Locked' },
    ];

    expect(locationStatusOptions).toEqual(expectedOptions);
  });

  it('should have valid status enum values', () => {
    locationStatusOptions.forEach((option) => {
      const result = LocationStatusEnum.safeParse(option.value);
      expect(result.success).toBe(true);
    });
  });
});

describe('locationTypeOptions', () => {
  it('should include all valid location type values', () => {
    const expectedTypes = ['RBS', 'CUSTOM'];
    const actualTypes = locationTypeOptions.map((option) => option.value);

    expect(actualTypes).toEqual(expectedTypes);
  });

  it('should have proper labels for each type', () => {
    const expectedOptions = [
      { value: 'RBS', label: 'Row-Bay-Slot (RBS)' },
      { value: 'CUSTOM', label: 'Custom Label' },
    ];

    expect(locationTypeOptions).toEqual(expectedOptions);
  });

  it('should have valid type enum values', () => {
    locationTypeOptions.forEach((option) => {
      const result = LocationTypeEnum.safeParse(option.value);
      expect(result.success).toBe(true);
    });
  });
});
