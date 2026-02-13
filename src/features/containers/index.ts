// Types
export type {
  Container,
  ContainerType,
  ContainerCreateForm,
  ContainerUpdateForm,
  ApiResponse,
  PaginatedResponse,
} from './types';

export type { ContainerFieldValue, ContainerField } from './schemas';

export type {
  ContainerNumberPickerProps,
  ContainerNumberPickerHandle,
  OnResolvedCallback,
} from './types/container-picker.types';

// Components
export { ContainerNumberPicker } from './components/ContainerNumberPicker';
export { CreateContainerModal } from './components/container-list/CreateContainerModal';

// Hooks
export {
  useContainers,
  useContainer,
  useContainerByNumber,
  useCreateContainer,
  useUpdateContainer,
  useDeleteContainer,
  useAllContainers,
  containerQueryKeys,
} from './hooks/use-containers-query';

export {
  useContainerTypes,
  useContainerType,
  useContainerTypeList,
  containerTypesQueryKeys,
} from './hooks/use-container-types-query';

export {
  useContainerTransactions,
  useContainerTransactionList,
  useContainerTransactionsByContainer,
} from './hooks/use-container-transactions';

export {
  useContainerCycles,
  useContainerCycleList,
  useContainerCycle,
} from './hooks/use-container-cycles';

// Schemas
export {
  containerNumberSchema,
  containerFieldSchema,
  containerFormSchema,
  containerTypeFormSchema,
  containerCycleFormSchema,
  containerCycleEndSchema,
  containerTransactionFormSchema,
  CONTAINER_EVENT_TYPES,
} from './schemas';

// Utils (re-exported for convenience)
export { isValidISO6346, normalizeContainerNumber } from '@/shared/utils/container';
