import React from 'react';
import { Shield, Users, UserCog, Settings, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { UserManagement } from '@/features/users/components';
import { RoleManagement } from '@/features/auth/components';

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    'users' | 'roles' | 'settings'
  >('users');
  const [searchTerm, setSearchTerm] = React.useState('');

  // Redirect if not admin
  if (!isAdmin()) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this admin panel.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'users' as const,
      label: 'User Management',
      icon: Users,
      description: 'Manage users, roles, and permissions',
    },
    {
      id: 'roles' as const,
      label: 'Role Management',
      icon: UserCog,
      description: 'Configure roles and permissions',
    },
    {
      id: 'settings' as const,
      label: 'System Settings',
      icon: Settings,
      description: 'System configuration and settings',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'settings':
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                System Settings
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                System settings panel coming soon...
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header with search */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search admin functions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
        {/* Tabs */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                  title={tab.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default AdminPanel;
