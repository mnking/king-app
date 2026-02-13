import { packingListDefaultValues } from '../schemas';
import {
  validateDraft,
  validatePartial,
  validateApprove,
} from '../schemas/packing-list-schemas';

const sampleDocument = {
  id: 'file-123',
  name: 'sample.pdf',
  mimeType: 'application/pdf',
};

describe('Packing List validation', () => {
  it('fails draft validation when all non-upload fields are empty', () => {
    const result = validateDraft(packingListDefaultValues);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors?._root).toMatch(/enter at least one field/i);
  });

  it('passes draft validation when a non-upload field is provided', () => {
    const result = validateDraft({
      ...packingListDefaultValues,
      note: 'Electronics',
    });
    expect(result.valid).toBe(true);
    expect(result.data?.note).toBe('Electronics');
  });

  it('allows MBL exceeding 50 characters for MVP flexibility', () => {
    const result = validateDraft({
      ...packingListDefaultValues,
      mbl: `MBL-${'X'.repeat(80)}`,
    });

    expect(result.valid).toBe(true);
    expect(result.data?.mbl).toContain('MBL-');
  });

  it('enforces required fields for partial validation', () => {
    const result = validatePartial({
      ...packingListDefaultValues,
      note: 'Machinery',
    });
    expect(result.valid).toBe(false);
    expect(result.fieldErrors?.directionFlow).toBeDefined();
    expect(result.fieldErrors?.forwarderId).toBeDefined();
  });

  it('allows packing list number without official file', () => {
    const result = validatePartial({
      ...packingListDefaultValues,
      directionFlow: 'EXPORT',
      forwarderId: 'forwarder-1',
      cargoDescription: 'Industrial goods',
      cargoType: 'GENERAL',
      unit: 'carton',
      quantity: 10,
      packingListNumber: 'PL-001',
    });

    expect(result.valid).toBe(true);
    expect(result.data?.packingListNumber).toBe('PL-001');
  });

  it('passes partial validation when required fields are present', () => {
    const result = validatePartial({
      ...packingListDefaultValues,
      directionFlow: 'IMPORT',
      forwarderId: 'forwarder-1',
      note: 'Industrial goods',
      packingListNumber: null,
      officialPackingListFile: null,
    });

    expect(result.valid).toBe(true);
    expect(result.data?.forwarderId).toBe('forwarder-1');
  });

  it('enforces approval requirements for critical fields', () => {
    const result = validateApprove({
      ...packingListDefaultValues,
      directionFlow: 'IMPORT',
      forwarderId: 'forwarder-1',
      cargoDescription: 'Electronics',
      cargoType: 'GENERAL',
      unit: 'carton',
      quantity: 5,
      packingListNumber: 'PL-123',
      officialPackingListFile: sampleDocument,
      mbl: 'MBL-001',
      eta: '2025-02-01T00:00:00.000Z',
      shipmarks: 'SM-123',
      weight: 0,
      volume: null,
    });

    expect(result.valid).toBe(false);
    expect(result.fieldErrors?.weight).toMatch(/greater than 0/i);
    expect(result.fieldErrors?.volume).toMatch(/required/i);
  });

  it('passes approval validation when all constraints are met', () => {
    const result = validateApprove({
      ...packingListDefaultValues,
      directionFlow: 'IMPORT',
      forwarderId: 'forwarder-1',
      cargoDescription: 'Electronics',
      cargoType: 'GENERAL',
      unit: 'carton',
      quantity: 5,
      packingListNumber: 'PL-123',
      officialPackingListFile: sampleDocument,
      mbl: 'MBL-001',
      eta: '2025-02-01T00:00:00.000Z',
      shipmarks: 'SM-123',
      weight: 1000,
      volume: 12.5,
    });

    expect(result.valid).toBe(true);
    expect(result.data?.weight).toBe(1000);
  });
});
