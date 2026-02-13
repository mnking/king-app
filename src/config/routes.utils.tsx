/* eslint-disable react-refresh/only-export-components */
import { Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/shared/components';
import type { RouteConfig } from './routes.config';
import type { Permission } from '@/config/rbac/permissions';

/**
 * Loading component for Suspense fallback
 */
const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

/**
 * Generate React Router route objects from route configuration
 * Automatically wraps routes with ProtectedRoute and Suspense
 */
export function generateRoutes(config: RouteConfig[]): RouteObject[] {
  const routes: RouteObject[] = [];

  const processRoute = (routeConfig: RouteConfig): RouteObject | null => {
    // Skip routes without path (menu groups only)
    if (!routeConfig.path || !routeConfig.component) {
      return null;
    }

    const Component = routeConfig.component;

    // Wrap component with ProtectedRoute and Suspense
    const element = (
      <ProtectedRoute
        requiredRole={routeConfig.requiredRole}
        requiredPermissions={routeConfig.requiredPermissions}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    );

    return {
      path: routeConfig.path,
      element,
    };
  };

  // Process all routes including nested children
  const processConfigArray = (configArray: RouteConfig[]) => {
    configArray.forEach((routeConfig) => {
      // Process parent route if it has a path and component
      const route = processRoute(routeConfig);
      if (route) {
        routes.push(route);
      }

      // Recursively process children
      if (routeConfig.children) {
        processConfigArray(routeConfig.children);
      }
    });
  };

  processConfigArray(config);

  return routes;
}

/**
 * MenuItem interface for Sidebar
 */
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  view: string | null;
  permission?: boolean;
  menuPermissions?: Permission[];
  requiredPermissions?: Permission[];
  subItems?: MenuItem[];
  expandable?: boolean;
}

/**
 * Generate menu structure for Sidebar from route configuration
 * Filters routes based on showInMenu and permission properties
 */
export function generateMenu(config: RouteConfig[]): MenuItem[] {
  const processRoute = (routeConfig: RouteConfig): MenuItem => {
    const menuItem: MenuItem = {
      id: routeConfig.id,
      label: routeConfig.label,
      icon: routeConfig.icon,
      view: routeConfig.path,
      permission: routeConfig.permission,
      menuPermissions: routeConfig.menuPermissions ?? routeConfig.requiredPermissions,
      requiredPermissions: routeConfig.requiredPermissions,
    };

    if (routeConfig.children && routeConfig.children.length > 0) {
      const childItems = routeConfig.children
        .filter((child) => child.showInMenu !== false && child.permission !== false)
        .map(processRoute);

      if (childItems.length > 0) {
        menuItem.expandable = true;
        menuItem.subItems = childItems as MenuItem[];
      }
    }

    return menuItem;
  };

  return config
    .filter((routeConfig) => routeConfig.showInMenu !== false && routeConfig.permission !== false)
    .map(processRoute);
}
