import React, { useState } from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Shield, ChevronDown, X, Info } from 'lucide-react';
import { FormField } from './FormField';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  level: 'admin' | 'manager' | 'user' | 'viewer';
  permissions?: Permission[];
  is_system?: boolean;
}

interface FormRoleSelectProps<T extends FieldValues>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  roles: Role[];
  disabled?: boolean;
  allowClear?: boolean;
  showPermissions?: boolean;
  showDescription?: boolean;
  filterByLevel?: string[];
}

const ROLE_LEVEL_COLORS = {
  admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  manager:
    'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  user: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  viewer: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
};

const ROLE_LEVEL_ICONS = {
  admin: '👑',
  manager: '🔑',
  user: '👤',
  viewer: '👀',
};

export const FormRoleSelect = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder = 'Select role...',
  className = '',
  roles,
  disabled = false,
  allowClear = true,
  showPermissions = true,
  showDescription = true,
  filterByLevel,
  ...divProps
}: FormRoleSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Filter roles by level if specified
  const filteredRoles =
    filterByLevel && filterByLevel.length > 0
      ? roles.filter((role) => filterByLevel.includes(role.level))
      : roles;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedRole = roles.find((role) => role.id === field.value);

        const handleRoleSelect = (role: Role) => {
          field.onChange(role.id);
          setIsOpen(false);
          setExpandedRole(null);
        };

        const handleClear = () => {
          field.onChange('');
        };

        const togglePermissions = (roleId: string, e: React.MouseEvent) => {
          e.stopPropagation();
          setExpandedRole(expandedRole === roleId ? null : roleId);
        };

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div className="relative" {...divProps}>
              {/* Selected Role Display */}
              <div
                className={`
                  min-h-[2.5rem] px-3 py-2 border rounded-lg cursor-pointer
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}
                  ${
                    error
                      ? 'border-red-300 focus-within:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
              >
                {selectedRole ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">{selectedRole.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_LEVEL_COLORS[selectedRole.level]}`}
                      >
                        <span className="mr-1">
                          {ROLE_LEVEL_ICONS[selectedRole.level]}
                        </span>
                        {selectedRole.level}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {allowClear && !disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                    <span>{placeholder}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {filteredRoles.length > 0 ? (
                      filteredRoles.map((role) => {
                        const isSelected = field.value === role.id;
                        const isExpanded = expandedRole === role.id;

                        return (
                          <div
                            key={role.id}
                            className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                          >
                            <div
                              className={`
                                flex items-center justify-between px-3 py-3 cursor-pointer transition-colors
                                ${
                                  isSelected
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                                }
                              `}
                              onClick={() => handleRoleSelect(role)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Shield className="h-5 w-5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium truncate">
                                      {role.name}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_LEVEL_COLORS[role.level]}`}
                                    >
                                      <span className="mr-1">
                                        {ROLE_LEVEL_ICONS[role.level]}
                                      </span>
                                      {role.level}
                                    </span>
                                    {role.is_system && (
                                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs">
                                        System
                                      </span>
                                    )}
                                  </div>
                                  {showDescription && role.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                      {role.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {showPermissions &&
                                  role.permissions &&
                                  role.permissions.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        togglePermissions(role.id, e)
                                      }
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                      title="View permissions"
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  )}
                                {isSelected && (
                                  <div className="text-blue-600 dark:text-blue-400">
                                    <Shield className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Permissions Expansion */}
                            {isExpanded &&
                              showPermissions &&
                              role.permissions &&
                              role.permissions.length > 0 && (
                                <div className="px-3 pb-3 bg-gray-50 dark:bg-gray-900/50">
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Permissions ({role.permissions.length})
                                  </div>
                                  <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                                    {role.permissions.map((permission) => (
                                      <div
                                        key={permission.id}
                                        className="flex items-center justify-between text-xs"
                                      >
                                        <span className="text-gray-600 dark:text-gray-400 truncate">
                                          {permission.name}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-500 ml-2 font-mono">
                                          {permission.resource}:
                                          {permission.action}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No roles available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Click outside to close */}
            {isOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            )}
          </FormField>
        );
      }}
    />
  );
};

export default FormRoleSelect;
