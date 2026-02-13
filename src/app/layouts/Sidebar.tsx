import React, { useState, useEffect, useCallback, useRef } from 'react';
import { matchPath } from 'react-router-dom';
import { createPortal } from 'react-dom';
import pkg from '../../../package.json';
import { ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import type { ViewType } from '@/config/routes.config';
import { routesConfig } from '@/config/routes.config';
import { generateMenu, type MenuItem } from '@/config/routes.utils';
import { useAuth } from '@/features/auth/useAuth';

type SidebarNavItem = MenuItem & { view: string };
type SidebarSubMenuItem = SidebarNavItem;
type PopoverEntry =
  | { type: 'header'; id: string; label: string }
  | { type: 'item'; item: SidebarSubMenuItem };

interface SidebarProps {
  currentView: string;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface PopoverPosition {
  top: number;
  left: number;
}

interface PopoverState {
  isOpen: boolean;
  menuId: string | null;
  position: PopoverPosition;
  items: PopoverEntry[];
  parentLabel: string;
}

interface MenuPopoverProps {
  isOpen: boolean;
  menuId: string | null;
  items: PopoverEntry[];
  position: PopoverPosition;
  parentLabel: string;
  activeView: string;
  popoverRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onNavigate: (item: SidebarSubMenuItem) => void;
}

const POPOVER_GAP = 8;
const POPOVER_PADDING = 16;
const ESTIMATED_ITEM_HEIGHT = 44;

const isNavigableItem = (
  item: MenuItem | undefined | null,
): item is SidebarNavItem =>
  Boolean(item && typeof item.view === 'string' && item.view.length > 0);

const hasVisibleAccess = (
  item: MenuItem,
  canAccess: (menuItem: MenuItem) => boolean,
): boolean => {
  if (item.permission === false) {
    return false;
  }
  const selfAllowed = canAccess(item);
  if (item.subItems && item.subItems.length > 0) {
    return (
      selfAllowed ||
      item.subItems.some((child) => hasVisibleAccess(child, canAccess))
    );
  }
  return selfAllowed;
};

const isViewMatch = (itemView: string | null, currentView: string): boolean => {
  if (!itemView) return false;
  if (itemView === currentView || currentView.startsWith(`${itemView}/`)) {
    return true;
  }
  return Boolean(matchPath({ path: itemView, end: false }, currentView));
};

const itemContainsView = (item: MenuItem, view: string): boolean => {
  if (isViewMatch(item.view, view)) return true;
  return item.subItems?.some((child) => itemContainsView(child, view)) ?? false;
};

const findMenuPath = (
  items: MenuItem[],
  view: string,
  ancestors: string[] = [],
): string[] | null => {
  for (const item of items) {
    const nextAncestors =
      item.subItems && item.subItems.length > 0
        ? [...ancestors, item.id]
        : ancestors;

    if (isViewMatch(item.view, view)) {
      return ancestors;
    }

    if (item.subItems && item.subItems.length > 0) {
      const result = findMenuPath(item.subItems, view, nextAncestors);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

const collectPopoverEntries = (
  items: MenuItem[],
  canAccess: (menuItem: MenuItem) => boolean,
): PopoverEntry[] => {
  const results: PopoverEntry[] = [];

  items.forEach((item) => {
    if (!hasVisibleAccess(item, canAccess)) {
      return;
    }

    const visibleChildren =
      item.subItems?.filter((child) => hasVisibleAccess(child, canAccess)) ?? [];

    if (visibleChildren.length > 0) {
      results.push({ type: 'header', id: item.id, label: item.label });
      results.push(...collectPopoverEntries(visibleChildren, canAccess));
      return;
    }

    if (isNavigableItem(item) && canAccess(item)) {
      results.push({ type: 'item', item: item as SidebarSubMenuItem });
    }
  });

  return results;
};

/**
 * Collapsed sidebar flyout rendered via portal so it can float above content.
 */
const MenuPopover: React.FC<MenuPopoverProps> = ({
  isOpen,
  menuId,
  items,
  position,
  parentLabel,
  activeView,
  popoverRef,
  onClose,
  onNavigate,
}) => {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      const firstItem = itemRefs.current.find(
        (node): node is HTMLButtonElement => Boolean(node),
      );
      firstItem?.focus();
    } else {
      itemRefs.current = [];
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const focusableItems = itemRefs.current.filter(
        (node): node is HTMLButtonElement => Boolean(node),
      );

      if (!focusableItems.length) return;

      const currentIndex = focusableItems.findIndex(
        (node) => node === document.activeElement,
      );

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex =
          currentIndex >= 0
            ? (currentIndex + 1) % focusableItems.length
            : 0;
        focusableItems[nextIndex]?.focus();
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex =
          currentIndex >= 0
            ? (currentIndex - 1 + focusableItems.length) %
            focusableItems.length
            : focusableItems.length - 1;
        focusableItems[prevIndex]?.focus();
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusableItems[0]?.focus();
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusableItems[focusableItems.length - 1]?.focus();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen || !menuId || !items.length) {
    return null;
  }

  let headerCount = 0;
  let itemIndex = 0;

  return createPortal(
    <div
      ref={popoverRef}
      id={`popover-${menuId}`}
      role="menu"
      aria-label={`${parentLabel} submenu`}
      style={{
        top: position.top,
        left: position.left,
      }}
      className="fixed z-50 w-64 max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur-sm transition-all duration-150 ease-out dark:border-gray-700 dark:bg-gray-800/95"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-1">
        {items.map((entry) => {
          if (entry.type === 'header') {
            headerCount += 1;
            return (
              <div
                key={`header-${entry.id}`}
                className={`px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${headerCount > 1 ? 'mt-2 border-t border-gray-200/70 dark:border-gray-700/70' : ''}`}
              >
                {entry.label}
              </div>
            );
          }

          const subItem = entry.item;
          const currentIndex = itemIndex;
          itemIndex += 1;

          return (
            <button
              key={subItem.id}
              ref={(node) => {
                itemRefs.current[currentIndex] = node;
              }}
              onClick={() => onNavigate(subItem)}
              className={`group flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${isViewMatch(subItem.view, activeView)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/80 dark:hover:text-white'
                }`}
              role="menuitem"
            >
              <subItem.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate text-left">{subItem.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const { can } = useAuth();
  const [popoverState, setPopoverState] = useState<PopoverState>({
    isOpen: false,
    menuId: null,
    position: { top: 0, left: 0 },
    items: [],
    parentLabel: '',
  });

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastViewRef = useRef(currentView);

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-expanded-sections');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setExpandedSections(new Set(parsed));
      } catch {
        console.warn('Failed to parse saved sidebar state');
      }
    }
  }, []);

  // Save expanded state to localStorage
  const saveExpandedState = useCallback((sections: Set<string>) => {
    localStorage.setItem(
      'sidebar-expanded-sections',
      JSON.stringify(Array.from(sections)),
    );
  }, []);

  // Menu configuration from routes config
  const menuConfig: MenuItem[] = React.useMemo(
    () => generateMenu(routesConfig),
    [],
  );

  const isAllowed = useCallback(
    (item: MenuItem): boolean => {
      if (item.menuPermissions && item.menuPermissions.length > 0) {
        return item.menuPermissions.every((perm) => can(perm));
      }
      return true;
    },
    [can],
  );

  const filterItems = useCallback(
    (items: MenuItem[]) =>
      items
        .filter((item) => item.permission !== false)
        .filter((item) => hasVisibleAccess(item, isAllowed)),
    [isAllowed],
  );

  // Toggle section expansion
  const toggleSection = useCallback(
    (sectionId: string) => {
      if (isCollapsed) return;
      setExpandedSections((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
        } else {
          newSet.add(sectionId);
        }
        saveExpandedState(newSet);
        return newSet;
      });
    },
    [isCollapsed, saveExpandedState],
  );

  // Handle navigation clicks
  const handleNavClick = useCallback(
    (item: MenuItem) => {
      if (isNavigableItem(item)) {
        onViewChange(item.view as ViewType);
      }
    },
    [onViewChange],
  );

  // Check if current view matches item
  const isActiveItem = useCallback(
    (item: MenuItem): boolean => {
      return itemContainsView(item, currentView);
    },
    [currentView],
  );

  // Auto-expand sections containing active items
  useEffect(() => {
    const pathToView = findMenuPath(menuConfig, currentView);
    if (!pathToView || pathToView.length === 0) {
      return;
    }

    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      pathToView.forEach((id) => newSet.add(id));
      saveExpandedState(newSet);
      return newSet;
    });
  }, [currentView, saveExpandedState, menuConfig]);

  /**
   * Closes the active popover and restores focus to its trigger.
   */
  const closePopover = useCallback(() => {
    setPopoverState((prev) => {
      if (!prev.isOpen) return prev;

      const trigger = prev.menuId
        ? triggerRefs.current[prev.menuId] ?? null
        : null;

      if (trigger) {
        requestAnimationFrame(() => trigger.focus());
      }

      return {
        isOpen: false,
        menuId: null,
        position: { top: 0, left: 0 },
        items: [],
        parentLabel: '',
      };
    });
  }, []);

  /**
   * Opens the flyout for a collapsed menu section while ensuring it stays on screen.
   */
  const openPopover = useCallback(
    (menuItem: MenuItem) => {
      if (!menuItem.subItems?.length) return;

      const navigableItems = collectPopoverEntries(
        menuItem.subItems,
        isAllowed,
      );

      if (!navigableItems.length) return;

      const trigger = triggerRefs.current[menuItem.id];
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      // Estimate final flyout height so we can clamp it inside the viewport.
      const estimatedHeight =
        navigableItems.length * ESTIMATED_ITEM_HEIGHT +
        POPOVER_PADDING * 2;
      const availableHeight = window.innerHeight - POPOVER_PADDING * 2;
      const popoverHeight = Math.min(estimatedHeight, availableHeight);

      let top = triggerRect.top;
      if (top + popoverHeight > window.innerHeight - POPOVER_PADDING) {
        top = window.innerHeight - popoverHeight - POPOVER_PADDING;
      }
      top = Math.max(POPOVER_PADDING, top);

      const left = triggerRect.right + POPOVER_GAP;

      setPopoverState({
        isOpen: true,
        menuId: menuItem.id,
        position: { top, left },
        items: navigableItems,
        parentLabel: menuItem.label,
      });
    },
    [isAllowed],
  );

  const handlePopoverNavigate = useCallback(
    (item: SidebarSubMenuItem) => {
      handleNavClick(item);
      closePopover();
    },
    [closePopover, handleNavClick],
  );

  useEffect(() => {
    if (!popoverState.isOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const popoverEl = popoverRef.current;
      const sidebarEl = sidebarRef.current;
      const target = event.target as Node;

      if (
        popoverEl &&
        !popoverEl.contains(target) &&
        sidebarEl &&
        !sidebarEl.contains(target)
      ) {
        closePopover();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopover();
      }
    };

    const handleResize = () => {
      closePopover();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [closePopover, popoverState.isOpen]);

  useEffect(() => {
    if (!isCollapsed && popoverState.isOpen) {
      closePopover();
    }
  }, [closePopover, isCollapsed, popoverState.isOpen]);

  useEffect(() => {
    if (popoverState.isOpen && currentView !== lastViewRef.current) {
      closePopover();
    }
    lastViewRef.current = currentView;
  }, [closePopover, currentView, popoverState.isOpen]);

  const setTriggerRef = useCallback(
    (id: string) => (node: HTMLButtonElement | null) => {
      triggerRefs.current[id] = node;
    },
    [],
  );

  // Render menu item component
  const renderSubMenuItem = (
    subItem: MenuItem,
    depth = 0,
  ): React.ReactNode => {
    if (!hasVisibleAccess(subItem, isAllowed)) {
      return null;
    }

    const visibleChildren =
      subItem.subItems
        ?.filter((child) => hasVisibleAccess(child, isAllowed))
      ?? [];
    const hasNested = visibleChildren.length > 0;
    const isExpanded = expandedSections.has(subItem.id);
    const childActive = hasNested
      ? visibleChildren.some((child) => itemContainsView(child, currentView))
      : false;
    const isActive =
      isViewMatch(subItem.view, currentView) ||
      childActive;

    return (
      <div key={subItem.id} className="flex flex-col">
        <button
          onClick={() => {
            if (hasNested && subItem.expandable) {
              toggleSection(subItem.id);
            } else if (subItem.view) {
              handleNavClick(subItem);
            }
          }}
          style={{ marginLeft: depth > 0 ? depth * 12 : undefined }}
          className={`group flex w-full items-center gap-3 rounded-md border-l-2 px-5 py-2 text-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${isActive
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-200'
              : 'border-transparent text-gray-600 hover:translate-x-1 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700/80 dark:hover:text-white'
            }`}
          aria-expanded={hasNested ? isExpanded : undefined}
          aria-haspopup={hasNested ? 'true' : undefined}
        >
          <subItem.icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left transition-all duration-200">
            {subItem.label}
          </span>
          {hasNested && subItem.expandable && (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                }`}
            />
          )}
        </button>
        {hasNested && subItem.expandable && (
          <div
            className={`ml-4 flex flex-col gap-1 transition-all duration-300 ease-in-out ${isExpanded
                ? 'mt-2 overflow-x-hidden opacity-100'
                : 'pointer-events-none max-h-0 overflow-hidden opacity-0'
              }`}
          >
            {visibleChildren.map((child) => renderSubMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isActive = isActiveItem(item);
    const isExpanded = expandedSections.has(item.id);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isPopoverActive =
      popoverState.isOpen && popoverState.menuId === item.id;
    const dividerClass =
      hasSubItems && index > 0
        ? 'mt-3 border-t border-gray-200/70 pt-3 dark:border-gray-700/70'
        : '';

    return (
      <div
        key={item.id}
        className={`flex flex-col ${dividerClass} ${isCollapsed ? 'mb-2' : 'mb-3'}`}
      >
        <button
          ref={setTriggerRef(item.id)}
          onClick={() => {
            if (hasSubItems && item.expandable) {
              if (isCollapsed) {
                if (isPopoverActive) {
                  closePopover();
                } else {
                  openPopover(item);
                }
              } else {
                toggleSection(item.id);
              }
            } else if (item.view) {
              handleNavClick(item);
            }
          }}
          className={`group flex w-full items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${isCollapsed ? '' : 'rounded-lg'} ${isActive
            ? 'rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/80 dark:hover:text-white'
            } ${!isCollapsed ? 'transform hover:translate-x-1' : ''}`}
          title={isCollapsed ? item.label : undefined}
          aria-expanded={
            hasSubItems
              ? isCollapsed
                ? isPopoverActive
                : isExpanded
              : undefined
          }
          aria-haspopup={hasSubItems ? 'true' : undefined}
          aria-controls={hasSubItems ? `popover-${item.id}` : undefined}
        >
          <item.icon
            className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${isCollapsed ? '' : 'text-inherit'}`}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left transition-all duration-200">
                {item.label}
              </span>
              {hasSubItems && item.expandable && (
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                    }`}
                />
              )}
            </>
          )}
        </button>

        {/* Sub-items */}
        {!isCollapsed && hasSubItems && item.expandable && (
          <div
            className={`mt-2 flex flex-col gap-1 transition-all duration-300 ease-in-out ${isExpanded
                ? 'overflow-x-hidden opacity-100'
                : 'pointer-events-none max-h-0 overflow-hidden opacity-0'
              }`}
          >
            {item.subItems
              ?.filter((subItem) => hasVisibleAccess(subItem, isAllowed))
              .map((subItem) => renderSubMenuItem(subItem))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={sidebarRef}
      className={`${isCollapsed ? 'w-16' : 'w-[360px]'} flex-shrink-0 bg-white dark:bg-gray-800 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out relative shadow-sm`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-4 top-6 z-20 w-8 h-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Header */}
      <div
        className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-gray-100 dark:border-gray-700 transition-all duration-300`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 14 14"
              className="text-white"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.673.834a.75.75 0 0 0-1.085.796l.168.946q-.676.14-1.369.173c-.747-.004-1.315-.287-2.041-.665l-.04-.02c-.703-.366-1.564-.814-2.71-.814h-.034A10.4 10.4 0 0 0 .416 2.328a.75.75 0 1 0 .668 1.343a8.9 8.9 0 0 1 3.529-.921c.747.004 1.315.287 2.041.665l.04.02c.703.366 1.564.815 2.71.815l.034-.001a10.3 10.3 0 0 0 4.146-1.078a.75.75 0 0 0 .338-1.005a.75.75 0 0 0-.334-.336zM4.562 5.751l.034-.001c1.146 0 2.007.448 2.71.814l.04.02c.726.378 1.294.662 2.041.666q.707-.034 1.398-.18l-.192-.916a.75.75 0 0 1 1.08-.82l1.915.996a.747.747 0 0 1 .36.943a.75.75 0 0 1-.364.399a10.5 10.5 0 0 1-1.705.668a10.3 10.3 0 0 1-2.475.41c-1.146 0-2.007-.448-2.71-.814l-.04-.02c-.726-.378-1.294-.662-2.041-.666a8.9 8.9 0 0 0-3.53.922a.75.75 0 1 1-.667-1.344a10.4 10.4 0 0 1 4.146-1.077m0 4.5h.034c1.146 0 2.007.448 2.71.814l.04.02c.726.378 1.294.661 2.041.665a9 9 0 0 0 1.402-.18l-.195-.912a.75.75 0 0 1 1.079-.823l1.915.996a.747.747 0 0 1 .36.942a.75.75 0 0 1-.364.4a10.4 10.4 0 0 1-4.18 1.078c-1.146 0-2.007-.449-2.71-.815l-.04-.02c-.726-.378-1.294-.661-2.041-.665a8.9 8.9 0 0 0-3.53.921a.75.75 0 1 1-.667-1.343a10.4 10.4 0 0 1 4.146-1.078"
                clipRule="evenodd"
              />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                CFS Platform
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Management System
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <nav
          className={`${isCollapsed ? 'px-2' : 'px-4'} transition-all duration-300`}
        >
          {filterItems(menuConfig).map((item, index) => renderMenuItem(item, index))}
        </nav>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {`version ${pkg.version ?? '0.0.0'}`}
          </div>
        </div>
      )}
      <MenuPopover
        isOpen={popoverState.isOpen}
        menuId={popoverState.menuId}
        items={popoverState.items}
        position={popoverState.position}
        parentLabel={popoverState.parentLabel}
        activeView={currentView}
        popoverRef={popoverRef}
        onClose={closePopover}
        onNavigate={handlePopoverNavigate}
      />
    </div>
  );
};

export default Sidebar;
