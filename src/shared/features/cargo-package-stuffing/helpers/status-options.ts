import { CargoStatus, CustomsStatus } from '../types';

export const cargoStatusOptions = [
  { value: CargoStatus.Normal, label: 'Normal' },
  { value: CargoStatus.PackageDamaged, label: 'Pkg damaged' },
  { value: CargoStatus.CargoDamaged, label: 'Broken' },
];

export const customsStatusOptions = [
  { value: CustomsStatus.Uninspected, label: 'Uninspected' },
  { value: CustomsStatus.Passed, label: 'Passed' },
  { value: CustomsStatus.OnHold, label: 'On hold' },
];
