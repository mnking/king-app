import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CargoPackageLabelTab } from './cargo-label/CargoPackageLabelTab';
import { ImportWarehouseReceivingTab } from './import-warehouse-receiving/ImportWarehouseReceivingTab';
import { ImportWarehouseReturnTab } from './import-warehouse-return/ImportWarehouseReturnTab';
import { ImportWarehouseDeliveryTab } from './import-warehouse-delivery/ImportWarehouseDeliveryTab';

const CARGO_LABEL_TAB = 'cargo-package-label';
const IMPORT_WAREHOUSE_RECEIVING_TAB = 'import-warehouse-receiving-note';
const IMPORT_WAREHOUSE_RETURN_TAB = 'import-warehouse-return-note';
const IMPORT_WAREHOUSE_DELIVERY_TAB = 'import-warehouse-delivery-note';

export const FormPrintWorkspace = () => {
  const [tab, setTab] = useState(CARGO_LABEL_TAB);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value={IMPORT_WAREHOUSE_RECEIVING_TAB}>
            Import Warehouse Receiving Note
          </TabsTrigger>
          <TabsTrigger value={IMPORT_WAREHOUSE_RETURN_TAB}>
            Import Warehouse Return Note
          </TabsTrigger>
          <TabsTrigger value={IMPORT_WAREHOUSE_DELIVERY_TAB}>
            Import Warehouse Delivery Note
          </TabsTrigger>
          <TabsTrigger value={CARGO_LABEL_TAB}>Cargo Package Label</TabsTrigger>
        </TabsList>
        <TabsContent value={IMPORT_WAREHOUSE_RECEIVING_TAB}>
          <ImportWarehouseReceivingTab />
        </TabsContent>
        <TabsContent value={IMPORT_WAREHOUSE_RETURN_TAB}>
          <ImportWarehouseReturnTab />
        </TabsContent>
        <TabsContent value={IMPORT_WAREHOUSE_DELIVERY_TAB}>
          <ImportWarehouseDeliveryTab />
        </TabsContent>
        <TabsContent value={CARGO_LABEL_TAB}>
          <CargoPackageLabelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormPrintWorkspace;
