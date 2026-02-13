import type { FormTemplateCode, RenderContext, RenderIssue, RenderPayload } from '../types';
import { mapCargoPackageLabel } from './cargoPackageLabelMapper';
import { mapImportWarehouseReceiving } from './importWarehouseReceivingMapper';
import { mapImportWarehouseReturn } from './importWarehouseReturnMapper';
import { mapImportWarehouseDelivery } from './importWarehouseDeliveryMapper';

type MapperFn<TCode extends FormTemplateCode> = (
  context: RenderContext<TCode>,
) => {
  payload: RenderPayload<TCode>;
  issues: RenderIssue[];
};

const templateMappers: Record<FormTemplateCode, MapperFn<FormTemplateCode>> = {
  CARGO_PACKAGE_LABEL: mapCargoPackageLabel as MapperFn<'CARGO_PACKAGE_LABEL'>,
  IMPORT_WAREHOUSE_RECEIVING_NOTE:
    mapImportWarehouseReceiving as MapperFn<'IMPORT_WAREHOUSE_RECEIVING_NOTE'>,
  IMPORT_WAREHOUSE_RETURN_NOTE:
    mapImportWarehouseReturn as MapperFn<'IMPORT_WAREHOUSE_RETURN_NOTE'>,
  IMPORT_WAREHOUSE_DELIVERY_NOTE:
    mapImportWarehouseDelivery as MapperFn<'IMPORT_WAREHOUSE_DELIVERY_NOTE'>,
};

export const getTemplateMapper = <TCode extends FormTemplateCode>(
  code: TCode,
): MapperFn<TCode> => {
  const mapper = templateMappers[code];
  if (!mapper) {
    throw new Error(`No mapper registered for template code: ${code}`);
  }
  return mapper as MapperFn<TCode>;
};

export {
  mapCargoPackageLabel,
  mapImportWarehouseReceiving,
  mapImportWarehouseReturn,
  mapImportWarehouseDelivery,
};
