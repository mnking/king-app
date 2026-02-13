// Local Storage hooks
export { useLocalStorage, useUserPreferences } from './useLocalStorage';

// Form State Management hooks
export {
  useFormState,
  useSimpleForm,
  useAutoSaveForm,
  useModalForm,
} from './useFormState';
export { useUnsavedChanges } from './useUnsavedChanges';

// Notification hooks
export { useNotifications } from './useNotifications';
export type { Notification, NotificationSettings } from './useNotifications';
export { useToast } from './useToast';
export type {
  ToastHook,
  ToastOptions,
  ToastConfirmOptions,
  ToastPromiseMessages,
  ToastTemplateParams,
  ToastMessageTemplate,
} from './useToast';

// UI State Management hooks
export { useUI, useModals, useLoading, useSearch } from './useUI';
export type { UIState, ModalState, LoadingState } from './useUI';

// Utility hooks
export {
  useDebounce,
  useDebounceCallback,
  usePrevious,
  useClickOutside,
  useAsync,
  useInterval,
  useTimeout,
  useClipboard,
  useWindowSize,
  useMediaQuery,
  useOnlineStatus,
  useFocusTrap,
} from './useUtils';

// Re-export theme hook from context
export { useTheme } from '@/contexts/ThemeContext';

// Re-export auth store
export { useAuthStore } from '@/stores/useAuthStore';

// Re-export feature hooks
export { useAuth } from '@/features/auth/useAuth';
export { useTeams } from '@/features/teams/useTeams';
export { useUsers } from '@/features/users/useUsers';

// Export specific query hooks for convenience
export { useTeamsByUser, useTeamMembers } from '@/features/teams/useTeams';

export {
  useUsersByRole,
  useUsersByDepartment,
  useActiveUsers,
  useSearchUsers,
} from '@/features/users/useUsers';
