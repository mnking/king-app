import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, userEvent, waitFor, within } from '@/test/utils';
import { CargoPackageSelection } from '../components/CargoPackageSelection';
import type { CargoPackageSelectionItem } from '../types';

const fetchByStatus = vi.fn();
const getById = vi.fn();
const update = vi.fn();

vi.mock('@/services/apiCargoPackages', () => ({
  cargoPackagesApi: {
    fetchByStatus: (...args: unknown[]) => fetchByStatus(...args),
  },
}));

vi.mock('@/services/apiPackageTransactions', () => ({
  packageTransactionsApi: {
    getById: (...args: unknown[]) => getById(...args),
    update: (...args: unknown[]) => update(...args),
  },
}));

const baseAvailable: CargoPackageSelectionItem[] = [
  {
    id: 'pkg-1',
    packageNo: 'PKG-1',
    packageType: 'CTN',
    cargoDescription: 'Blue shirts',
    positionStatus: 'STORED',
    lineNo: 1,
    packingListId: 'pl-1',
    conditionStatus: 'NORMAL',
    regulatoryStatus: 'PASSED',
  },
  {
    id: 'pkg-2',
    packageNo: 'PKG-2',
    packageType: 'CTN',
    cargoDescription: 'Blue shirts',
    positionStatus: 'STORED',
    lineNo: 1,
    packingListId: 'pl-1',
    conditionStatus: 'PACKAGE_DAMAGED',
    regulatoryStatus: 'ON_HOLD',
  },
];

const basePickedPackages = [
  {
    id: 'pkg-3',
    packageNo: 'PKG-3',
    positionStatus: 'CHECKOUT',
    conditionStatus: 'NORMAL',
    regulatoryStatus: 'PASSED',
  },
];

