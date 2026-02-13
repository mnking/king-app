import React from 'react';
import { useAuth } from '@/features/auth/useAuth';
import MoveLoadedContainerTable from './MoveLoadedContainerTable';

const MoveLoadedContainerPage: React.FC = () => {
  const { can } = useAuth();
  const canRead = can?.('move_loaded_container:read') ?? false;
  const canCheck = can?.('move_loaded_container:check') ?? false;
  const canWrite = can?.('move_loaded_container:write') ?? false;
  const canView = canRead || canCheck || canWrite;

  return (
    <div className="flex h-full flex-col p-6">
      {canView && (
        <MoveLoadedContainerTable
          canRead={canRead}
          canCheck={canCheck}
          canWrite={canWrite}
        />
      )}
    </div>
  );
};

export default MoveLoadedContainerPage;
