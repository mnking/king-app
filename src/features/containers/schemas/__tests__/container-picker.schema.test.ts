import { describe, it, expect } from 'vitest';
import { containerNumberSchema, containerFieldSchema } from '../container-picker.schema';
import type { ContainerFieldValue } from '../container-picker.schema';

describe('containerNumberSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid container number', () => {
      const result = containerNumberSchema.parse('MSCU6639870');
      expect(result).toBe('MSCU6639870');
    });

    it('should transform lowercase to uppercase', () => {
      const result = containerNumberSchema.parse('mscu6639870');
      expect(result).toBe('MSCU6639870');
    });

    it('should remove spaces', () => {
      const result = containerNumberSchema.parse('MSCU 663 987 0');
      expect(result).toBe('MSCU6639870');
    });

    it('should handle mixed case with spaces', () => {
      const result = containerNumberSchema.parse('  mscu 663 987 0  ');
      expect(result).toBe('MSCU6639870');
    });

    it('should accept all valid mock container numbers', () => {
      expect(containerNumberSchema.parse('MSCU6639870')).toBe('MSCU6639870');
      expect(containerNumberSchema.parse('TEMU9876540')).toBe('TEMU9876540');
      expect(containerNumberSchema.parse('CMAU1234564')).toBe('CMAU1234564');
      expect(containerNumberSchema.parse('HLBU5555557')).toBe('HLBU5555557');
    });
  });

  describe('Invalid format', () => {
    it('should reject empty string', () => {
      expect(() => containerNumberSchema.parse('')).toThrow('Container number is required');
    });

    it('should reject too short', () => {
      expect(() => containerNumberSchema.parse('MSCU663987')).toThrow('Invalid ISO 6346 format');
    });

    it('should reject too long', () => {
      expect(() => containerNumberSchema.parse('MSCU66398712')).toThrow('Invalid ISO 6346 format');
    });

    it('should reject wrong pattern (3 letters + 8 digits)', () => {
      expect(() => containerNumberSchema.parse('MSC66398712')).toThrow('Invalid ISO 6346 format');
    });

    it('should reject wrong pattern (5 letters + 6 digits)', () => {
      expect(() => containerNumberSchema.parse('MSCUX663987')).toThrow('Invalid ISO 6346 format');
    });

    it('should reject special characters', () => {
      expect(() => containerNumberSchema.parse('MSCU-663987-0')).toThrow('Invalid ISO 6346 format');
    });

    it('should reject letters in numeric part', () => {
      expect(() => containerNumberSchema.parse('MSCU663987A')).toThrow('Invalid ISO 6346 format');
    });
  });

  describe('Invalid check digit', () => {
    it('should reject MSCU6639871 (wrong check digit)', () => {
      expect(() => containerNumberSchema.parse('MSCU6639871')).toThrow('Invalid ISO 6346 check digit');
    });

    it('should reject TEMU9876543 (wrong check digit)', () => {
      expect(() => containerNumberSchema.parse('TEMU9876543')).toThrow('Invalid ISO 6346 check digit');
    });

    it('should reject CMAU1234567 (wrong check digit)', () => {
      expect(() => containerNumberSchema.parse('CMAU1234567')).toThrow('Invalid ISO 6346 check digit');
    });

    it('should reject HLBU5555555 (wrong check digit)', () => {
      expect(() => containerNumberSchema.parse('HLBU5555555')).toThrow('Invalid ISO 6346 check digit');
    });
  });

  describe('safeParse', () => {
    it('should return success for valid input', () => {
      const result = containerNumberSchema.safeParse('MSCU6639870');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('MSCU6639870');
      }
    });

    it('should return error for invalid input', () => {
      const result = containerNumberSchema.safeParse('INVALID');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should return error with message for invalid check digit', () => {
      const result = containerNumberSchema.safeParse('MSCU6639871');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('check digit');
      }
    });
  });
});

describe('containerFieldSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid container field value', () => {
      const value: ContainerFieldValue = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        number: 'MSCU6639870',
        typeCode: '22G1',
      };
      const result = containerFieldSchema.parse(value);
      expect(result).toEqual(value);
    });

    it('should accept null id and typeCode', () => {
      const value: ContainerFieldValue = {
        id: null,
        number: 'MSCU6639870',
        typeCode: null,
      };
      const result = containerFieldSchema.parse(value);
      expect(result).toEqual(value);
    });

    it('should transform container number', () => {
      const value = {
        id: null,
        number: 'mscu 663 987 0',
        typeCode: null,
      };
      const result = containerFieldSchema.parse(value);
      expect(result.number).toBe('MSCU6639870');
    });

    it('should accept valid UUID for id', () => {
      const value = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        number: 'MSCU6639870',
        typeCode: '22G1',
      };
      const result = containerFieldSchema.parse(value);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('Invalid inputs', () => {
    it('should reject invalid UUID', () => {
      const value = {
        id: 'not-a-uuid',
        number: 'MSCU6639870',
        typeCode: '22G1',
      };
      expect(() => containerFieldSchema.parse(value)).toThrow();
    });

    it('should reject invalid container number', () => {
      const value = {
        id: null,
        number: 'INVALID',
        typeCode: null,
      };
      expect(() => containerFieldSchema.parse(value)).toThrow('Invalid ISO 6346 format');
    });

    it('should reject wrong check digit', () => {
      const value = {
        id: null,
        number: 'MSCU6639871',
        typeCode: null,
      };
      expect(() => containerFieldSchema.parse(value)).toThrow('Invalid ISO 6346 check digit');
    });

    it('should reject missing number field', () => {
      const value = {
        id: null,
        typeCode: null,
      };
      expect(() => containerFieldSchema.parse(value)).toThrow();
    });

    it('should reject missing id field', () => {
      const value = {
        number: 'MSCU6639870',
        typeCode: null,
      };
      expect(() => containerFieldSchema.parse(value)).toThrow();
    });

    it('should reject missing typeCode field', () => {
      const value = {
        id: null,
        number: 'MSCU6639870',
      };
      expect(() => containerFieldSchema.parse(value)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('should return success for valid input', () => {
      const value: ContainerFieldValue = {
        id: null,
        number: 'MSCU6639870',
        typeCode: null,
      };
      const result = containerFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(value);
      }
    });

    it('should return error for invalid input', () => {
      const value = {
        id: 'not-a-uuid',
        number: 'MSCU6639870',
        typeCode: null,
      };
      const result = containerFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const value = {
        id: 'not-a-uuid',
        number: 'INVALID',
        typeCode: null,
      };
      const result = containerFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
