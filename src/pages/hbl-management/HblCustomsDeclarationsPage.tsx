import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useHBL } from '@/features/hbl-management/hooks/use-hbls-query';
import { HblCustomsDeclarationsManager } from '@/features/customs-declaration';

const buildContainerSummary = (containers?: Array<{ containerNumber: string; containerTypeCode: string }>) => {
  const container = containers?.[0];
  if (!container?.containerNumber) return null;
  return container.containerTypeCode
    ? `${container.containerNumber} (${container.containerTypeCode})`
    : container.containerNumber;
};

const InfoChip: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
};

export const HblCustomsDeclarationsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ hblId: string }>();
  const hblId = params.hblId ?? '';

  const hblQuery = useHBL(hblId);
  const hbl = hblQuery.data ?? null;

  const packingListId = hbl?.packingList?.id ?? hbl?.packingListId ?? null;

  const containerSummary = useMemo(
    () => buildContainerSummary(hbl?.containers),
    [hbl?.containers],
  );

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2"
              onClick={() => navigate('/hbl-management')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to HBL list
            </Button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {hblQuery.isLoading ? 'Loading HBL…' : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InfoChip label="HBL" value={hbl?.code ?? null} />
            <InfoChip label="MBL" value={hbl?.mbl ?? null} />
            <InfoChip label="Container" value={containerSummary} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        {hblQuery.error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-sm text-red-600 dark:text-red-400">
            {(hblQuery.error as Error).message || 'Failed to load HBL.'}
          </div>
        ) : (
          <HblCustomsDeclarationsManager hblId={hblId} packingListId={packingListId} />
        )}
      </div>
    </div>
  );
};

export default HblCustomsDeclarationsPage;

