import { describe, it, expect } from 'vitest';
import { isDocumentStatusTransitionDisabled } from '../../helpers/document-status.utils';

describe('isDocumentStatusTransitionDisabled', () => {
  it('allows transitions when current status is null/unknown', () => {
    expect(isDocumentStatusTransitionDisabled(null, 'CREATED')).toBe(false);
    expect(isDocumentStatusTransitionDisabled(null, 'AMENDED')).toBe(false);
    expect(isDocumentStatusTransitionDisabled(null, 'APPROVED')).toBe(false);
  });

  it('allows transitions from CREATED to any status', () => {
    expect(isDocumentStatusTransitionDisabled('CREATED', 'CREATED')).toBe(false);
    expect(isDocumentStatusTransitionDisabled('CREATED', 'AMENDED')).toBe(false);
    expect(isDocumentStatusTransitionDisabled('CREATED', 'APPROVED')).toBe(false);
  });

  it('blocks AMENDED → CREATED but allows other forward moves', () => {
    expect(isDocumentStatusTransitionDisabled('AMENDED', 'CREATED')).toBe(true);
    expect(isDocumentStatusTransitionDisabled('AMENDED', 'AMENDED')).toBe(false);
    expect(isDocumentStatusTransitionDisabled('AMENDED', 'APPROVED')).toBe(false);
  });

  it('blocks APPROVED → CREATED/AMENDED but keeps APPROVED enabled', () => {
    expect(isDocumentStatusTransitionDisabled('APPROVED', 'CREATED')).toBe(true);
    expect(isDocumentStatusTransitionDisabled('APPROVED', 'AMENDED')).toBe(true);
    expect(isDocumentStatusTransitionDisabled('APPROVED', 'APPROVED')).toBe(false);
  });
});
