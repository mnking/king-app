import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CfsCargoPackageDeliveryPage from '../components/CfsCargoPackageDeliveryPage';
import { useAuth } from '@/features/auth/useAuth';

const mockUsePackingListsByHblIds = vi.fn();
const mockUsePackingList = vi.fn();
const mockUsePackageTransactions = vi.fn();
const mockUsePackageTransaction = vi.fn();
const mockUseCreatePackageTransaction = vi.fn();
const mockUseDeliveryDestuffingPlans = vi.fn();
const mockUseBookingOrdersByIds = vi.fn();
const mockGetHBL = vi.fn();

vi.mock('@/features/packing-list/hooks', () => ({
  usePackingList: (...args: unknown[]) => mockUsePackingList(...args),
}));

vi.mock('../hooks/use-delivery-destuffing-plans', () => ({
  useDeliveryDestuffingPlans: (...args: unknown[]) =>
    mockUseDeliveryDestuffingPlans(...args),
}));

const mockUseBusinessFlowConfig = vi.fn();
vi.mock('../hooks/use-business-flow-config', () => ({
  useBusinessFlowConfig: (...args: unknown[]) => mockUseBusinessFlowConfig(...args),
}));

vi.mock('../hooks/use-booking-orders-by-ids', () => ({
  useBookingOrdersByIds: (...args: unknown[]) => mockUseBookingOrdersByIds(...args),
}));

vi.mock('../hooks/use-packing-lists-by-hbl-ids', () => ({
  usePackingListsByHblIds: (...args: unknown[]) =>
    mockUsePackingListsByHblIds(...args),
}));

vi.mock('../hooks/use-package-transactions', () => ({
  usePackageTransactions: (...args: unknown[]) => mockUsePackageTransactions(...args),
  usePackageTransaction: (...args: unknown[]) => mockUsePackageTransaction(...args),
  useCreatePackageTransaction: (...args: unknown[]) =>
    mockUseCreatePackageTransaction(...args),
}));

