import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as teamsApi from '../../services/apiTeams';
import { UserRole, TeamRole } from '@/shared/types/roles';
import type {
  Team,
  TeamInsert,
  TeamUpdate,
  TeamMember,
  TeamMemberInsert,
} from '../../services/apiTeams';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export interface TeamWithMembers extends Team {
  members?: (TeamMember & {
    user?: {
      id: string;
      email: string;
      full_name?: string;
      avatar_url?: string;
      role: UserRole;
    };
  })[];
}

export const useTeams = createEntityHook<Team, TeamInsert, TeamUpdate>({
  queryKey: ['teams'],
  api: {
    getAll: teamsApi.getTeams,
    create: teamsApi.createTeam,
    update: teamsApi.updateTeam,
    delete: teamsApi.deleteTeam,
  },
  getId: (team: Team) => team.id,
});

// Hook for getting teams by user ID
export const useTeamsByUser = (userId: string) => {
  return useQuery({
    queryKey: ['teams', 'user', userId],
    queryFn: () =>
      teamsApi.getTeamsByUserId(userId).then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
    enabled: !!userId,
  });
};

// Hook for getting team members by team ID
export const useTeamMembers = (teamId: string) => {
  return useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () =>
      teamsApi.getTeamMembers(teamId).then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
    enabled: !!teamId,
  });
};
// Extended hook for team member operations
export const useTeamsExtended = () => {
  const queryClient = useQueryClient();

  const addTeamMemberMutation = useMutation({
    mutationFn: teamsApi.addTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const updateTeamMemberRoleMutation = useMutation({
    mutationFn: ({
      teamId,
      userId,
      role,
    }: {
      teamId: string;
      userId: string;
      role: TeamRole;
    }) => teamsApi.updateTeamMemberRole(teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const addTeamMember = async (memberData: TeamMemberInsert) => {
    try {
      const result = await addTeamMemberMutation.mutateAsync(memberData);
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  const removeTeamMember = async (teamId: string, userId: string) => {
    try {
      const result = await removeTeamMemberMutation.mutateAsync({
        teamId,
        userId,
      });
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateTeamMemberRole = async (
    teamId: string,
    userId: string,
    role: TeamRole,
  ) => {
    try {
      const result = await updateTeamMemberRoleMutation.mutateAsync({
        teamId,
        userId,
        role,
      });
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole,
    isAddingMember: addTeamMemberMutation.isPending,
    isRemovingMember: removeTeamMemberMutation.isPending,
    isUpdatingMemberRole: updateTeamMemberRoleMutation.isPending,
  };
};
