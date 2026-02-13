import React, { useState, useMemo } from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Search, User, X } from 'lucide-react';
import { FormField } from './FormField';
import type { User as UserType } from '@/services/apiUsers';

interface FormUserSelectProps<T extends FieldValues>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'name'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  users: UserType[];
  multiple?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
}

export const FormUserSelect = <T extends FieldValues>({
  name,
  control,
  label,
  required = false,
  placeholder = 'Select user(s)...',
  className = '',
  users,
  multiple = false,
  disabled = false,
  allowClear = true,
  searchPlaceholder = 'Search users...',
  ...divProps
}: FormUserSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const searchLower = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.job_title?.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower),
    );
  }, [users, searchTerm]);

  const getUserDisplayName = (user: UserType) => {
    return user.full_name || user.email;
  };

  const getUserAvatar = (user: UserType) => {
    if (user.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={getUserDisplayName(user)}
          className="w-6 h-6 rounded-full object-cover"
        />
      );
    }

    const initials = getUserDisplayName(user)
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-medium">{initials}</span>
      </div>
    );
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedUsers = multiple
          ? (field.value || [])
              .map((id: string) => users.find((u) => u.id === id))
              .filter(Boolean)
          : field.value
            ? [users.find((u) => u.id === field.value)].filter(Boolean)
            : [];

        const handleUserSelect = (user: UserType) => {
          if (multiple) {
            const currentIds = field.value || [];
            const isSelected = currentIds.includes(user.id);

            if (isSelected) {
              field.onChange(currentIds.filter((id: string) => id !== user.id));
            } else {
              field.onChange([...currentIds, user.id]);
            }
          } else {
            field.onChange(user.id);
            setIsOpen(false);
          }
        };

        const handleRemoveUser = (userId: string) => {
          if (multiple) {
            const currentIds = field.value || [];
            field.onChange(currentIds.filter((id: string) => id !== userId));
          } else {
            field.onChange('');
          }
        };

        const handleClear = () => {
          field.onChange(multiple ? [] : '');
        };

        return (
          <FormField
            label={label}
            error={error}
            required={required}
            className={className}
          >
            <div className="relative" {...divProps}>
              {/* Selected Users Display */}
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
                {selectedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-sm"
                      >
                        {getUserAvatar(user)}
                        <span>{getUserDisplayName(user)}</span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveUser(user.id);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                    <span>{placeholder}</span>
                    <Search className="h-4 w-4" />
                  </div>
                )}

                {/* Clear Button */}
                {allowClear && selectedUsers.length > 0 && !disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-sm bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* User List */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const isSelected = multiple
                          ? (field.value || []).includes(user.id)
                          : field.value === user.id;

                        return (
                          <div
                            key={user.id}
                            className={`
                              flex items-center space-x-3 px-3 py-2 cursor-pointer transition-colors
                              ${
                                isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                              }
                            `}
                            onClick={() => handleUserSelect(user)}
                          >
                            {getUserAvatar(user)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {getUserDisplayName(user)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </div>
                              {user.job_title && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                  {user.job_title}
                                  {user.department
                                    ? ` • ${user.department}`
                                    : ''}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="text-blue-600 dark:text-blue-400">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {searchTerm
                          ? 'No users match your search'
                          : 'No users available'}
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

export default FormUserSelect;
