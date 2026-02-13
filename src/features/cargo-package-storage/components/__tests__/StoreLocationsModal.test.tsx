import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoreLocationsModal, type SelectedLocation } from '../StoreLocationsModal';
import type { CargoPackageRecord } from '../../types';

vi.mock('@/shared/services/toast', () => ({
  toastAdapter: {
    confirm: vi.fn(),
  },
}));

vi.mock('@/features/zones-locations/hooks/use-zones-query', () => ({
  useZones: () => ({
    data: {
      results: [
        {
          id: 'zone-1',
          code: 'Z1',
          name: 'Zone 1',
          status: 'active',
          type: 'RBS',
          description: '',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
        },
        {
          id: 'zone-2',
          code: 'Z2',
          name: 'Zone 2',
          status: 'active',
          type: 'RBS',
          description: '',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
        },
      ],
      total: 2,
    },
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock('@/features/zones-locations/hooks/use-locations-query', () => ({
  useLocationsByZone: (zoneId: string) => ({
    data: zoneId
      ? {
          results: [
            {
              id: `loc-${zoneId}-1`,
              zoneId,
              zoneCode: zoneId === 'zone-1' ? 'Z1' : 'Z2',
              type: 'RBS' as const,
              rbsRow: 'A',
              rbsBay: '1',
              rbsSlot: '1',
              customLabel: null,
              locationCode: 'LOC1',
              absoluteCode: 'ABS-1',
              displayCode: 'LOC-1',
              status: 'active' as const,
              createdAt: '',
              updatedAt: '',
              createdBy: '',
              updatedBy: '',
            },
            {
              id: `loc-${zoneId}-2`,
              zoneId,
              zoneCode: zoneId === 'zone-1' ? 'Z1' : 'Z2',
              type: 'RBS' as const,
              rbsRow: 'A',
              rbsBay: '1',
              rbsSlot: '2',
              customLabel: null,
              locationCode: 'LOC2',
              absoluteCode: 'ABS-2',
              displayCode: 'LOC-2',
              status: 'active' as const,
              createdAt: '',
              updatedAt: '',
              createdBy: '',
              updatedBy: '',
            },
          ],
          total: 2,
        }
      : { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
  }),
}));

const basePackage: CargoPackageRecord = {
  id: 'pkg-1',
  packingListId: 'pl-1',
  packageNo: 'PKG-1',
};

describe('StoreLocationsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents submit without selection', async () => {
    const onSubmit = vi.fn();

    render(
      <StoreLocationsModal
        open
        packageRecords={[basePackage]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        initialSelection={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Store 1 package\(s\) to selected location/i,
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Select a location');
  });

  it('submits selected locations', async () => {
    const onSubmit = vi.fn();

    render(
      <StoreLocationsModal
        open
        packageRecords={[basePackage]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        initialSelection={[]}
      />,
    );

    const checkbox = await screen.findByLabelText(/Select LOC-1/i);
    fireEvent.click(checkbox);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Store 1 package\(s\) to selected location/i,
      }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const submitted: SelectedLocation[] = onSubmit.mock.calls[0][0];
    expect(submitted[0].id).toBe('loc-zone-1-1');
  });

  it('keeps only one selected location', async () => {
    render(
      <StoreLocationsModal
        open
        packageRecords={[basePackage]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        initialSelection={[]}
      />,
    );

    fireEvent.click(await screen.findByLabelText(/Select LOC-1/i));
    fireEvent.click(await screen.findByLabelText(/Select LOC-2/i));

    expect(screen.getByLabelText(/Select LOC-1/i)).not.toBeChecked();
    expect(screen.getByLabelText(/Select LOC-2/i)).toBeChecked();
    expect(screen.getAllByText('1 location selected').length).toBeGreaterThan(0);
  });

  it('keeps first location when initial selection has many items', async () => {
    const initialSelection: SelectedLocation[] = [
      {
        id: 'loc-zone-1-1',
        displayCode: 'LOC-1',
        absoluteCode: 'ABS-1',
        zoneCode: 'Z1',
        type: 'RBS',
        details: 'A • 1 • 1',
      },
      {
        id: 'loc-zone-1-2',
        displayCode: 'LOC-2',
        absoluteCode: 'ABS-2',
        zoneCode: 'Z1',
        type: 'RBS',
        details: 'A • 1 • 2',
      },
    ];

    render(
      <StoreLocationsModal
        open
        packageRecords={[basePackage]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        initialSelection={initialSelection}
      />,
    );

    expect(await screen.findByLabelText(/Select LOC-1/i)).toBeChecked();
    expect(screen.getByLabelText(/Select LOC-2/i)).not.toBeChecked();
    expect(screen.getByText('Selected location')).toBeInTheDocument();
    expect(screen.getByLabelText(/Remove LOC-1/i)).toBeInTheDocument();
  });

  it('clears selection when switching zones', async () => {
    const { toastAdapter } = await import('@/shared/services/toast');
    vi.mocked(toastAdapter.confirm).mockResolvedValue(true as unknown);

    render(
      <StoreLocationsModal
        open
        packageRecords={[basePackage]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        initialSelection={[]}
      />,
    );

    const checkbox = await screen.findByLabelText(/Select LOC-1/i);
    fireEvent.click(checkbox);

    const zoneSelect = screen.getByRole('combobox', { name: /Zone/i });
    fireEvent.change(zoneSelect, { target: { value: 'zone-2' } });

    await waitFor(() =>
      expect(screen.queryByText('Selected location', { selector: 'div' })).toBeNull(),
    );
  });
});
