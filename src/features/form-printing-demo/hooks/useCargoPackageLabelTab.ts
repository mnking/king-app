import { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { usePdfDownload } from '@/shared/features/form-printing/hooks/usePdfRender';
import { getTemplateMapper } from '@/shared/features/form-printing/templates';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import { useCargoPackageLabelData } from './useCargoPackageLabelData';

export const useCargoPackageLabelTab = () => {
  const [selectedPackingListId, setSelectedPackingListId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { packingList, totalCount, isLoading, isFetching, error, refetch } =
    useCargoPackageLabelData(selectedPackingListId, pagination);
  const { download, isPending } = usePdfDownload<'CARGO_PACKAGE_LABEL'>();
  const mapper = useMemo(() => getTemplateMapper('CARGO_PACKAGE_LABEL'), []);

  const loadAllPackages = useMutation({
    mutationFn: async () => {
      if (!selectedPackingListId) return { results: [], total: 0 };
      return cargoPackagesApi.fetchByPackingList({ packingListId: selectedPackingListId });
    },
  });

  const handleSelectPackingList = (id: string | null) => {
    setSelectedPackingListId(id);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDownload = async () => {
    if (!selectedPackingListId) {
      toast.error('Select a packing list first.');
      return;
    }

    if (!packingList) {
      toast.error('Packing list data is not ready yet.');
      return;
    }

    try {
      const { results } = await loadAllPackages.mutateAsync();
      if (!results.length) {
        toast.error('This packing list does not have any cargo packages yet.');
        return;
      }
      const { payload, issues } = mapper({ packingList, packages: results });
      const blockingIssue = issues.find((issue) => issue.severity === 'error');
      if (blockingIssue) {
        toast.error(blockingIssue.message || 'Please complete required fields.');
        return;
      }
      await download({
        templateCode: 'CARGO_PACKAGE_LABEL',
        payload,
        fileName: 'cargo-package-label.pdf',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to render label PDF';
      toast.error(message);
    }
  };

  const isDownloadDisabled =
    !packingList ||
    totalCount === 0 ||
    isLoading ||
    isFetching ||
    isPending ||
    loadAllPackages.isPending;
  const hasPackages = totalCount > 0;

  return {
    selectedPackingListId,
    handleSelectPackingList,
    packingList,
    totalCount,
    isLoading,
    isFetching,
    error,
    refetch,
    handleDownload,
    isDownloadDisabled,
    isDownloading: isPending || loadAllPackages.isPending,
    hasPackages,
  };
};
