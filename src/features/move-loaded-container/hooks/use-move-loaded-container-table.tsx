import { useCallback, useMemo, useState, useEffect } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Eye, FileCheck2, Pencil, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EntityAction } from '@/shared/components/EntityTable';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import { listContainers } from '@/services/apiContainers';
import { getExportPlans } from '@/services/apiExportPlans';
import { useMoveLoadedContainers } from './use-move-loaded-container-query';
import { useDeclareGetOutToCustoms } from './use-move-loaded-container-query';
import type {
  MoveLoadedContainerQueryParams,
  StuffedContainerMoveOutListItem,
  StuffedMoveWorkingResultStatus,
} from '../types';

interface UseMoveLoadedContainerTableParams {
  canRead: boolean;
  canCheck: boolean;
  canWrite: boolean;
}

type SelectOption = {
  value: string;
  label: string;
};

type ModalMode = 'view' | 'edit' | 'move';

const isStatusFilter = (
  value: unknown,
): value is StuffedMoveWorkingResultStatus =>
  value === 'received' || value === 'moved';

export const useMoveLoadedContainerTable = ({
  canRead,
  canCheck,
  canWrite,
}: UseMoveLoadedContainerTableParams) => {
  const [filters, setFilters] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRecord, setActiveRecord] =
    useState<StuffedContainerMoveOutListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [containerSearchTerm, setContainerSearchTerm] = useState('');
  const [containerOptions, setContainerOptions] = useState<SelectOption[]>([]);
  const [containerOptionsLoading, setContainerOptionsLoading] = useState(false);
  const [planCodeSearchTerm, setPlanCodeSearchTerm] = useState('');
  const [planCodeOptions, setPlanCodeOptions] = useState<SelectOption[]>([]);
  const [planCodeOptionsLoading, setPlanCodeOptionsLoading] = useState(false);

  const queryParams = useMemo<MoveLoadedContainerQueryParams>(() => {
    const params: MoveLoadedContainerQueryParams = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      sortBy: canWrite ? 'planner' : 'gate',
    };

    if (isStatusFilter(filters.workingResultStatus)) {
      params.workingResultStatus = filters.workingResultStatus;
    }
    if (
      typeof filters.estimateMoveFrom === 'string' &&
      filters.estimateMoveFrom
    ) {
      params.estimateMoveFrom = filters.estimateMoveFrom;
    }
    if (typeof filters.estimateMoveTo === 'string' && filters.estimateMoveTo) {
      params.estimateMoveTo = filters.estimateMoveTo;
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

  const { data, isLoading, isFetching, isError, error } =
    useMoveLoadedContainers(queryParams, {
      enabled: canRead || canCheck || canWrite,
    });
  const declareGetOut = useDeclareGetOutToCustoms();

  const rows = data?.results ?? [];
  const totalCount = data?.total ?? 0;
  const tableError = isError
    ? error instanceof Error
      ? error.message
      : 'Failed to load stuffed containers'
    : null;

  const openModal = useCallback(
    (item: StuffedContainerMoveOutListItem, mode: ModalMode) => {
      setActiveRecord(item);
      setModalMode(mode);
      setIsModalOpen(true);
    },
    [],
  );

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

  const actions: EntityAction<StuffedContainerMoveOutListItem>[] = useMemo(
    () => {
      const nextActions: EntityAction<StuffedContainerMoveOutListItem>[] = [
        {
          key: 'view',
          label: 'View',
          icon: <Eye className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'view');
          },
        },
      ];

      if (canWrite) {
        nextActions.push({
          key: 'move',
          label: 'Move to Port',
          icon: <Truck className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'move');
          },
          disabled: (item) => item.workingResultStatus !== 'received',
        });
      } else if (canCheck) {
        nextActions.push({
          key: 'check',
          label: 'Move to Port',
          icon: <Truck className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'move');
          },
          disabled: (item) => item.workingResultStatus !== 'received',
        });
      }

      if (canWrite) {
        nextActions.push({
          key: 'edit',
          label: 'Edit',
          icon: <Pencil className="h-4 w-4" />,
          onClick: (item) => {
            openModal(item, 'edit');
          },
          disabled: (item) =>
            item.workingResultStatus !== 'moved' ||
            item.getOutContainerStatus,
        });
        nextActions.push({
          key: 'declare',
          label: 'Get-out Container',
          icon: <FileCheck2 className="h-4 w-4" />,
          onClick: async (item) => {
            try {
              await declareGetOut.mutateAsync({
                id: item.id,
                payload: {},
              });
              toast.success('Get-out declared');
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Failed to declare get-out',
              );
            }
          },
          disabled: (item) =>
            item.workingResultStatus !== 'moved' ||
            item.getOutContainerStatus,
        });
      }

      return nextActions;
    },
    [canCheck, canWrite, declareGetOut, openModal],
  );

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
