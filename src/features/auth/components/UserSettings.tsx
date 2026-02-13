import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  Bell,
  Palette,
  Globe,
  Clock,
  Camera,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    preferences,
    updateProfile,
    updatePreferences,
    uploadAvatar,
    updatePassword,
    utils,
  } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    timezone: 'UTC',
  });

  const [preferencesData, setPreferencesData] = useState({
    language: 'en',
    notifications: {
      email_notifications: true,
      push_notifications: true,
      task_reminders: true,
      project_updates: true,
      team_mentions: true,
      weekly_digest: true,
    },
    working_hours: {
      start_time: '09:00',
      end_time: '17:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      break_duration: 60,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Initialize form data when profile/preferences change
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        timezone: profile.timezone || 'UTC',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (preferences) {
      setPreferencesData({
        language: preferences.language || 'en',
        notifications: preferences.notifications || {
          email_notifications: true,
          push_notifications: true,
          task_reminders: true,
          project_updates: true,
          team_mentions: true,
          weekly_digest: true,
        },
        working_hours: preferences.working_hours || {
          start_time: '09:00',
          end_time: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          break_duration: 60,
        },
      });
    }
  }, [preferences]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      await updateProfile(profileData);
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        language: preferencesData.language,
        notifications: preferencesData.notifications,
        working_hours: preferencesData.working_hours,
      });
      showMessage('success', 'Preferences updated successfully!');
    } catch (error) {
      console.error('Error updating preferences:', error);
      showMessage('error', 'Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size must be less than 5MB.');
      return;
    }

    setAvatarLoading(true);
    try {
      await uploadAvatar(file);
      showMessage('success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showMessage('error', 'Failed to upload avatar. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters long.');
      return;
    }

    if (!passwordData.currentPassword) {
      showMessage('error', 'Current password is required.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      if (error) {
        throw error;
      }
      showMessage('success', 'Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update password. Please check your current password.';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key: string) => {
    setPreferencesData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications],
      },
    }));
  };

  const handleWorkingDayToggle = (day: string) => {
    setPreferencesData((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        days: prev.working_hours.days.includes(day)
          ? prev.working_hours.days.filter((d) => d !== day)
          : [...prev.working_hours.days, day],
      },
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
  ];

  const weekDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Profile Information
                  </h3>

                  {/* Avatar Section */}
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-gray-200 dark:border-gray-600">
                          <span className="text-white text-xl font-medium">
                            {profile
                              ? utils.getUserInitials(profile.full_name)
                              : '?'}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarLoading}
                        className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {avatarLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {profile?.full_name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile?.job_title}{' '}
                        {profile?.department && `• ${profile.department}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile?.email}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Click the camera icon to change your avatar
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <User className="inline h-4 w-4 mr-1" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Briefcase className="inline h-4 w-4 mr-1" />
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={profileData.job_title}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          job_title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Timezone
                    </label>
                    <select
                      value={profileData.timezone}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          timezone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleProfileSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                    Language Preferences
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Language
                    </label>
                    <select
                      value={preferencesData.language}
                      onChange={(e) =>
                        setPreferencesData((prev) => ({
                          ...prev,
                          language: e.target.value,
                        }))
                      }
                      className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                    Working Hours
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={preferencesData.working_hours.start_time}
                        onChange={(e) =>
                          setPreferencesData((prev) => ({
                            ...prev,
                            working_hours: {
                              ...prev.working_hours,
                              start_time: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={preferencesData.working_hours.end_time}
                        onChange={(e) =>
                          setPreferencesData((prev) => ({
                            ...prev,
                            working_hours: {
                              ...prev.working_hours,
                              end_time: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Working Days
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {weekDays.map((day) => (
                        <label
                          key={day.value}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={preferencesData.working_hours.days.includes(
                              day.value,
                            )}
                            onChange={() => handleWorkingDayToggle(day.value)}
                            className="text-blue-600 focus:ring-blue-500 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {day.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Break Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="240"
                      value={preferencesData.working_hours.break_duration}
                      onChange={(e) =>
                        setPreferencesData((prev) => ({
                          ...prev,
                          working_hours: {
                            ...prev.working_hours,
                            break_duration: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handlePreferencesSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Choose how you want to be notified about updates and
                    activities.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: 'email_notifications',
                      label: 'Email Notifications',
                      desc: 'Receive notifications via email',
                    },
                    {
                      key: 'push_notifications',
                      label: 'Push Notifications',
                      desc: 'Receive push notifications in browser',
                    },
                    {
                      key: 'task_reminders',
                      label: 'Task Reminders',
                      desc: 'Get reminded about upcoming task deadlines',
                    },
                    {
                      key: 'project_updates',
                      label: 'Project Updates',
                      desc: 'Notifications about project changes and milestones',
                    },
                    {
                      key: 'team_mentions',
                      label: 'Team Mentions',
                      desc: 'When someone mentions you in comments or discussions',
                    },
                    {
                      key: 'weekly_digest',
                      label: 'Weekly Digest',
                      desc: 'Weekly summary of your activities and progress',
                    },
                  ].map((notification) => (
                    <div
                      key={notification.key}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.label}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                          {notification.desc}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            preferencesData.notifications[
                              notification.key as keyof typeof preferencesData.notifications
                            ]
                          }
                          onChange={() =>
                            handleNotificationToggle(notification.key)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handlePreferencesSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Security Settings
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Manage your account security and password settings.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Change Password</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              current: !prev.current,
                            }))
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              new: !prev.new,
                            }))
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Password must be at least 6 characters long
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              confirm: !prev.confirm,
                            }))
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      disabled={
                        loading ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword
                      }
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      <span>Update Password</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Account Information</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Role:
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white capitalize">
                        {profile?.role}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Account Status:
                      </span>
                      <div
                        className={`font-medium ${profile?.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {profile?.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Account Created:
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Last Login:
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {profile?.last_login
                          ? new Date(profile.last_login).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
