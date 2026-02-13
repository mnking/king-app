import type {
  DestuffCfsReceiptRenderContext,
  ImportWarehouseReceivingPayload,
  RenderIssue,
} from '../types';
import { mapImportWarehouseReceiving } from './importWarehouseReceivingMapper';

export interface ImportWarehouseReturnMapperResult {
  payload: ImportWarehouseReceivingPayload;
  issues: RenderIssue[];
}

export const mapImportWarehouseReturn = (
  context: DestuffCfsReceiptRenderContext,
): ImportWarehouseReturnMapperResult => {
  return mapImportWarehouseReceiving(context);
};
