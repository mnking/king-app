import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Users,
  Crown,
  UserIcon,
  Search,
  UserPlus,
  Palette,
  Settings,
  DollarSign,
  AlertCircle,
  Info,
  Trash2,
} from 'lucide-react';
import {
  TeamCreateSchema,
  TeamUpdateSchema,
  teamFormDefaults,
  type TeamCreateForm,
  type TeamUpdateForm,
  type TeamRole,
  TeamColorEnum,
} from '../schemas/team-schemas';
import { FormInput, FormTextarea } from '@/shared/components/forms';
import type { Team } from '@/services/apiTeams';
import type { User } from '@/services/apiUsers';
import { useUsers } from '@/features/users/useUsers';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: Team | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: TeamCreateForm | TeamUpdateForm) => Promise<void>;
}

const TEAM_COLORS = TeamColorEnum.options;

export const TeamFormModal: React.FC<TeamFormModalProps> = ({
  isOpen,
  onClose,
  team,
  mode,
  onSave,
}) => {
  const { entities: availableUsers, loading: usersLoading } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'settings'>(
    'basic',
  );

  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isReadOnly = isView;
  const schema = isEdit || isView ? TeamUpdateSchema : TeamCreateSchema;

  const formMethods = useForm<TeamCreateForm | TeamUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: teamFormDefaults,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = formMethods;

  const [members, setMembers] = useState<
    Array<{ user_id: string; role: TeamRole }>
  >([]);

  const watchedColor = watch('color');
  const watchedCapacity = watch('member_capacity');

  // Initialize form with team data
  useEffect(() => {
    if (team && (isEdit || isView)) {
      const teamData = {
        name: team.name,
        description: team.description || '',
        color: team.color || '#3B82F6',
        member_capacity: 10, // Default since not in current Team interface
        budget: undefined, // Default since not in current Team interface
        is_active: true, // Default since not in current Team interface
      };
      setMembers(
        team.team_members?.map((member) => ({
          user_id: member.user_id,
          role: member.role as TeamRole,
        })) || [],
      );
      reset(teamData);
    } else {
      setMembers([]);
      reset(teamFormDefaults);
    }
    setSearchTerm('');
    setActiveTab('basic');
  }, [team, mode, isOpen, reset, isEdit, isView]);

  const onSubmit = async (data: TeamCreateForm | TeamUpdateForm) => {
    if (isReadOnly) return;

    setIsSubmitting(true);
    try {
      // Include members in the form data
      const formDataWithMembers = {
        ...data,
        members,
      };
      await onSave(formDataWithMembers);
      onClose();
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = (user: User) => {
    if (isReadOnly) return;

    const isAlreadyMember = members.some(
      (member) => member.user_id === user.id,
    );
    if (isAlreadyMember) return;

    const role: TeamRole = members.length === 0 ? 'lead' : 'member';
    setMembers((prev) => [...prev, { user_id: user.id, role }]);
  };

  const handleRemoveMember = (index: number) => {
    if (isReadOnly) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRoleToggle = (index: number) => {
    if (isReadOnly) return;

    setMembers((prev) =>
      prev.map((member, i) =>
        i === index
          ? {
              ...member,
              role: member.role === 'lead' ? 'member' : ('lead' as TeamRole),
            }
          : member,
      ),
    );
  };

  const handleColorSelect = (color: string) => {
    if (isReadOnly) return;
    setValue('color', color);
  };

  // Filter available users
  const filteredUsers = availableUsers.filter((user) => {
    const searchMatch =
      !searchTerm ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const notAlreadyMember = !members.some(
      (member) => member.user_id === user.id,
    );

    return searchMatch && notAlreadyMember;
  });

  // Get user details for members
  const getMemberUser = (userId: string) => {
    return availableUsers.find((user) => user.id === userId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  const title =
    mode === 'create'
      ? 'Create New Team'
      : mode === 'edit'
        ? 'Edit Team'
        : 'Team Details';
  const leadCount = members.filter((member) => member.role === 'lead').length;
  const isCapacityExceeded =
    watchedCapacity && members.length > watchedCapacity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Users className="h-6 w-6" />
            <span>{title}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['basic', 'members', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(tab as 'basic' | 'members' | 'settings')
                }
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'basic' && 'Basic Info'}
                {tab === 'members' && `Members (${members.length})`}
                {tab === 'settings' && 'Settings'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-6 space-y-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormInput
                      name="name"
                      control={control}
                      label="Team Name"
                      required
                      placeholder="Enter team name"
                      disabled={isReadOnly}
                    />

                    <FormTextarea
                      name="description"
                      control={control}
                      label="Description"
                      placeholder="Enter team description"
                      rows={4}
                      disabled={isReadOnly}
                    />

                    {!isReadOnly && (
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="is_active"
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <input
                              type="checkbox"
                              id="is_active"
                              disabled={isReadOnly}
                              checked={value}
                              onChange={onChange}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        />
                        <label
                          htmlFor="is_active"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Team is active
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Team Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Palette className="inline h-4 w-4 mr-1" />
                        Team Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: watchedColor }}
                        />
                        {!isReadOnly && (
                          <div className="flex flex-wrap gap-2">
                            {TEAM_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleColorSelect(color)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  watchedColor === color
                                    ? 'border-gray-900 dark:border-white scale-110'
                                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {errors.color && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.color.message}
                        </p>
                      )}
                    </div>

                    {/* Metadata (View mode only) */}
                    {isView && team && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <Info className="h-4 w-4 mr-1" />
                          Team Information
                        </h3>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">
                              Created:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {formatDate(team.created_at)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">
                              Last Updated:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {formatDate(team.updated_at)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">
                              Team ID:
                            </span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs">
                              {team.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Member Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        {members.length} members ({leadCount} lead
                        {leadCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    {watchedCapacity && (
                      <span
                        className={`text-sm ${
                          isCapacityExceeded
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        Capacity: {members.length}/{watchedCapacity}
                      </span>
                    )}
                  </div>
                  {isCapacityExceeded && (
                    <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Team exceeds capacity limit
                    </div>
                  )}
                  {leadCount === 0 && members.length > 0 && (
                    <div className="mt-2 flex items-center text-sm text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Team must have at least one lead
                    </div>
                  )}
                </div>

                {/* Current Members */}
                {members.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Current Members
                    </h3>
                    <div className="space-y-2">
                      {members.map((member, index) => {
                        const user = getMemberUser(member.user_id);

                        if (!user) return null;

                        return (
                          <div
                            key={`${member.user_id}-${index}`}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
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
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.full_name || user.email}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                                {user.job_title && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {user.job_title}
                                    {user.department
                                      ? ` • ${user.department}`
                                      : ''}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRoleToggle(index)}
                                  className={`p-2 rounded transition-colors ${
                                    member.role === 'lead'
                                      ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                      : 'text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400'
                                  }`}
                                  title={
                                    member.role === 'lead'
                                      ? 'Team Lead'
                                      : 'Make Team Lead'
                                  }
                                >
                                  {member.role === 'lead' ? (
                                    <Crown className="h-4 w-4" />
                                  ) : (
                                    <UserIcon className="h-4 w-4" />
                                  )}
                                </button>
                              )}

                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(index)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Remove Member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}

                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  member.role === 'lead'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                }`}
                              >
                                {member.role}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add Members */}
                {!isReadOnly && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                        <UserPlus className="h-5 w-5" />
                        <span>Add Members</span>
                      </h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 w-64 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto">
                      {usersLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Loading users...
                          </p>
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                            >
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
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.full_name || user.email}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.email}
                                  </div>
                                  {user.job_title && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                      {user.job_title}
                                      {user.department
                                        ? ` • ${user.department}`
                                        : ''}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddMember(user)}
                                className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {searchTerm
                              ? 'No users match your search'
                              : 'All users are already members'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Errors */}
                {errors.members && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-sm text-red-800 dark:text-red-400">
                        {errors.members.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormInput
                      name="member_capacity"
                      control={control}
                      type="number"
                      label="Member Capacity"
                      placeholder="Maximum number of members"
                      min={1}
                      max={100}
                      disabled={isReadOnly}
                    />

                    <FormInput
                      name="budget"
                      control={control}
                      type="number"
                      label="Budget"
                      placeholder="Team budget (optional)"
                      min={0}
                      step={0.01}
                      disabled={isReadOnly}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Settings className="h-4 w-4 mr-1" />
                        Team Settings
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="is_active"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <input
                                type="checkbox"
                                id="is_active_settings"
                                disabled={isReadOnly}
                                checked={value}
                                onChange={onChange}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          />
                          <label
                            htmlFor="is_active_settings"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Team is active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : mode === 'create' ? (
                  'Create Team'
                ) : (
                  'Update Team'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
