import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  Users,
  UserCog,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  Sun,
  Moon,
} from 'lucide-react';
import { UserSettings } from '@/features/auth/components';
import { useAuth } from '@/features/auth/useAuth';
import { getPageMetadata, type ViewType } from '@/config/routes.config';
import { useTheme } from '@/contexts/ThemeContext';

interface TopNavigationProps {
  currentView: string;
  onViewChange: (view: ViewType) => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { profile, signOut, utils, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setProfileMenuOpen(false);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Get page metadata for current view
  const pageMetadata = getPageMetadata(currentView as ViewType);
  const PageIcon = pageMetadata.icon;

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* View Title - Dynamic based on page metadata */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <PageIcon className="h-6 w-6" />
                <span>{pageMetadata.title}</span>
              </h1>
              {pageMetadata.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {pageMetadata.description}
                  {currentView === 'dashboard' &&
                    ` - Welcome back, ${profile?.full_name || user?.username || 'User'}!`}
                </p>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Management View Toggle - Only show for users/teams */}
            {(currentView === 'users' || currentView === 'teams') && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => onViewChange('users')}
                  className={`p-2 rounded transition-colors ${
                    currentView === 'users'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="User Management"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewChange('teams')}
                  className={`p-2 rounded transition-colors ${
                    currentView === 'teams'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Team Management"
                >
                  <UserCog className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Dashboard View Toggle */}
            {currentView === 'dashboard' && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => onViewChange('dashboard')}
                  className="p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transition-colors"
                  title="Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              aria-label="Toggle theme"
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium leading-none">
                        {profile
                          ? utils.getUserInitials(profile.full_name || '')
                          : 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium hidden md:block">
                    {profile ? utils.getDisplayName(profile) : user?.username || 'User'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSettingsOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UserSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

export default TopNavigation;
