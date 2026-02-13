import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CargoPackageStuffing } from '../components/CargoPackageStuffing';

vi.mock('@/services/apiPackageTransactions', () => ({
  packageTransactionsApi: { getById: vi.fn() },
}));

vi.mock('@/services/apiCargoPackages', () => ({
  cargoPackagesApi: { getAll: vi.fn() },
}));

describe('CargoPackageStuffing', () => {
  it('shows error state when packageTransactionId is missing', () => {
    render(<CargoPackageStuffing />);
    expect(screen.getByText(/package transaction is required/i)).toBeInTheDocument();
  });
});
