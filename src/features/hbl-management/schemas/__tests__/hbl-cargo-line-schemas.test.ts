import { describe, expect, it } from 'vitest';
import { HblCargoLineFormSchema } from '../hbl-cargo-line-schemas';

describe('HblCargoLineFormSchema', () => {
  const validLine = {
    commodityDescription: 'Electronic accessories',
    unitOfMeasure: 'CTN',
    packageTypeCode: 'GP' as const,
    quantity: 10,
    numberOfPackages: 10,
    grossWeightKg: 1200,
    volumeM3: 4.5,
    shipmarks: 'MARK-001',
    imdg: null,
  };

  it('should allow shipmarks exceeding 1024 characters', () => {
    const result = HblCargoLineFormSchema.safeParse({
      ...validLine,
      shipmarks: 'S'.repeat(1500),
    });

    expect(result.success).toBe(true);
  });

  it('should allow commodity description exceeding 1024 characters', () => {
    const result = HblCargoLineFormSchema.safeParse({
      ...validLine,
      commodityDescription: 'C'.repeat(1025),
    });

    expect(result.success).toBe(true);
  });

  it('should still enforce unit of measure length', () => {
    const result = HblCargoLineFormSchema.safeParse({
      ...validLine,
      unitOfMeasure: 'U'.repeat(33),
    });

    expect(result.success).toBe(false);
  });
});
