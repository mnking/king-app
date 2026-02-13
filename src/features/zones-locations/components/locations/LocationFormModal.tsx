import React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Info } from 'lucide-react';
import {
  LocationCreateSchema,
  LocationUpdateSchema,
  LocationCreateForm,
  LocationUpdateForm,
  locationFormDefaults,
  locationStatusOptions,
} from '@/features/zones-locations/schemas';
import type {
  Location,
  Zone,
  LocationType,
  LocationStatus,
  LocationLayoutRequest,
} from '@/features/zones-locations/types';
import { FormField, FormInput, FormSingleSelect } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import { toastAdapter } from '@/shared/services';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  location?: Location | null;
  zone?: Zone | null;
  zones: Zone[];
  onSave: (
    data: LocationCreateForm | (LocationUpdateForm & { id: string }),
  ) => Promise<void>;
  onSaveLayout?: (
    zoneId: string,
    payload: LocationLayoutRequest,
  ) => Promise<void>;
  onGenerateCodePreview?: (
    zoneCode: string,
    type: LocationType,
    details: {
      rbsRow?: string;
      rbsBay?: string;
      rbsSlot?: string;
      customLabel?: string;
    },
  ) => { displayCode: string };
}

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  location,
  zone,
  zones,
  onSave,
  onSaveLayout,
  onGenerateCodePreview,
}) => {
  const isEdit = mode === 'edit';
  const schema = isEdit ? LocationUpdateSchema : LocationCreateSchema;
  const [creationMode, setCreationMode] = React.useState<'single' | 'layout'>(
    'single',
  );
  const [layoutRows, setLayoutRows] = React.useState<
    Array<{ bays: Array<{ slotsCount: number }> }>
  >([{ bays: [{ slotsCount: 1 }] }]);
  const [layoutError, setLayoutError] = React.useState<string | null>(null);

  const getDefaultValues = React.useCallback(() => {
    if (isEdit && location) {
      const locationType = (location.zoneType ||
        location.type ||
        zone?.type ||
        'RBS') as LocationType;
      return {
        zoneId: location.zoneId,
        type: locationType,
        status: location.status,
        ...(locationType === 'RBS' && {
          rbsRow: location.rbsRow || '',
          rbsBay: location.rbsBay || '',
          rbsSlot: location.rbsSlot || '',
        }),
        ...(locationType === 'CUSTOM' && {
          customLabel:
            location.customLabel ||
            location.locationCode ||
            location.displayCode ||
            '',
        }),
      };
    }

    const baseDefaults =
      zone?.type === 'CUSTOM'
        ? locationFormDefaults.CUSTOM
        : locationFormDefaults.RBS;

    return {
      zoneId: zone?.id || '',
      ...baseDefaults,
    };
  }, [isEdit, location, zone?.id, zone?.type]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LocationCreateForm | LocationUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(),
  });

  // Watch form values for dynamic updates
  const watchedValues = useWatch({ control });
  const selectedZone =
    zones.find((z) => z.id === watchedValues.zoneId) ||
    zones.find((z) => z.id === location?.zoneId) ||
    zone;
  const isCustomZone = selectedZone?.type === 'CUSTOM';
  const locationType =
    (watchedValues.type as LocationType | undefined) ||
    (isEdit
      ? ((location?.zoneType || location?.type) as LocationType | undefined)
      : undefined) ||
    (selectedZone?.type as LocationType | undefined) ||
    'RBS';
  const isLockedLocation = isEdit && location?.status === 'locked';
  const isInactiveLocation = isEdit && location?.status === 'inactive';
  const currentStatus =
    (watchedValues.status as LocationStatus | undefined) ||
    (location?.status as LocationStatus | undefined) ||
    'active';
  const disableCodeEditing =
    isEdit && (currentStatus === 'locked' || currentStatus === 'active');

  // Reset form when modal opens/closes or mode/location changes
  React.useEffect(() => {
    if (isOpen) {
      const defaultValues = getDefaultValues();
      reset(defaultValues);
      setLayoutRows([{ bays: [{ slotsCount: 1 }] }]);
      setLayoutError(null);
    }
  }, [isOpen, isEdit, location, zone, reset, getDefaultValues, selectedZone?.type]);

  // Determine creation mode automatically based on context
  React.useEffect(() => {
    setCreationMode('single');
    setLayoutError(null);
  }, [isCustomZone, isEdit]);

  // Keep type in sync with selected zone type or layout mode
  React.useEffect(() => {
    if (!selectedZone) return;

    if (selectedZone.type === 'CUSTOM') {
      if (locationType !== 'CUSTOM') {
        setValue('type', 'CUSTOM');
      }
      setValue('rbsRow', undefined);
      setValue('rbsBay', undefined);
      setValue('rbsSlot', undefined);
      if (!isEdit && !watchedValues.customLabel) {
        setValue('customLabel', locationFormDefaults.CUSTOM.customLabel);
      }
    } else if (!isEdit && (creationMode === 'layout' || locationType !== 'RBS')) {
      setValue('type', 'RBS');
      setValue('customLabel', undefined);
      setValue('rbsRow', locationFormDefaults.RBS.rbsRow);
      setValue('rbsBay', locationFormDefaults.RBS.rbsBay);
      setValue('rbsSlot', locationFormDefaults.RBS.rbsSlot);
    }
  }, [
    creationMode,
    isEdit,
    locationType,
    selectedZone,
    setValue,
    watchedValues.customLabel,
  ]);

  // Layout helpers
  const handleAddRow = () => {
    setLayoutRows((prev) => [...prev, { bays: [{ slotsCount: 1 }] }]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    setLayoutRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  const handleAddBay = (rowIndex: number) => {
    setLayoutRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? { bays: [...row.bays, { slotsCount: 1 }] }
          : row,
      ),
    );
  };

  const handleRemoveBay = (rowIndex: number, bayIndex: number) => {
    setLayoutRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? { bays: row.bays.filter((_, bIdx) => bIdx !== bayIndex) }
          : row,
      ),
    );
  };

  const handleSlotCountChange = (
    rowIndex: number,
    bayIndex: number,
    value: number,
  ) => {
    setLayoutRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? {
            bays: row.bays.map((bay, bIdx) =>
              bIdx === bayIndex
                ? { ...bay, slotsCount: Math.max(0, value) }
                : bay,
            ),
          }
          : row,
      ),
    );
  };

  const totalSlots = React.useMemo(
    () =>
      layoutRows.reduce(
        (total, row) =>
          total +
          row.bays.reduce((rowTotal, bay) => rowTotal + (bay.slotsCount || 0), 0),
        0,
      ),
    [layoutRows],
  );

  const formatIndex = (value: number) => String(value).padStart(2, '0');

  const layoutPreviewCodes = React.useMemo(() => {
    if (!selectedZone) return [];
    const codes: string[] = [];
    layoutRows.forEach((row, rowIndex) => {
      const rbsRow = `R${formatIndex(rowIndex + 1)}`;
      row.bays.forEach((bay, bayIndex) => {
        const rbsBay = `B${formatIndex(bayIndex + 1)}`;
        for (let slot = 0; slot < bay.slotsCount; slot++) {
          const rbsSlot = `S${formatIndex(slot + 1)}`;
          codes.push(`${selectedZone.code}R-${rbsRow}${rbsBay}${rbsSlot}`);
        }
      });
    });
    return codes;
  }, [layoutRows, selectedZone]);

  const layoutValidationError = React.useMemo(() => {
    if (!selectedZone) return 'Select a zone first.';
    if (layoutRows.length === 0) return 'Add at least one row.';
    const hasEmptyBay = layoutRows.some((row) => row.bays.length === 0);
    if (hasEmptyBay) return 'Each row needs at least one bay.';
    const hasInvalidSlot = layoutRows.some((row) =>
      row.bays.some((bay) => !bay.slotsCount || bay.slotsCount < 1),
    );
    if (hasInvalidSlot) return 'Slot count must be 1 or greater.';
    if (totalSlots === 0) return 'Add at least one slot.';
    return null;
  }, [layoutRows, selectedZone, totalSlots]);

  const handleLayoutSubmit = async () => {
    if (creationMode !== 'layout') return;
    setLayoutError(null);

    if (layoutValidationError) {
      setLayoutError(layoutValidationError);
      return;
    }

    if (!selectedZone || !onSaveLayout) return;

    const payload: LocationLayoutRequest = {
      layout: {
        rows: layoutRows.map((row) => ({
          bays: row.bays.map((bay) => ({
            slotsCount: Number(bay.slotsCount) || 0,
          })),
        })),
      },
    };

    try {
      await onSaveLayout(selectedZone.id, payload);
      reset();
      setLayoutRows([{ bays: [{ slotsCount: 1 }] }]);
      onClose();
    } catch (error) {
      console.error('Failed to create layout:', error);
      setLayoutError('Failed to create layout. Please try again.');
    }
  };

  // Generate code preview
  const getCodePreview = () => {
    if (!selectedZone || !onGenerateCodePreview) return '';

    try {
      if (locationType === 'RBS') {
        const { rbsRow, rbsBay, rbsSlot } = watchedValues;
        if (rbsRow && rbsBay && rbsSlot) {
          return onGenerateCodePreview(selectedZone.code, 'RBS', {
            rbsRow,
            rbsBay,
            rbsSlot,
          }).displayCode;
        }
      } else if (locationType === 'CUSTOM') {
        const { customLabel } = watchedValues;
        if (customLabel) {
          return onGenerateCodePreview(selectedZone.code, 'CUSTOM', {
            customLabel,
          }).displayCode;
        }
      }
    } catch (error) {
      console.error('Error generating code preview:', error);
    }

    return '';
  };

  const codePreview = getCodePreview();

  const stripRbsPrefix = React.useCallback(
    (value: string | undefined, prefix: 'R' | 'B' | 'S') => {
      if (!value) return '';
      const pattern = new RegExp(`^${prefix}`, 'i');
      return value.replace(pattern, '');
    },
    [],
  );

  const normalizeRbsValue = React.useCallback(
    (raw: string, prefix: 'R' | 'B' | 'S') => {
      const digits = raw.replace(/\D/g, '').slice(0, 2);
      if (!digits) return '';
      return `${prefix}${digits}`;
    },
    [],
  );

  const handleClose = async () => {
    if (!isDirty) {
      reset();
      onClose();
      return;
    }
    const confirmed = await toastAdapter.confirm(
      'You have unsaved changes. Close without saving?',
      { intent: 'danger' },
    );
    if (confirmed) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (data: LocationCreateForm | LocationUpdateForm) => {
    const padRbsForSubmit = (
      value: string | undefined,
      prefix: 'R' | 'B' | 'S',
    ) => {
      if (!value) return value;
      const digits = value.replace(/\D/g, '');
      if (!digits) return value;
      return `${prefix}${digits.padStart(2, '0')}`;
    };

    const typeForSubmit =
      (data as LocationCreateForm).type ??
      (data as LocationUpdateForm).type ??
      locationType;
    const normalizedData =
      typeForSubmit === 'RBS'
        ? {
            ...data,
            rbsRow: padRbsForSubmit(
              (data as LocationCreateForm & LocationUpdateForm).rbsRow,
              'R',
            ),
            rbsBay: padRbsForSubmit(
              (data as LocationCreateForm & LocationUpdateForm).rbsBay,
              'B',
            ),
            rbsSlot: padRbsForSubmit(
              (data as LocationCreateForm & LocationUpdateForm).rbsSlot,
              'S',
            ),
          }
        : data;

    try {
      if (isEdit && location) {
        await onSave({
          ...(normalizedData as LocationUpdateForm),
          id: location.id,
        });
      } else {
        await onSave(normalizedData as LocationCreateForm);
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Location' : 'Create New Location'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (creationMode === 'layout') {
              void handleLayoutSubmit();
            } else {
              void handleSubmit(onSubmit)(e);
            }
          }}
          className="space-y-4"
        >
          {/* Zone Selection */}
          <FormSingleSelect
            name="zoneId"
            label="Zone"
            control={control}
            error={errors.zoneId?.message}
            options={zones.map((z) => ({
              value: z.id,
              label: `${z.code} - ${z.name}`,
            }))}
            required
            disabled={!!zone || isEdit} // Disable if zone is pre-selected or editing
          />

          {(creationMode === 'single' || isEdit) && (
            <>
              {/* RBS Fields */}
              {locationType === 'RBS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Controller
                      name="rbsRow"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <FormField
                          label="Row"
                          error={error}
                          required
                          className="uppercase"
                          htmlFor="rbsRow"
                        >
                          <input
                            id="rbsRow"
                            name={field.name}
                            value={stripRbsPrefix(field.value, 'R')}
                            onChange={(e) =>
                              field.onChange(normalizeRbsValue(e.target.value, 'R'))
                            }
                            onBlur={field.onBlur}
                            ref={field.ref}
                            placeholder="01"
                            maxLength={2}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={disableCodeEditing}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                              error
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                        </FormField>
                      )}
                    />
                    <Controller
                      name="rbsBay"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <FormField
                          label="Bay"
                          error={error}
                          required
                          className="uppercase"
                          htmlFor="rbsBay"
                        >
                          <input
                            id="rbsBay"
                            name={field.name}
                            value={stripRbsPrefix(field.value, 'B')}
                            onChange={(e) =>
                              field.onChange(normalizeRbsValue(e.target.value, 'B'))
                            }
                            onBlur={field.onBlur}
                            ref={field.ref}
                            placeholder="02"
                            maxLength={2}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={disableCodeEditing}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                              error
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                        </FormField>
                      )}
                    />
                    <Controller
                      name="rbsSlot"
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <FormField
                          label="Slot"
                          error={error}
                          required
                          className="uppercase"
                          htmlFor="rbsSlot"
                        >
                          <input
                            id="rbsSlot"
                            name={field.name}
                            value={stripRbsPrefix(field.value, 'S')}
                            onChange={(e) =>
                              field.onChange(normalizeRbsValue(e.target.value, 'S'))
                            }
                            onBlur={field.onBlur}
                            ref={field.ref}
                            placeholder="03"
                            maxLength={2}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={disableCodeEditing}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                              error
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                        </FormField>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Custom Label Field */}
              {locationType === 'CUSTOM' && (
                <FormInput
                  name="customLabel"
                  label="Custom Label"
                  control={control}
                  error={errors.customLabel?.message}
                  placeholder="A17, DOCK1, etc."
                  className="uppercase"
                  required
                  disabled={disableCodeEditing}
                />
              )}

              {/* Code Preview */}
              {codePreview && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Location Code Preview:
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-lg text-blue-800 dark:text-blue-200">
                    {codePreview}
                  </div>
                </div>
              )}

              {/* Status */}
              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...control.register('status')}
                    className={`
                w-full px-3 py-2 border rounded-lg
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              `}
                >
                  {locationStatusOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={
                        (isLockedLocation && option.value === 'inactive') ||
                        (isInactiveLocation && option.value === 'locked')
                      }
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
                )}
              </div>
              )}
            </>
          )}

          {creationMode === 'layout' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    RBS Layout Builder
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Configure rows, bays, and slots to create multiple locations at once.
                  </p>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total locations: <span className="font-semibold">{totalSlots}</span>
                </div>
              </div>

              <div className="space-y-4">
                {layoutRows.map((row, rowIndex) => (
                  <div
                    key={`row-${rowIndex}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-100">
                        Row R{formatIndex(rowIndex + 1)}
                      </div>
                      {layoutRows.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveRow(rowIndex)}
                        >
                          Remove row
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {row.bays.map((bay, bayIndex) => (
                        <div
                          key={`row-${rowIndex}-bay-${bayIndex}`}
                          className="flex items-center gap-3 border border-dashed border-gray-200 dark:border-gray-700 rounded p-3"
                        >
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 w-16">
                            Bay B{formatIndex(bayIndex + 1)}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              Slots
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={bay.slotsCount}
                              onChange={(e) =>
                                handleSlotCountChange(
                                  rowIndex,
                                  bayIndex,
                                  Number(e.target.value),
                                )
                              }
                              className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          {row.bays.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:text-red-600 ml-auto"
                              onClick={() => handleRemoveBay(rowIndex, bayIndex)}
                            >
                              Remove bay
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddBay(rowIndex)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add bay to row
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add row
                </button>
              </div>

              {layoutPreviewCodes.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Preview ({Math.min(layoutPreviewCodes.length, 5)} of{' '}
                      {layoutPreviewCodes.length})
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm font-mono text-blue-800 dark:text-blue-200 max-h-32 overflow-y-auto">
                    {layoutPreviewCodes.slice(0, 5).map((code) => (
                      <div key={code}>{code}</div>
                    ))}
                    {layoutPreviewCodes.length > 5 && (
                      <div className="text-xs text-blue-600 dark:text-blue-300">
                        + {layoutPreviewCodes.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(layoutError || layoutValidationError) && (
                <p className="text-sm text-red-500">
                  {layoutError || layoutValidationError}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                creationMode === 'layout'
                  ? !selectedZone || !!layoutValidationError
                  : isSubmitting || (!isEdit && !codePreview)
              }
            >
              {isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Location'
                  : creationMode === 'layout'
                    ? 'Create Layout'
                    : 'Create Location'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationFormModal;
