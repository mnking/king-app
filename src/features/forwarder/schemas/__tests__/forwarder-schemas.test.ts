import { describe, it, expect } from 'vitest';
import {
  ForwarderCreateSchema,
  ForwarderUpdateSchema,
  forwarderDefaultValues,
} from '../forwarder-schemas';

describe('Forwarder Schemas', () => {
  describe('ForwarderCreateSchema', () => {
    it('should validate correct forwarder data', () => {
      const validData = {
        code: 'PACFWD',
        name: 'Pacific Forwarding Partners',
        type: 'Forwarder',
        status: 'Active',
      };

      const result = ForwarderCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject code with lowercase letters', () => {
      const invalidData = {
        code: 'pacfwd',
        name: 'Pacific Forwarding',
        type: 'Forwarder',
        status: 'Active',
      };

      const result = ForwarderCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should reject code with special characters', () => {
      const invalidData = {
        code: 'PAC-FWD',
        name: 'Pacific Forwarding',
        type: 'Forwarder',
        status: 'Active',
      };

      const result = ForwarderCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should reject empty name', () => {
      const invalidData = {
        code: 'PACFWD',
        name: '',
        type: 'Forwarder',
        status: 'Active',
      };

      const result = ForwarderCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject invalid status', () => {
      const invalidData = {
        code: 'PACFWD',
        name: 'Pacific Forwarding',
        type: 'Forwarder',
        status: 'Pending',
      };

      const result = ForwarderCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject type other than "Forwarder"', () => {
      const invalidData = {
        code: 'PACFWD',
        name: 'Pacific Forwarding',
        type: 'Carrier',
        status: 'Active',
      };

      const result = ForwarderCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid Inactive status', () => {
      const validData = {
        code: 'PACFWD',
        name: 'Pacific Forwarding',
        type: 'Forwarder',
        status: 'Inactive',
      };

      const result = ForwarderCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('ForwarderUpdateSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        name: 'Updated Name',
      };

      const result = ForwarderUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(partialData);
      }
    });

    it('should allow status update only', () => {
      const partialData = {
        status: 'Inactive',
      };

      const result = ForwarderUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should still validate code format when provided', () => {
      const invalidData = {
        code: 'invalid-code',
      };

      const result = ForwarderUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('forwarderDefaultValues', () => {
    it('should have correct default values', () => {
      expect(forwarderDefaultValues).toEqual({
        code: '',
        name: '',
        type: 'Forwarder',
        status: 'Active',
      });
    });
  });
});
