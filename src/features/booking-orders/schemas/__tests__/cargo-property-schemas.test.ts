import { describe, it, expect } from 'vitest';
import { ContainerFormSchema } from '../cargo-property-schemas';
import { CUSTOMS_STATUS, CARGO_RELEASE_STATUS } from '@/shared/constants/container-status';

const VALID_CONTAINER_NO = 'MSCU6639870';

const baseContainer = {
  containerId: '11111111-1111-1111-1111-111111111111',
  containerNo: VALID_CONTAINER_NO,
  isPriority: false,
  customsStatus: CUSTOMS_STATUS.NOT_REGISTERED,
  cargoReleaseStatus: CARGO_RELEASE_STATUS.NOT_REQUESTED,
  sealNumber: 'SEAL123',
  yardFreeFrom: null,
  yardFreeTo: '2025-10-05',
  extractTo: '2025-10-07',
  hbls: [],
};

describe('ContainerFormSchema cargo classification validation', () => {
  it('requires DG metadata when cargoNature is DG', () => {
    const result = ContainerFormSchema.safeParse({
      ...baseContainer,
      cargoNature: 'DG',
      cargoProperties: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('Dangerous goods'))).toBe(true);
    }
  });

  it('requires flash point for IMO class 3 DG cargo', () => {
    const result = ContainerFormSchema.safeParse({
      ...baseContainer,
      cargoNature: 'DG',
      cargoProperties: {
        imoClass: '3',
        unNumber: 'UN 1203',
        dgPage: 'Vol.1',
        flashPoint: null,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('Flash point'))).toBe(true);
    }
  });

  it('requires OOG description when cargoNature is OOG', () => {
    const result = ContainerFormSchema.safeParse({
      ...baseContainer,
      cargoNature: 'OOG',
      cargoProperties: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('OOG description'))).toBe(true);
    }
  });

  it('passes when DG metadata is complete', () => {
    const result = ContainerFormSchema.safeParse({
      ...baseContainer,
      cargoNature: 'DG',
      cargoProperties: {
        imoClass: '2',
        unNumber: 'UN 1017',
        dgPage: 'Vol.2',
        flashPoint: null,
      },
    });

    expect(result.success).toBe(true);
  });
});
