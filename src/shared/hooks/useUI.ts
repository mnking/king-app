import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobile: boolean;
  currentView: 'grid' | 'list';
  bulkSelectMode: boolean;
  selectedItems: Set<string>;
}

export interface ModalState {
  [key: string]: boolean;
}

export interface LoadingState {
  [key: string]: boolean;
}

/**
 * Custom hook for managing UI state
 */
export function useUI() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    'sidebarCollapsed',
    false,
  );
  const [currentView, setCurrentView] = useLocalStorage<'grid' | 'list'>(
    'currentView',
    'grid',
  );
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Sidebar controls
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, [setSidebarCollapsed]);

  const toggleSidebarMobile = useCallback(() => {
    setSidebarMobile((prev) => !prev);
  }, []);

  const closeSidebarMobile = useCallback(() => {
    setSidebarMobile(false);
  }, []);

  // View controls
  const switchView = useCallback(
    (view: 'grid' | 'list') => {
      setCurrentView(view);
    },
    [setCurrentView],
  );

  // Bulk selection controls
  const toggleBulkSelectMode = useCallback(() => {
    setBulkSelectMode((prev) => {
      if (prev) {
        // Clear selections when exiting bulk mode
        setSelectedItems(new Set());
      }
      return !prev;
    });
  }, []);

  const selectItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  }, []);

  const deselectItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedItems.has(id),
    [selectedItems],
  );

  return {
    // State
    sidebarCollapsed,
    sidebarMobile,
    currentView,
    bulkSelectMode,
    selectedItems,
    selectedCount: selectedItems.size,

    // Sidebar actions
    toggleSidebar,
    toggleSidebarMobile,
    closeSidebarMobile,
    setSidebarCollapsed,

    // View actions
    switchView,
    setCurrentView,

    // Selection actions
    toggleBulkSelectMode,
    selectItem,
    deselectItem,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    isSelected,
  };
}

/**
 * Custom hook for managing modal states
 */
export function useModals() {
  const [modals, setModals] = useState<ModalState>({});

  const openModal = useCallback((modalId: string) => {
    setModals((prev) => ({ ...prev, [modalId]: true }));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setModals((prev) => ({ ...prev, [modalId]: false }));
  }, []);

  const toggleModal = useCallback((modalId: string) => {
    setModals((prev) => ({ ...prev, [modalId]: !prev[modalId] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({});
  }, []);

  const isModalOpen = useCallback(
    (modalId: string) => Boolean(modals[modalId]),
    [modals],
  );

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isModalOpen,
  };
}

/**
 * Custom hook for managing loading states
 */
export function useLoading() {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  }, []);

  const startLoading = useCallback(
    (key: string) => {
      setLoading(key, true);
    },
    [setLoading],
  );

  const stopLoading = useCallback(
    (key: string) => {
      setLoading(key, false);
    },
    [setLoading],
  );

  const isLoading = useCallback(
    (key: string) => Boolean(loadingStates[key]),
    [loadingStates],
  );

  const anyLoading = Object.values(loadingStates).some(Boolean);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    isLoading,
    anyLoading,
  };
}

/**
 * Custom hook for managing search and filter states
 */
export function useSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const clearAll = useCallback(() => {
    setSearchTerm('');
    setFilters({});
    setSortBy('');
    setSortOrder('asc');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const hasActiveFilters =
    Object.keys(filters).length > 0 || searchTerm.length > 0;

  return {
    // State
    searchTerm,
    filters,
    sortBy,
    sortOrder,
    hasActiveFilters,

    // Actions
    setSearchTerm,
    updateFilter,
    removeFilter,
    clearFilters,
    clearSearch,
    clearAll,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
  };
}