describe('CargoPackageSelection', () => {
  let availableData: CargoPackageSelectionItem[];
  let pickedPackages: Array<{
    id: string;
    packageNo: string | null;
    positionStatus: string | null;
    conditionStatus?: string | null;
    regulatoryStatus?: string | null;
  }>;
  let availableTotal: number;

  beforeEach(() => {
    availableData = [...baseAvailable];
    pickedPackages = [...basePickedPackages];
    availableTotal = 5;

    fetchByStatus.mockReset();
    getById.mockReset();
    update.mockReset();

    fetchByStatus.mockImplementation(({ status }: { status: string }) => {
      const isStored = status === 'STORED';
      const data = isStored ? availableData : [];
      const total = isStored ? availableTotal : 0;
      return Promise.resolve({ results: data, total });
    });

    getById.mockResolvedValue({
      data: {
        id: 'pt-1',
        createdAt: '2025-12-13T10:00:00Z',
        updatedAt: '2025-12-13T10:00:00Z',
        code: 'PT-250328-0001',
        packages: pickedPackages,
        status: 'IN_PROGRESS',
        endedAt: null,
        businessProcessFlow: 'warehouseDelivery',
        partyName: 'ACME Logistics',
        partyType: 'CONSIGNEE',
        packingListId: 'pl-1',
      },
    });

    update.mockResolvedValue({
      data: {
        id: 'pt-1',
        createdAt: '2025-12-13T10:00:00Z',
        updatedAt: '2025-12-13T10:05:00Z',
        code: 'PT-250328-0001',
        packages: pickedPackages,
        status: 'IN_PROGRESS',
        endedAt: null,
        businessProcessFlow: 'warehouseDelivery',
        partyName: 'ACME Logistics',
        partyType: 'CONSIGNEE',
        packingListId: 'pl-1',
      },
    });
  });

  it('updates selection summary with API totals when toggling packages', async () => {
    const onSelectionChange = vi.fn();

    render(
      <CargoPackageSelection
        packingListId="pl-1"
        transactionId="pt-1"
        plNumber="PL-2024-01"
        hblNumber="HBL-1"
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({
        selectedCount: 0,
        totalPackages: 6,
      });
    });

    const checkbox = await screen.findByLabelText(/Select package PKG-1/i);
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        selectedCount: 1,
        totalPackages: 6,
      });
    });

    expect(screen.getByText(/Package Damaged/i)).toBeInTheDocument();
  });

  it('shows picked package regulatory and condition statuses', async () => {
    render(
      <CargoPackageSelection
        packingListId="pl-1"
        transactionId="pt-1"
        plNumber="PL-2024-01"
      />,
    );

    const pickedTab = screen.getByRole('button', { name: /picked packages/i });
    await userEvent.click(pickedTab);

    const pickedCard = await screen.findByTestId('picked-package-pkg-3');
    expect(within(pickedCard).getByText('Checkout')).toBeInTheDocument();
    expect(within(pickedCard).getByText('Normal')).toBeInTheDocument();
    expect(within(pickedCard).getByText('Passed')).toBeInTheDocument();
  });

  it('submits checkout, refetches, resets selection, and notifies success', async () => {
    const onSelectionChange = vi.fn();
    const onSubmitSuccess = vi.fn();

    update.mockImplementation(async (_id: string, { packageIds }: { packageIds: string[] }) => {
      const picked = availableData.find((item) => item.id === packageIds[0]);
      if (!picked) return;
      availableData = availableData.slice(1);
      availableTotal -= 1;
      pickedPackages = [
        ...pickedPackages,
        {
          id: packageIds[0],
          packageNo: picked.packageNo ?? null,
          positionStatus: 'CHECKOUT',
        },
      ];

      getById.mockResolvedValue({
        data: {
          id: 'pt-1',
          createdAt: '2025-12-13T10:00:00Z',
          updatedAt: '2025-12-13T10:05:00Z',
          code: 'PT-250328-0001',
          packages: pickedPackages,
          status: 'IN_PROGRESS',
          endedAt: null,
          businessProcessFlow: 'warehouseDelivery',
          partyName: 'ACME Logistics',
          partyType: 'CONSIGNEE',
          packingListId: 'pl-1',
        },
      });
    });

    render(
      <CargoPackageSelection
        packingListId="pl-1"
        transactionId="pt-1"
        plNumber="PL-2024-01"
        onSelectionChange={onSelectionChange}
        onSubmitSuccess={onSubmitSuccess}
      />,
    );

    const checkbox = await screen.findByLabelText(/Select package PKG-1/i);
    await userEvent.click(checkbox);

    const submit = screen.getByRole('button', { name: /^Pick$/i });
    await userEvent.click(submit);

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('pt-1', { packageIds: ['pkg-1'] });

    await waitFor(() => {
      expect(onSubmitSuccess).toHaveBeenCalledWith({
        selectedPackageIds: ['pkg-1'],
        totalPackages: 6,
      });
    });

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        selectedCount: 0,
        totalPackages: 6,
      });
    });

    await waitFor(() => {
      expect(fetchByStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('surfaces checkout errors and keeps selection', async () => {
    update.mockRejectedValueOnce(new Error('boom'));

    render(
      <CargoPackageSelection
        packingListId="pl-1"
        transactionId="pt-1"
        plNumber="PL-2024-01"
      />,
    );

    const checkbox = await screen.findByLabelText(/Select package PKG-1/i);
    await userEvent.click(checkbox);

    const submit = screen.getByRole('button', { name: /^Pick$/i });
    await userEvent.click(submit);

    await screen.findByText(/boom/i);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it('shows fetch errors and retries on demand', async () => {
    fetchByStatus
      .mockImplementationOnce(() => Promise.reject(new Error('load failed')))
      .mockImplementationOnce(() => Promise.resolve({ results: availableData, total: availableTotal }));
    getById
      .mockImplementationOnce(() => Promise.reject(new Error('load failed')))
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            id: 'pt-1',
            createdAt: '2025-12-13T10:00:00Z',
            updatedAt: '2025-12-13T10:00:00Z',
            code: 'PT-250328-0001',
            packages: pickedPackages,
            status: 'IN_PROGRESS',
            endedAt: null,
            businessProcessFlow: 'warehouseDelivery',
            partyName: 'ACME Logistics',
            partyType: 'CONSIGNEE',
            packingListId: 'pl-1',
          },
        }),
      );

    render(
      <CargoPackageSelection
        packingListId="pl-1"
        transactionId="pt-1"
        plNumber="PL-2024-01"
      />,
    );

    await screen.findByText(/Failed to load cargo packages/i);
    await screen.findAllByText(/load failed/i);

    const retry = screen.getByRole('button', { name: /Retry/i });
    await userEvent.click(retry);

    await waitFor(() => {
      expect(fetchByStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    await screen.findByLabelText(/Select package PKG-1/i);
  });
});
