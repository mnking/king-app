import type { Direction, PrepayDeclaration } from '../types';

const RATE_TABLE = {
  cargoHandling: 500000,
  cargoStorePerDay: 90000,
};

export type PrepayLineItem = {
  key: string;
  label: string;
  amount: number;
};

export const getCargoHandlingLabel = (direction: Direction) =>
  direction === 'IMPORT'
    ? 'Cargo handling (Import)'
    : 'Cargo handling (Export)';

export const calculatePrepayLineItems = (
  declaration: PrepayDeclaration,
  direction: Direction,
): PrepayLineItem[] => {
  const items: PrepayLineItem[] = [
    {
      key: 'cargoHandling',
      label: getCargoHandlingLabel(direction),
      amount: RATE_TABLE.cargoHandling,
    },
  ];

  if (declaration.cargoStore.enabled) {
    const days = Math.max(0, declaration.cargoStore.days || 0);
    items.push({
      key: 'cargoStore',
      label: `Cargo store (${days} day${days === 1 ? '' : 's'})`,
      amount: days * RATE_TABLE.cargoStorePerDay,
    });
  }

  return items;
};

export const calculatePrepayAmount = (
  declaration: PrepayDeclaration,
  direction: Direction,
): number =>
  calculatePrepayLineItems(declaration, direction).reduce(
    (sum, item) => sum + item.amount,
    0,
  );
