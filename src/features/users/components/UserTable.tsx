import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Crown,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Users,
} from 'lucide-react';
import EntityTable, {
  EntityColumn,
  EntityAction,
  BulkAction,
  BulkField,
} from '@/shared/components/EntityTable';
import { useUsers } from '@/features/users/useUsers';
import type { User } from '@/services/apiUsers';
import type { UserRole } from '@/shared/types/roles';
import { useAuth } from '@/features/auth/useAuth';
import { UserFormModal } from './UserFormModal';
import { UserCreateForm, UserUpdateForm } from '../schemas/user-schemas';

interface UserTableProps {
  className?: string;
}

const UserTable: React.FC<UserTableProps> = ({ className = '' }) => {
  const { hasPermission } = useAuth();
  const {
    entities: users,
    loading,
    error,
    createEntity: createUser,
    updateEntity: updateUser,
    deleteEntity: deleteUser,
    bulkDelete,
    refetch,
  } = useUsers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [permissions, setPermissions] = useState({
    create: false,
    update: false,
    delete: false,
  });

  // Load permissions
  useEffect(() => {
    const loadPermissions = async () => {
      const [create, update, deletePermission] = await Promise.all([
        hasPermission('users', 'create'),
        hasPermission('users', 'update'),
        hasPermission('users', 'delete'),
      ]);
      setPermissions({ create, update, delete: deletePermission });
    };
    loadPermissions();
  }, [hasPermission]);

  // Helper functions
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'manager':
        return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <UserIcon className="h-4 w-4 text-green-600" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'manager':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'member':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Table columns configuration
  const columns: EntityColumn<User>[] = [
    {
      key: 'full_name',
      label: 'User',
      searchable: true,
      sortable: true,
      render: (user) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || user.email}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user.full_name || user.email)
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {user.full_name || user.email}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </div>
            {user.job_title && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {user.job_title}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => (
        <div className="flex items-center space-x-2">
          {getRoleIcon(user.role)}
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}
          >
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {user.department || 'Not assigned'}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      sortable: true,
      render: (user) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="h-3 w-3" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
            user.is_active
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}
        >
          {user.is_active ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'last_seen',
      label: 'Last Login',
      sortable: true,
      render: (user) => (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{user.last_seen ? formatDate(user.last_seen) : 'Never'}</span>
        </div>
      ),
    },
  ];

  // Table actions configuration
  const actions: EntityAction<User>[] = [
    {
      key: 'view',
      label: 'View User',
      icon: <Eye className="h-4 w-4" />,
      onClick: (user: User) => {
        setSelectedUser(user);
        setModalMode('view');
        setIsModalOpen(true);
      },
    },
    ...(permissions.update
      ? [
          {
            key: 'edit',
            label: 'Edit User',
            icon: <Edit3 className="h-4 w-4" />,
            onClick: (user: User) => {
              setSelectedUser(user);
              setModalMode('edit');
              setIsModalOpen(true);
            },
          },
        ]
      : []),
    {
      key: 'toggle_status',
      label: 'Toggle Status',
      icon: <EyeOff className="h-4 w-4" />,
      onClick: async (user: User) => {
        const action = user.is_active ? 'deactivate' : 'activate';
        const newStatus = !user.is_active;
        if (
          window.confirm(
            `Are you sure you want to ${action} "${user.full_name || user.email}"?`,
          )
        ) {
          try {
            await updateUser(user.id, { is_active: newStatus });
            // Force UI refresh to show the changes
            await refetch();
          } catch (error) {
            alert(
              `Error ${action}ing user: ` +
                (error instanceof Error ? error.message : 'Unknown error'),
            );
          }
        }
      },
    },
    ...(permissions.delete
      ? [
          {
            key: 'delete',
            label: 'Delete User',
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'destructive' as const,
            onClick: async (user: User) => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${user.full_name || user.email}"? This action cannot be undone.`,
                )
              ) {
                const result = await deleteUser(user.id);
                if (result.error) {
                  alert('Error deleting user: ' + result.error.message);
                }
              }
            },
          },
        ]
      : []),
  ];

  // Bulk fields configuration for dynamic updates
  const bulkFields: BulkField<User>[] = [
    ...(permissions.update
      ? [
          {
            key: 'role',
            label: 'Role',
            placeholder: 'Select role',
            options: [
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'user', label: 'User' },
              { value: 'viewer', label: 'Viewer' },
            ],
            onUpdate: async (selectedIds: string[], value: string) => {
              try {
                // Process each update individually to handle errors properly
                const updatePromises = selectedIds.map(async (id) => {
                  try {
                    const result = await updateUser(id, {
                      role: value as UserRole,
                    });
                    return { id, success: true, data: result };
                  } catch (error) {
                    return { id, success: false, error };
                  }
                });

                const results = await Promise.all(updatePromises);
                const errors = results.filter((result) => !result.success);

                if (errors.length > 0) {
                  alert(
                    `Error updating ${errors.length} out of ${selectedIds.length} users.`,
                  );
                } else {
                  // Force UI refresh to show the changes
                  await refetch();
                }
              } catch {
                alert('Failed to update user roles. Please try again.');
              }
            },
          },
        ]
      : []),
    ...(permissions.update
      ? [
          {
            key: 'is_active',
            label: 'Status',
            placeholder: 'Select status',
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ],
            onUpdate: async (selectedIds: string[], value: string) => {
              try {
                // Process each update individually to handle errors properly
                const updatePromises = selectedIds.map(async (id) => {
                  try {
                    const result = await updateUser(id, {
                      is_active: value === 'true',
                    });
                    return { id, success: true, data: result };
                  } catch (error) {
                    return { id, success: false, error };
                  }
                });

                const results = await Promise.all(updatePromises);
                const errors = results.filter((result) => !result.success);

                if (errors.length > 0) {
                  alert(
                    `Error updating ${errors.length} out of ${selectedIds.length} users.`,
                  );
                } else {
                  // Force UI refresh to show the changes
                  await refetch();
                }
              } catch {
                alert('Failed to update user status. Please try again.');
              }
            },
          },
        ]
      : []),
  ];

  // Bulk actions configuration
  const bulkActions: BulkAction[] = [
    ...(permissions.delete
      ? [
          {
            key: 'bulk_delete',
            label: 'Delete Selected',
            variant: 'destructive' as const,
            onClick: async (selectedIds: string[]) => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${selectedIds.length} selected users? This action cannot be undone.`,
                )
              ) {
                const results = await bulkDelete(selectedIds);
                const errors = results.filter((result) => result.error);
                if (errors.length > 0) {
                  alert(`Error deleting ${errors.length} users`);
                }
              }
            },
          },
        ]
      : []),
  ];

  // Handle create new user
  const handleCreateNew = () => {
    // First ensure modal is closed and state is reset
    setIsModalOpen(false);
    // Use setTimeout to ensure state updates are completed before opening
    setTimeout(() => {
      setSelectedUser(null);
      setModalMode('create');
      setIsModalOpen(true);
    }, 0);
  };

  // Handle save user (create or update)
  const handleSaveUser = async (data: UserCreateForm | UserUpdateForm) => {
    try {
      if (modalMode === 'create') {
        // Create new user
        await createUser(data as UserCreateForm);
      } else if (modalMode === 'edit' && selectedUser) {
        // Update existing user
        await updateUser(selectedUser.id, data as UserUpdateForm);
      }
      // Refresh the user list
      await refetch();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Custom search filter
  const searchFilter = (user: User, searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.full_name && user.full_name.toLowerCase().includes(term)) ||
      user.email.toLowerCase().includes(term) ||
      (user.department && user.department.toLowerCase().includes(term)) ||
      (user.job_title && user.job_title.toLowerCase().includes(term)) ||
      user.role.toLowerCase().includes(term)
    );
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${className}`}>
      {/* Content Area */}
      <div className="flex-1 px-6 py-4 min-h-0 flex flex-col">
        <EntityTable
          entities={users}
          loading={loading}
          error={error}
          entityName="user"
          entityNamePlural="users"
          getId={(user) => user.id}
          columns={columns}
          actions={actions}
          bulkActions={bulkActions}
          bulkFields={bulkFields}
          searchPlaceholder="Search users by name, email, department, or role..."
          searchFilter={searchFilter}
          onCreateNew={permissions.create ? handleCreateNew : undefined}
          canCreate={permissions.create}
          canEdit={permissions.update}
          canDelete={permissions.delete}
          canBulkEdit={permissions.update || permissions.delete}
          emptyStateMessage="No users found"
          emptyStateIcon={<Users className="h-16 w-16 text-gray-400" />}
        />
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={modalMode === 'create' ? null : selectedUser}
        mode={modalMode}
        onSave={handleSaveUser}
      />
    </div>
  );
};

export default UserTable;
