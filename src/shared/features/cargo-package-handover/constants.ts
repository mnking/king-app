import { CargoStatus, CustomsStatus } from './types';

export const cargoStatusOptions: Array<{ value: CargoStatus; label: string; helper?: string }>
  = [
    { value: CargoStatus.Normal, label: 'Normal' },
    { value: CargoStatus.PackageDamaged, label: 'Pkg damaged' },
    { value: CargoStatus.CargoDamaged, label: 'Broken' },
  ];

export const customsStatusOptions: Array<{ value: CustomsStatus; label: string; helper?: string }>
  = [
    { value: CustomsStatus.Uninspected, label: 'Uninspected' },
    { value: CustomsStatus.Passed, label: 'Passed' },
    { value: CustomsStatus.OnHold, label: 'On hold' },
  ];

export const workingStatusCopy: Record<string, string> = {
  'in-progress': 'In progress',
  done: 'Done',
};
