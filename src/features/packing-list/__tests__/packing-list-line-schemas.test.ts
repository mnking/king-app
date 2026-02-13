import { PackingListLineFormSchema } from '../schemas';

describe('PackingListLineFormSchema', () => {
  it('requires IMDG when package type is DG', () => {
    const result = PackingListLineFormSchema.safeParse({
      commodityDescription: 'Electronics',
      unitOfMeasure: 'CTN',
      packageTypeCode: 'DG',
      quantity: 1,
      numberOfPackages: 1,
      grossWeightKg: 10,
      volumeM3: 1,
      shipmarks: 'SM-1',
      imdg: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/imdg is required/i);
    }
  });

  it('does not require IMDG when package type is not DG', () => {
    const result = PackingListLineFormSchema.safeParse({
      commodityDescription: 'Electronics',
      unitOfMeasure: 'CTN',
      packageTypeCode: 'GP',
      quantity: 1,
      numberOfPackages: 1,
      grossWeightKg: 10,
      volumeM3: 1,
      shipmarks: 'SM-1',
      imdg: null,
    });

    expect(result.success).toBe(true);
  });

  it('allows commodity description exceeding 1024 characters', () => {
    const result = PackingListLineFormSchema.safeParse({
      commodityDescription: 'C'.repeat(1400),
      unitOfMeasure: 'CTN',
      packageTypeCode: 'GP',
      quantity: 1,
      numberOfPackages: 1,
      grossWeightKg: 10,
      volumeM3: 1,
      shipmarks: 'SM-1',
      imdg: null,
    });

    expect(result.success).toBe(true);
  });

  it('allows shipmarks exceeding 1024 characters', () => {
    const result = PackingListLineFormSchema.safeParse({
      commodityDescription: 'Electronics',
      unitOfMeasure: 'CTN',
      packageTypeCode: 'GP',
      quantity: 1,
      numberOfPackages: 1,
      grossWeightKg: 10,
      volumeM3: 1,
      shipmarks: 'S'.repeat(1400),
      imdg: null,
    });

    expect(result.success).toBe(true);
  });
});
