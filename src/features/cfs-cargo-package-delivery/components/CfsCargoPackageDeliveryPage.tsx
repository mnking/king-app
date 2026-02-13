import React from 'react';

import { PackingListSidebar } from './PackingListSidebar';
import { PackingListTransactionsPanel } from './PackingListTransactionsPanel';

const CfsCargoPackageDeliveryPage: React.FC = () => {
  const [packingListId, setPackingListId] = React.useState<string | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = React.useState<string | null>(null);
  const handleSelectPackingList = React.useCallback(
    (selection: { id: string; bookingOrderCode: string | null } | null) => {
      setPackingListId(selection?.id ?? null);
      setSelectedOrderCode(selection?.bookingOrderCode ?? null);
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="w-full md:w-[420px] min-w-[360px] max-w-[520px] border-r border-gray-200 dark:border-gray-800 min-h-0">
        <PackingListSidebar
          selectedPackingListId={packingListId}
          onSelect={handleSelectPackingList}
        />
      </div>

      <div className="min-h-0 flex-1">
        <PackingListTransactionsPanel
          packingListId={packingListId}
          bookingOrderCode={selectedOrderCode}
        />
      </div>
    </div>
  );
};

export default CfsCargoPackageDeliveryPage;
