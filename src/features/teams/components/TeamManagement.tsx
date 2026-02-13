import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  UserPlus,
  Crown,
  User,
  Calendar,
  Loader2,
  Eye,
} from 'lucide-react';
import { useTeams, useTeamsExtended } from '@/features/teams/useTeams';
import { TeamFormModal } from './TeamFormModal';
import {
  type TeamCreateForm,
  type TeamUpdateForm,
} from '../schemas/team-schemas';
import type { Team } from '@/services/apiTeams';

const TeamManagement = () => {
  const {
    entities: teams,
    loading,
    error,
    createEntity: createTeam,
    updateEntity: updateTeam,
    deleteEntity: deleteTeam,
    refetch,
  } = useTeams();
  const { removeTeamMember, updateTeamMemberRole } = useTeamsExtended();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  // Filter teams based on search
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description &&
        team.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleViewTeam = (team: Team) => {
    setSelectedTeam(team);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this team? This action cannot be undone.',
      )
    ) {
      setDeletingTeamId(teamId);
      try {
        await deleteTeam(teamId);
      } catch {
        // Error handled by parent component
      } finally {
        setDeletingTeamId(null);
      }
    }
  };

  const handleRemoveMember = async (
    teamId: string,
    userId: string,
    userName: string,
  ) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${userName} from this team?`,
      )
    ) {
      try {
        await removeTeamMember(teamId, userId);
      } catch {
        // Error handled by parent component
      }
    }
  };

  const handleToggleMemberRole = async (
    teamId: string,
    userId: string,
    currentRole: string,
  ) => {
    const newRole = currentRole === 'lead' ? 'member' : 'lead';
    try {
      await updateTeamMemberRole(teamId, userId, newRole);
    } catch {
      // Error handled by parent component
    }
  };

  // Handle save team (create or update)
  const handleSaveTeam = async (data: TeamCreateForm | TeamUpdateForm) => {
    if (modalMode === 'create') {
      await createTeam(data as TeamCreateForm);
    } else if (modalMode === 'edit' && selectedTeam) {
      await updateTeam(selectedTeam.id, data as TeamUpdateForm);
    }
    await refetch();
    setModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading teams...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">
            Error loading teams
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {error?.message || 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Content Area */}
      <div className="flex-1 px-6 py-4 min-h-0 flex flex-col">
        {/* Header with search and create button */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleCreateTeam}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Team
          </button>
        </div>

        {/* Teams Grid */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group"
                  >
                    {/* Team Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color }}
                            ></div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {team.name}
                            </h3>
                          </div>
                          {team.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {team.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {team.team_members?.length || 0} members
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created {formatDate(team.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewTeam(team)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="View team details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit team"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            disabled={deletingTeamId === team.id}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                            title="Delete team"
                          >
                            {deletingTeamId === team.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Team Members
                        </h4>
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Add</span>
                        </button>
                      </div>

                      {team.team_members && team.team_members.length > 0 ? (
                        <div className="space-y-3">
                          {team.team_members.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {member.users?.avatar_url ? (
                                    <img
                                      src={member.users.avatar_url}
                                      alt={member.users.full_name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-medium">
                                        {member.users?.full_name
                                          ?.split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .slice(0, 2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {member.users?.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {member.users?.job_title || 'No title'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    handleToggleMemberRole(
                                      team.id,
                                      member.user_id,
                                      member.role,
                                    )
                                  }
                                  className={`p-1 rounded transition-colors ${
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
                                    <Crown className="h-3 w-3" />
                                  ) : (
                                    <User className="h-3 w-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    handleRemoveMember(
                                      team.id,
                                      member.user_id,
                                      member.users?.full_name || 'User',
                                    )
                                  }
                                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Remove from team"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {team.team_members.length > 4 && (
                            <button
                              onClick={() => handleViewTeam(team)}
                              className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-center py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
                            >
                              View all {team.team_members.length} members
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Users className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            No members yet
                          </p>
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            Add first member
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm ? 'No teams match your search' : 'No teams found'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateTeam}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Create your first team
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Form Modal */}
      <TeamFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        team={selectedTeam}
        mode={modalMode}
        onSave={handleSaveTeam}
      />
    </div>
  );
};

export default TeamManagement;