vi.mock('@/shared/features/cargo-package-select', () => ({
  CargoPackageSelect: () => <div>SELECT_STEP</div>,
}));
vi.mock('@/shared/features/cargo-package-check', () => ({
  CargoPackageCheck: () => <div>INSPECT_STEP</div>,
}));
vi.mock('@/shared/features/cargo-package-handover', () => ({
  CargoPackageHandover: () => <div>HANDOVER_STEP</div>,
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/apiForwarder', () => ({
  getHBL: (...args: unknown[]) => mockGetHBL(...args),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

const renderRoute = (initialEntries: string[] = ['/cfs-cargo-package-delivery']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/cfs-cargo-package-delivery"
          element={<CfsCargoPackageDeliveryPage />}
        />
      </Routes>
    </MemoryRouter>,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={createQueryClient()}>
          {children}
        </QueryClientProvider>
      ),
    },
  );

describe('CfsCargoPackageDeliveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    } as any);
  });

  it('picks a packing list then renders flow steps in API order', async () => {
    const user = userEvent.setup();

    mockUseDeliveryDestuffingPlans.mockReturnValue({
      data: [
        {
          id: 'plan-1',
          containers: [
            {
              hbls: [{ hblId: 'hbl-1' }],
              orderContainer: { orderId: 'order-1' },
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackingListsByHblIds.mockReturnValue({
      data: [
        {
          id: 'pl-1',
          packingListNumber: 'PL-001',
          note: null,
          status: 'APPROVED',
          workingStatus: 'IN_PROGRESS',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
          mbl: null,
          eta: null,
          ata: null,
          forwarderId: 'fwd-1',
          weight: null,
          volume: null,
          numberOfPackages: null,
          hblData: {
            id: 'hbl-1',
            hblCode: 'HBL-001',
            containerNumber: 'CONT-001',
            containerType: '22G1',
            sealNumber: 'SEAL-1',
            forwarderName: 'Forwarder A',
            vessel: 'Vessel A',
            voyage: 'V-001',
            consignee: 'Consignee A',
          },
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseBookingOrdersByIds.mockReturnValue({
      data: { 'order-1': 'BO-001' },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackingList.mockReturnValue({
      data: {
        id: 'pl-1',
        packingListNumber: 'PL-001',
        note: null,
        status: 'APPROVED',
        workingStatus: 'IN_PROGRESS',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
        mbl: null,
        eta: null,
        ata: null,
        forwarderId: 'fwd-1',
        weight: null,
        volume: null,
        numberOfPackages: null,
        workPackingListFile: null,
        workPackingListFileUrl: null,
        officialPackingListFile: null,
        officialPackingListFileUrl: null,
        hblData: {
          id: 'hbl-1',
          hblCode: 'HBL-001',
          containerNumber: 'CONT-001',
          containerType: '22G1',
          sealNumber: 'SEAL-1',
          forwarderName: 'Forwarder A',
          vessel: 'Vessel A',
          voyage: 'V-001',
          consignee: 'Consignee A',
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackageTransactions.mockReturnValue({
      data: {
        results: [
          {
            id: 'pt-1',
            createdAt: '2025-12-13T10:00:00Z',
            updatedAt: '2025-12-13T10:00:00Z',
            code: 'PT-250328-0001',
            packages: [],
            status: 'IN_PROGRESS',
            endedAt: null,
            businessProcessFlow: 'warehouseDelivery',
            partyName: 'ACME Logistics',
            partyType: 'CONSIGNEE',
            packingListId: 'pl-1',
          },
        ],
        total: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUsePackageTransaction.mockReturnValue({
      data: {
        id: 'pt-1',
        createdAt: '2025-12-13T10:00:00Z',
        updatedAt: '2025-12-13T10:00:00Z',
        code: 'PT-250328-0001',
        packages: [],
        status: 'IN_PROGRESS',
        endedAt: null,
        businessProcessFlow: 'warehouseDelivery',
        partyName: 'ACME Logistics',
        partyType: 'CONSIGNEE',
        packingListId: 'pl-1',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseCreatePackageTransaction.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseBusinessFlowConfig.mockReturnValue({
      data: {
        direction: 'import',
        steps: [
          { code: 'inspect', fromStatus: 'A', toStatus: 'B' },
          { code: 'select', fromStatus: 'B', toStatus: 'C' },
          { code: 'handover', fromStatus: 'C', toStatus: 'D' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderRoute();

    expect(screen.getByText(/Packing Lists/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /PL-001/i }));

    expect(
      screen.getByRole('button', { name: /Create Transaction/i }),
    ).toBeInTheDocument();

    if (!screen.queryByText('INSPECT_STEP')) {
      await user.click(screen.getByRole('button', { name: /PT-250328-0001/i }));
    }

    expect(await screen.findByText('INSPECT_STEP')).toBeInTheDocument();

    const stepButtons = screen.getAllByRole('button').filter((btn) => {
      const text = btn.textContent ?? '';
      return (
        text.includes('Inspect') || text.includes('Select') || text.includes('Handover')
      );
    });

    const inspectIndex = stepButtons.findIndex((btn) =>
      (btn.textContent ?? '').includes('Inspect'),
    );
    const selectIndex = stepButtons.findIndex((btn) =>
      (btn.textContent ?? '').includes('Select'),
    );
    const handoverIndex = stepButtons.findIndex((btn) =>
      (btn.textContent ?? '').includes('Handover'),
    );

    expect(inspectIndex).toBeGreaterThanOrEqual(0);
    expect(selectIndex).toBeGreaterThan(inspectIndex);
    expect(handoverIndex).toBeGreaterThan(selectIndex);

    await user.click(stepButtons[selectIndex]);
    expect(screen.getByText('SELECT_STEP')).toBeInTheDocument();
  });

  it('disables create transaction when missing write permission', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      can: vi.fn().mockReturnValue(false),
    } as any);

    mockUseDeliveryDestuffingPlans.mockReturnValue({
      data: [
        {
          id: 'plan-1',
          containers: [
            {
              hbls: [{ hblId: 'hbl-1' }],
              orderContainer: { orderId: 'order-1' },
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackingListsByHblIds.mockReturnValue({
      data: [
        {
          id: 'pl-1',
          packingListNumber: 'PL-001',
          note: null,
          status: 'APPROVED',
          workingStatus: 'IN_PROGRESS',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
          mbl: null,
          eta: null,
          ata: null,
          forwarderId: 'fwd-1',
          weight: null,
          volume: null,
          numberOfPackages: null,
          hblData: {
            id: 'hbl-1',
            hblCode: 'HBL-001',
            containerNumber: 'CONT-001',
            containerType: '22G1',
            sealNumber: 'SEAL-1',
            forwarderName: 'Forwarder A',
            vessel: 'Vessel A',
            voyage: 'V-001',
            consignee: 'Consignee A',
          },
        },
      ],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    mockUsePackingList.mockReturnValue({
      data: {
        id: 'pl-1',
        packingListNumber: 'PL-001',
        note: null,
        status: 'APPROVED',
        workingStatus: 'IN_PROGRESS',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
        mbl: null,
        eta: null,
        ata: null,
        forwarderId: 'fwd-1',
        weight: null,
        volume: null,
        numberOfPackages: null,
        workPackingListFile: null,
        workPackingListFileUrl: null,
        officialPackingListFile: null,
        officialPackingListFileUrl: null,
        hblData: {
          id: 'hbl-1',
          hblCode: 'HBL-001',
          containerNumber: 'CONT-001',
          containerType: '22G1',
          sealNumber: 'SEAL-1',
          forwarderName: 'Forwarder A',
          vessel: 'Vessel A',
          voyage: 'V-001',
          consignee: 'Consignee A',
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseBookingOrdersByIds.mockReturnValue({
      data: { 'order-1': 'BO-001' },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackageTransactions.mockReturnValue({
      data: {
        results: [],
        total: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUsePackageTransaction.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseCreatePackageTransaction.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseBusinessFlowConfig.mockReturnValue({
      data: {
        direction: 'import',
        steps: [
          { code: 'inspect', fromStatus: 'A', toStatus: 'B' },
          { code: 'select', fromStatus: 'B', toStatus: 'C' },
          { code: 'handover', fromStatus: 'C', toStatus: 'D' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderRoute();

    await user.click(await screen.findByRole('button', { name: /PL-001/i }));

    expect(
      screen.getByRole('button', { name: /Create Transaction/i }),
    ).toBeDisabled();
  });

  it('blocks create transaction when HBL destuff status is not DONE', async () => {
    const user = userEvent.setup();

    mockGetHBL.mockResolvedValue({
      data: { destuffStatus: 'IN_PROGRESS' },
    });

    mockUseDeliveryDestuffingPlans.mockReturnValue({
      data: [
        {
          id: 'plan-1',
          containers: [
            {
              hbls: [{ hblId: 'hbl-1' }],
              orderContainer: { orderId: 'order-1' },
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackingListsByHblIds.mockReturnValue({
      data: [
        {
          id: 'pl-1',
          packingListNumber: 'PL-001',
          note: null,
          status: 'APPROVED',
          workingStatus: 'IN_PROGRESS',
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
          mbl: null,
          eta: null,
          ata: null,
          forwarderId: 'fwd-1',
          weight: null,
          volume: null,
          numberOfPackages: null,
          hblData: {
            id: 'hbl-1',
            hblCode: 'HBL-001',
            containerNumber: 'CONT-001',
            containerType: '22G1',
            sealNumber: 'SEAL-1',
            forwarderName: 'Forwarder A',
            vessel: 'Vessel A',
            voyage: 'V-001',
            consignee: 'Consignee A',
          },
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseBookingOrdersByIds.mockReturnValue({
      data: { 'order-1': 'BO-001' },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackingList.mockReturnValue({
      data: {
        id: 'pl-1',
        packingListNumber: 'PL-001',
        note: null,
        status: 'APPROVED',
        workingStatus: 'IN_PROGRESS',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
        mbl: null,
        eta: null,
        ata: null,
        forwarderId: 'fwd-1',
        weight: null,
        volume: null,
        numberOfPackages: null,
        workPackingListFile: null,
        workPackingListFileUrl: null,
        officialPackingListFile: null,
        officialPackingListFileUrl: null,
        hblData: {
          id: 'hbl-1',
          hblCode: 'HBL-001',
          containerNumber: 'CONT-001',
          containerType: '22G1',
          sealNumber: 'SEAL-1',
          forwarderName: 'Forwarder A',
          vessel: 'Vessel A',
          voyage: 'V-001',
          consignee: 'Consignee A',
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUsePackageTransactions.mockReturnValue({
      data: {
        results: [],
        total: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUsePackageTransaction.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseCreatePackageTransaction.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseBusinessFlowConfig.mockReturnValue({
      data: {
        direction: 'import',
        steps: [
          { code: 'inspect', fromStatus: 'A', toStatus: 'B' },
          { code: 'select', fromStatus: 'B', toStatus: 'C' },
          { code: 'handover', fromStatus: 'C', toStatus: 'D' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderRoute();

    await user.click(await screen.findByRole('button', { name: /PL-001/i }));
    await user.click(screen.getByRole('button', { name: /Create Transaction/i }));

    await waitFor(() => {
      expect(mockGetHBL).toHaveBeenCalledWith('hbl-1');
    });

    expect(
      screen.queryByText(/Create a new warehouse delivery transaction/i),
    ).not.toBeInTheDocument();
  });
});
