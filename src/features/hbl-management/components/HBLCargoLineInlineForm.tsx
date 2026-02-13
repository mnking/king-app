import React from 'react';
import type { CargoTypeCode, HblPackingListLineFormValues } from '../types';

interface HBLCargoLineInlineFormProps {
  lineNumber: number;
  line: HblPackingListLineFormValues;
  onChange?: (
    field: keyof HblPackingListLineFormValues,
    value: HblPackingListLineFormValues[keyof HblPackingListLineFormValues],
  ) => void;
  readOnly?: boolean;
}

const PACKAGE_TYPE_OPTIONS: Array<{ value: CargoTypeCode; label: string }> = [
  { value: 'GP', label: 'General (GP)' },
  { value: 'DG', label: 'Dangerous (DG)' },
  { value: 'BN', label: 'Bundle (BN)' },
  { value: 'OD', label: 'OOG Dangerous (OD)' },
  { value: 'WD', label: 'OOG Overweight Dangerous (WD)' },
  { value: 'DR', label: 'Reefer Dangerous (DR)' },
  { value: 'UD', label: 'Unitized Cargo Dangerous (UD)' },
  { value: 'MT', label: 'Empty (MT)' },
  { value: 'ED', label: 'Empty Dangerous (ED)' },
  { value: 'EF', label: 'Empty Flatrack (EF)' },
  { value: 'ER', label: 'Empty Reefer (ER)' },
  { value: 'ET', label: 'Empty Tank (ET)' },
  { value: 'RF', label: 'Reefer (RF)' },
  { value: 'RO', label: 'Reefer Overweight (RO)' },
  { value: 'OG', label: 'Out of Gauge (OG)' },
  { value: 'OO', label: 'Out of Gauge Overweight (OO)' },
  { value: 'OW', label: 'Overweight (OW)' },
  { value: 'UC', label: 'Unitized Cargo (UC)' },
];

const Label: React.FC<{ label: string; required?: boolean }> = ({
  label,
  required = false,
}) => (
  <label className="mb-1 block text-xs font-medium tracking-wide text-gray-600 dark:text-gray-300">
    {label}
    {required && <span className="text-red-500"> *</span>}
  </label>
);

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-75 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export const HBLCargoLineInlineForm: React.FC<HBLCargoLineInlineFormProps> = ({
  line,
  onChange,
  readOnly = false,
  lineNumber,
}) => {
  const handleNumberChange =
    (field: keyof HblPackingListLineFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly || !onChange) return;
      const value = event.target.value;
      if (value === '') {
        onChange(field, null);
        return;
      }
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        return;
      }
      let normalizedValue: number;
      if (field === 'numberOfPackages') {
        normalizedValue = Math.max(1, Math.round(parsed));
      } else {
        normalizedValue = parsed < 0 ? 0 : parsed;
      }
      onChange(field, normalizedValue);
    };

  const handleTextChange =
    (field: keyof HblPackingListLineFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (readOnly || !onChange) return;
      onChange(field, event.target.value);
    };

  const handleSelectChange =
    (field: keyof HblPackingListLineFormValues) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (readOnly || !onChange) return;
      const value = event.target.value || null;
      onChange(field, value as HblPackingListLineFormValues[typeof field]);
    };

  const isImdgRequired = line.packageTypeCode === 'DG';

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
      <div className="mb-4 text-sm font-semibold text-blue-900 dark:text-blue-100">
        # {lineNumber}
      </div>

      <div className="space-y-4">
        <div>
          <Label label="Commodity Description" required />
          <textarea
            rows={2}
            placeholder="Describe the commodity, contents, or notes"
            value={line.commodityDescription ?? ''}
            onChange={handleTextChange('commodityDescription')}
            disabled={readOnly}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label label="Package Count" required />
            <input
              type="number"
              min={1}
              step={1}
              placeholder="0"
              value={line.numberOfPackages ?? ''}
              onChange={handleNumberChange('numberOfPackages')}
              disabled={readOnly}
              className={inputClass}
            />
          </div>

          <div>
            <Label label="Package Type Code" required />
            <select
              className={inputClass}
              value={line.packageTypeCode ?? ''}
              onChange={handleSelectChange('packageTypeCode')}
              disabled={readOnly}
            >
              <option value="">Select package type</option>
              {PACKAGE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label label="Cargo Quantity" required />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={line.quantity ?? ''}
              onChange={handleNumberChange('quantity')}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
          <div>
            <Label label="Unit of Measure" required />
            <input
              value={line.unitOfMeasure ?? ''}
              onChange={handleTextChange('unitOfMeasure')}
              disabled={readOnly}
              placeholder="e.g., CTN, PCS"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label label="Gross Weight (kg)" required />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={line.grossWeightKg ?? ''}
              onChange={handleNumberChange('grossWeightKg')}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
          <div>
            <Label label="Volume (m³)" required />
            <input
              type="number"
              min={0}
              step="0.001"
              placeholder="0.000"
              value={line.volumeM3 ?? ''}
              onChange={handleNumberChange('volumeM3')}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
          <div>
            <Label label="IMDG Class" required={isImdgRequired} />
            <input
              value={line.imdg ?? ''}
              onChange={handleTextChange('imdg')}
              disabled={readOnly}
              placeholder="Enter IMDG class"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <div>
            <Label label="Shipmarks" />
            <textarea
              rows={2}
              placeholder="Enter shipmarks"
              value={line.shipmarks ?? ''}
              onChange={handleTextChange('shipmarks')}
              disabled={readOnly}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HBLCargoLineInlineForm;
