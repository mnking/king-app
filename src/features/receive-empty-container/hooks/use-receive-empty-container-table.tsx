import { useCallback, useMemo, useState, useEffect } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Eye, FileCheck2, FileX2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EntityAction } from '@/shared/components/EntityTable';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import { listContainers } from '@/services/apiContainers';
import { getExportPlans } from '@/services/apiExportPlans';
import {
  useDeclareGetInEmptyContainer,
  useReceiveEmptyContainers,
} from './use-receive-empty-container-query';
import type {
  EmptyContainerReceivingListItem,
  ReceiveEmptyContainerQueryParams,
} from '../types';

type ModalMode = 'check' | 'edit' | 'view';

interface UseReceiveEmptyContainerTableParams {
  canRead: boolean;
  canCheck: boolean;
  canWrite: boolean;
}

type SelectOption = {
  value: string;
  label: string;
};

export const useReceiveEmptyContainerTable = ({
  canRead,
  canCheck,
  canWrite,
}: UseReceiveEmptyContainerTableParams) => {
  const [filters, setFilters] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRecord, setActiveRecord] = useState<EmptyContainerReceivingListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('check');
  const [containerSearchTerm, setContainerSearchTerm] = useState('');
  const [containerOptions, setContainerOptions] = useState<SelectOption[]>([]);
  const [containerOptionsLoading, setContainerOptionsLoading] = useState(false);
  const [planCodeSearchTerm, setPlanCodeSearchTerm] = useState('');
  const [planCodeOptions, setPlanCodeOptions] = useState<SelectOption[]>([]);
  const [planCodeOptionsLoading, setPlanCodeOptionsLoading] = useState(false);

  const queryParams = useMemo<ReceiveEmptyContainerQueryParams>(() => {
    const params: ReceiveEmptyContainerQueryParams = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      sortBy: canWrite ? 'planner' : 'gate',
    };

    const workingResultStatus = filters.workingResultStatus;
    if (
      workingResultStatus === 'waiting' ||
      workingResultStatus === 'received' ||
      workingResultStatus === 'rejected'
    ) {
      params.workingResultStatus = workingResultStatus;
    }
    if (typeof filters.estimatedStuffingFrom === 'string' && filters.estimatedStuffingFrom) {
      params.estimatedStuffingFrom = filters.estimatedStuffingFrom;
    }
    if (typeof filters.estimatedStuffingTo === 'string' && filters.estimatedStuffingTo) {
      params.estimatedStuffingTo = filters.estimatedStuffingTo;
    }
    const containerNumbers = Array.isArray(filters.containerNumber)
      ? filters.containerNumber
      : typeof filters.containerNumber === 'string' && filters.containerNumber.trim()
        ? [filters.containerNumber.trim()]
        : [];
    if (containerNumbers.length) {
      params.containerNumber = containerNumbers;
    }
    const planCodes = Array.isArray(filters.planCode)
      ? filters.planCode
      : typeof filters.planCode === 'string' && filters.planCode.trim()
        ? [filters.planCode.trim()]
        : [];
    if (planCodes.length) {
      params.planCode = planCodes;
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    return params;
  }, [filters, pagination, searchTerm, canWrite]);

  useEffect(() => {
    let isActive = true;
    const term = containerSearchTerm.trim().toLowerCase();
    if (!term) {
      setContainerOptions([]);
      setContainerOptionsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setContainerOptionsLoading(true);
    listContainers({ page: 1, itemsPerPage: 50 })
      .then((response) => {
        if (!isActive) return;
        const options = response.data.results
          .filter((container) => container.number.toLowerCase().includes(term))
          .slice(0, 50)
          .map((container) => ({
            value: container.number,
            label: container.number,
          }));
        setContainerOptions(options);
      })
      .catch(() => {
        if (isActive) {
          setContainerOptions([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setContainerOptionsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [containerSearchTerm]);

  useEffect(() => {
    let isActive = true;
    const term = planCodeSearchTerm.trim();
    if (!term) {
      setPlanCodeOptions([]);
      setPlanCodeOptionsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setPlanCodeOptionsLoading(true);
    getExportPlans({ page: 1, itemsPerPage: 50 })
      .then((response) => {
        if (!isActive) return;
        const codes = response.results
          .map((plan) => plan.code)
          .filter((code): code is string => !!code)
          .filter((code) => code.toLowerCase().includes(term.toLowerCase()));
        const options = Array.from(new Set(codes)).map((code) => ({
          value: code,
          label: code,
        }));
        setPlanCodeOptions(options);
      })
      .catch(() => {
        if (isActive) {
          setPlanCodeOptions([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setPlanCodeOptionsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [planCodeSearchTerm]);

  const { data, isLoading, isFetching, isError, error } = useReceiveEmptyContainers(queryParams);
  const rows = data?.results ?? [];
  const totalCount = data?.total ?? 0;
  const tableError = isError ? (error instanceof Error ? error.message : 'Failed to load containers') : null;
  const declareGetInEmptyContainer = useDeclareGetInEmptyContainer();

  const openModal = useCallback((item: EmptyContainerReceivingListItem, mode: ModalMode) => {
    setActiveRecord(item);
    setModalMode(mode);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setActiveRecord(null);
  }, []);

  const handleApplyFilter = useCallback((values: FilterValues) => {
    setFilters(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const actions: EntityAction<EmptyContainerReceivingListItem>[] = useMemo(() => {
    const canView = canRead || canCheck || canWrite;
    const nextActions: EntityAction<EmptyContainerReceivingListItem>[] = [];

    if (canView) {
      nextActions.push({
        key: 'view',
        label: 'View',
        icon: <Eye className="h-4 w-4" />,
        onClick: (item) => {
          openModal(item, 'view');
        },
      });
    }

    if (canWrite) {
      nextActions.push(
        {
          key: 'check',
          label: 'Check Container',
          icon: <FileCheck2 className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'check');
          },
          disabled: (item) =>
            !['waiting', 'rejected'].includes(item.workingResultStatus),
        },
        {
          key: 'get-in',
          label: 'Get-in Empty Container',
          icon: <FileX2 className="h-4 w-4" />,
          onClick: async (item) => {
            try {
              await declareGetInEmptyContainer.mutateAsync(item);
              toast.success('Customs declaration submitted.');
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to declare customs');
            }
          },
          disabled: (item) =>
            item.workingResultStatus !== 'received' ||
            item.getInEmptyContainerStatus,
        },
        {
          key: 'edit',
          label: 'Edit',
          icon: <Pencil className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'edit');
          },
          disabled: (item) =>
            !['received', 'rejected'].includes(item.workingResultStatus) ||
            item.getInEmptyContainerStatus,
        },
      );
    } else if (canCheck) {
      nextActions.push({
        key: 'check',
        label: 'Check Container',
        icon: <FileCheck2 className="h-4 w-4" />,
        onClick: (item) => {
          openModal(item, 'check');
        },
        disabled: (item) =>
          !['waiting', 'rejected'].includes(item.workingResultStatus),
      });
    }

    return nextActions;
  }, [canRead, canCheck, canWrite, declareGetInEmptyContainer, openModal]);

  return {
    actions,
    rows,
    totalCount,
    tableError,
    isLoading,
    isFetching,
    pagination,
    setPagination,
    searchTerm,
    handleSearchChange,
    handleApplyFilter,
    handleClearFilter,
    containerOptions,
    containerOptionsLoading,
    containerSearchTerm,
    setContainerSearchTerm,
    planCodeOptions,
    planCodeOptionsLoading,
    planCodeSearchTerm,
    setPlanCodeSearchTerm,
    isModalOpen,
    modalMode,
    activeRecord,
    closeModal,
  };
};
