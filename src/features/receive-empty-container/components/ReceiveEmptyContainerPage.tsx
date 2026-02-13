import React from 'react';
import ReceiveEmptyContainerTable from './ReceiveEmptyContainerTable';
import { useAuth } from '@/features/auth/useAuth';

const ReceiveEmptyContainerPage: React.FC = () => {
  const { can } = useAuth();
  const canRead = can?.('receive_empty_container:read') ?? false;
  const canCheck = can?.('receive_empty_container:check') ?? false;
  const canWrite = can?.('receive_empty_container:write') ?? false;
  const canView = canRead || canCheck || canWrite;

  return (
    <div className="flex h-full flex-col p-6">
      {canView && (
        <ReceiveEmptyContainerTable
          canRead={canRead}
          canCheck={canCheck}
          canWrite={canWrite}
        />
      )}
    </div>
  );
};

export default ReceiveEmptyContainerPage;
