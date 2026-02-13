import { describe, it, expect } from 'vitest';
import {
  HBLCreateSchema,
  HBLContainerSchema,
  HBLUpdateSchema,
  HBLApprovalSchema,
  hblDefaultValues,
} from '../hbl-schemas';

describe('HBL Schemas', () => {
  describe('HBLContainerSchema', () => {
    it('should validate correct container data', () => {
      const validContainer = {
        containerNumber: 'MSCU6639871',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL1234567',
      };

      const result = HBLContainerSchema.safeParse(validContainer);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validContainer);
      }
    });

    it('should reject invalid container number format (too short)', () => {
      const invalidContainer = {
        containerNumber: 'MSCU123',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL123',
      };

      const result = HBLContainerSchema.safeParse(invalidContainer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('ISO 6346');
      }
    });

    it('should reject container number with lowercase letters', () => {
      const invalidContainer = {
        containerNumber: 'mscu6639871',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL123',
      };

      const result = HBLContainerSchema.safeParse(invalidContainer);
      expect(result.success).toBe(false);
    });

    it('should reject container type code not exactly 4 characters', () => {
      const invalidContainer = {
        containerNumber: 'MSCU6639871',
        containerTypeCode: '22G',
        sealNumber: 'SEAL123',
      };

      const result = HBLContainerSchema.safeParse(invalidContainer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exactly 4 characters');
      }
    });

    it('should allow empty seal number (draft mode)', () => {
      const validContainer = {
        containerNumber: 'MSCU6639871',
        containerTypeCode: '22G1',
        sealNumber: '',
      };

      const result = HBLContainerSchema.safeParse(validContainer);
      // Empty seal is now allowed for draft mode
      expect(result.success).toBe(true);
    });

    it('should reject seal number with special characters', () => {
      const invalidContainer = {
        containerNumber: 'MSCU6639871',
        containerTypeCode: '22G1',
        sealNumber: 'SEAL-123',
      };

      const result = HBLContainerSchema.safeParse(invalidContainer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric');
      }
    });
  });

  describe('HBLCreateSchema', () => {
    const validHBLData = {
      code: 'HBL1234565',
      receivedAt: '2024-01-18T00:00:00.000Z',
      mbl: 'MBL-001',
      eta: '2024-01-20T00:00:00.000Z',
      document: { id: 'doc-1', name: 'DOC-1234567.pdf', mimeType: 'application/pdf' },
      issuerId: '123e4567-e89b-12d3-a456-426614174000',
      shipper: 'Pacific Exports Ltd',
      consignee: 'Harbor Imports LLC',
      notifyParty: 'Harbor Imports LLC - LA Branch',
      vesselName: 'Horizon Trader',
      voyageNumber: 'HZ1234',
      pol: 'SGSIN',
      pod: 'USLAX',
      containers: [
        {
          containerNumber: 'MSCU6639871',
          containerTypeCode: '22G1',
          sealNumber: 'SEAL1234567',
        },
      ],
    };

    it('should validate correct HBL data', () => {
      const result = HBLCreateSchema.safeParse(validHBLData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validHBLData);
      }
    });

    it('should allow empty HBL code (draft mode)', () => {
      const draftData = { ...validHBLData, code: '' };
      const result = HBLCreateSchema.safeParse(draftData);
      // Empty fields are now allowed for draft mode
      expect(result.success).toBe(true);
    });

    it('should reject HBL code with special characters', () => {
      const invalidData = { ...validHBLData, code: 'HBL@123456' };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric or hyphen');
      }
    });

    it('should reject invalid ISO date format', () => {
      const invalidData = { ...validHBLData, receivedAt: '2024-01-18' };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('ISO date');
      }
    });

    it('should reject invalid UUID for issuerId', () => {
      const invalidData = { ...validHBLData, issuerId: 'not-a-uuid' };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('forwarder ID');
      }
    });

    it('should allow empty shipper (draft mode)', () => {
      const draftData = { ...validHBLData, shipper: '' };
      const result = HBLCreateSchema.safeParse(draftData);
      // Empty fields are now allowed for draft mode
      expect(result.success).toBe(true);
    });

    it('should allow shipper exceeding 200 characters', () => {
      const invalidData = { ...validHBLData, shipper: 'A'.repeat(201) };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
    });

    it('should allow empty consignee (draft mode)', () => {
      const draftData = { ...validHBLData, consignee: '' };
      const result = HBLCreateSchema.safeParse(draftData);
      // Empty fields are now allowed for draft mode
      expect(result.success).toBe(true);
    });

    it('should allow consignee exceeding 200 characters', () => {
      const invalidData = { ...validHBLData, consignee: 'A'.repeat(201) };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
    });

    it('should allow empty notify party (optional for draft mode)', () => {
      const draftData = { ...validHBLData, notifyParty: '' };
      const result = HBLCreateSchema.safeParse(draftData);
      // Notify party is optional for drafts, only required on approval
      expect(result.success).toBe(true);
    });


    it('should allow free-text ports (non UN/LOCODE)', () => {
      const data = { ...validHBLData, pol: 'PHU HUU', pod: 'Los Angeles' };
      const result = HBLCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow ports exceeding 64 characters', () => {
      const invalidData = { ...validHBLData, pol: 'A'.repeat(65) };
      const result = HBLCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
    });

    it('should allow empty containers array (draft mode)', () => {
      const draftData = { ...validHBLData, containers: [] };
      const result = HBLCreateSchema.safeParse(draftData);
      // Empty containers array is allowed for draft mode
      expect(result.success).toBe(true);
    });

    it('should reject HBL with more than 1 container', () => {
      const dataWithMultipleContainers = {
        ...validHBLData,
        containers: [
          {
            containerNumber: 'MSCU6639871',
            containerTypeCode: '22G1',
            sealNumber: 'SEAL1234567',
          },
          {
            containerNumber: 'ABCD1234567',
            containerTypeCode: '40HC',
            sealNumber: 'SEAL9876543',
          },
        ],
      };

      const result = HBLCreateSchema.safeParse(dataWithMultipleContainers);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 1 container');
      }
    });

    it('should reject if any container in array is invalid', () => {
      const dataWithInvalidContainer = {
        ...validHBLData,
        containers: [
          {
            containerNumber: 'MSCU6639871',
            containerTypeCode: '22G1',
            sealNumber: 'SEAL1234567',
          },
          {
            containerNumber: 'INVALID',
            containerTypeCode: '40HC',
            sealNumber: 'SEAL123',
          },
        ],
      };

      const result = HBLCreateSchema.safeParse(dataWithInvalidContainer);
      expect(result.success).toBe(false);
    });
  });

  describe('HBLUpdateSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        vesselName: 'Updated Vessel',
        voyageNumber: 'UV999',
      };

      const result = HBLUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(partialData);
      }
    });

    it('should allow long strings in partial updates for MVP', () => {
      const invalidPartialData = { pol: 'A'.repeat(65) };
      const result = HBLUpdateSchema.safeParse(invalidPartialData);
      expect(result.success).toBe(true);
    });
  });

  describe('HBLApprovalSchema', () => {
    const validApprovalData = {
      code: 'HBL1234565',
      receivedAt: '2024-01-18T00:00:00.000Z',
      mbl: 'MBL-001',
      eta: '2024-01-20T00:00:00.000Z',
      document: { id: 'doc-1', name: 'DOC-1234567.pdf', mimeType: 'application/pdf' },
      issuerId: '123e4567-e89b-12d3-a456-426614174000',
      shipper: 'Pacific Exports Ltd',
      consignee: 'Harbor Imports LLC',
      notifyParty: 'Harbor Imports LLC - LA Branch',
      vesselName: 'MSC FORTUNE',
      voyageNumber: 'V123',
      pol: 'VNSGN',
      pod: 'USNYC',
      containers: [
        {
          containerNumber: 'MSCU6639870',
          containerTypeCode: '40HC',
          sealNumber: 'SEAL123',
        },
      ],
    };

    it('should require all mandatory fields for approval', () => {
      const result = HBLApprovalSchema.safeParse(validApprovalData);
      expect(result.success).toBe(true);
    });

    it('should allow approval without notifyParty (optional field)', () => {
      const dataWithoutNotifyParty = {
        ...validApprovalData,
        notifyParty: '',
      };

      const result = HBLApprovalSchema.safeParse(dataWithoutNotifyParty);
      expect(result.success).toBe(true);
    });

    it('should allow approval without shipper, POL, and POD', () => {
      const dataWithoutOptionalFields = {
        ...validApprovalData,
        shipper: '',
        pol: '',
        pod: '',
      };

      const result = HBLApprovalSchema.safeParse(dataWithoutOptionalFields);
      expect(result.success).toBe(true);
    });

    it('should reject approval without vesselName', () => {
      const dataWithoutVessel = {
        ...validApprovalData,
        vesselName: '',
      };

      const result = HBLApprovalSchema.safeParse(dataWithoutVessel);
      expect(result.success).toBe(false);
    });

    it('should reject approval without voyageNumber', () => {
      const dataWithoutVoyage = {
        ...validApprovalData,
        voyageNumber: '',
      };

      const result = HBLApprovalSchema.safeParse(dataWithoutVoyage);
      expect(result.success).toBe(false);
    });

    it('should reject approval without container seal number', () => {
      const dataWithoutSeal = {
        ...validApprovalData,
        containers: [
          {
            containerNumber: 'MSCU6639870',
            containerTypeCode: '40HC',
            sealNumber: '',
          },
        ],
      };

      const result = HBLApprovalSchema.safeParse(dataWithoutSeal);
      expect(result.success).toBe(false);
    });
  });

  describe('hblDefaultValues', () => {
    it('should have correct default values', () => {
      expect(hblDefaultValues).toMatchObject({
        code: '',
        mbl: '',
        eta: '',
        document: null,
        issuerId: '',
        shipper: '',
        consignee: '',
        notifyParty: '',
        vesselName: '',
        voyageNumber: '',
        pol: '',
        pod: '',
        containers: [
          {
            containerId: null,
            containerNumber: '',
            containerTypeCode: null,
            sealNumber: '',
          },
        ],
      });
      expect(hblDefaultValues.receivedAt).toBeDefined();
      expect(typeof hblDefaultValues.receivedAt).toBe('string');
    });
  });
});
