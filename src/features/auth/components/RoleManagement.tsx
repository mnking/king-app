import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { apiFetch } from '@/shared/utils/api-client';

interface Permission {
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

const RoleManagement = () => {
  const { isAdmin } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const roles = ['admin', 'manager', 'member', 'viewer'];
  const resources = ['users', 'teams', 'projects', 'tasks', 'settings'];
  const actions = ['create', 'read', 'update', 'delete', 'manage'];

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/roles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load permissions: ${response.statusText}`);
      }

      const permissions = await response.json();
      setRolePermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    role: string,
    resource: string,
    action: string,
    allowed: boolean,
  ) => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/roles/${role}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource, action, allowed }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update permission: ${response.statusText}`);
      }

      // Update local state on successful API call
      setRolePermissions((prev) => {
        const existing = prev.find(
          (p) =>
            p.role === role && p.resource === resource && p.action === action,
        );
        if (existing) {
          return prev.map((p) =>
            p.role === role && p.resource === resource && p.action === action
              ? { ...p, allowed }
              : p,
          );
        } else {
          return [...prev, { role, resource, action, allowed }];
        }
      });
    } catch (error) {
      console.error('Error updating permission:', error);
    } finally {
      setSaving(false);
    }
  };

  const getPermission = (role: string, resource: string, action: string) => {
    const permission = rolePermissions.find(
      (p) => p.role === role && p.resource === resource && p.action === action,
    );
    return permission?.allowed || false;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'member':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'viewer':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Access denied. Admin privileges required.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading role permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header with search */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search roles and permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Role Management
          </span>
          {saving && (
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 ml-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
        <div className="flex-1 overflow-auto">
          {/* Role Overview */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {roles.map((role) => (
                <div
                  key={role}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role)}`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {role === 'admin' &&
                      'Full system access and user management'}
                    {role === 'manager' &&
                      'Team and project management capabilities'}
                    {role === 'member' && 'Standard user with task management'}
                    {role === 'viewer' && 'Read-only access to most content'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="flex-1 overflow-auto p-6 min-h-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                        Resource / Action
                      </th>
                      {roles.map((role) => (
                        <th
                          key={role}
                          className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                        >
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role)}`}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource, resourceIndex) => (
                      <React.Fragment key={resource}>
                        <tr
                          className={`${resourceIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}
                        >
                          <td
                            colSpan={roles.length + 1}
                            className="py-2 px-4 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
                          >
                            {resource.charAt(0).toUpperCase() +
                              resource.slice(1)}
                          </td>
                        </tr>
                        {actions.map((action) => {
                          // Skip 'manage' action for non-settings resources
                          if (action === 'manage' && resource !== 'settings')
                            return null;
                          // Skip CRUD actions for settings resource
                          if (resource === 'settings' && action !== 'manage')
                            return null;

                          return (
                            <tr
                              key={`${resource}-${action}`}
                              className={`${resourceIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                            >
                              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                                <span className="ml-4">
                                  {action.charAt(0).toUpperCase() +
                                    action.slice(1)}
                                </span>
                              </td>
                              {roles.map((role) => (
                                <td
                                  key={role}
                                  className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                                >
                                  <button
                                    onClick={() =>
                                      updatePermission(
                                        role,
                                        resource,
                                        action,
                                        !getPermission(role, resource, action),
                                      )
                                    }
                                    disabled={saving}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
                                      getPermission(role, resource, action)
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                    } disabled:opacity-50`}
                                    title={`${getPermission(role, resource, action) ? 'Allowed' : 'Denied'} - Click to toggle`}
                                  >
                                    {getPermission(role, resource, action) ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mx-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Permission Legend
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Create:
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  Add new items
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Read:
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  View existing items
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Update:
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  Modify existing items
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Delete:
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  Remove items
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Manage:
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  Full administrative access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
