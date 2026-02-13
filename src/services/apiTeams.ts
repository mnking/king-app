export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  users?: User;
  team_members?: TeamMember[];
}

export interface TeamInsert {
  name: string;
  description?: string;
  color?: string;
  created_by: string;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
  color?: string;
}

export interface TeamMemberInsert {
  team_id: string;
  user_id: string;
  role: TeamRole;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  users?: User;
}

import { TeamRole } from '@/shared/types/roles';
import { config } from '@/config';
import { apiFetch } from '@/shared/utils/api-client';
import type { User } from './apiUsers';

const API_URL = config.apiUrl;

// Get all teams
export const getTeams = async (): Promise<{
  data: Team[] | null;
  error: Error | null;
}> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch teams');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get a single team by ID
export const getTeam = async (
  id: string,
): Promise<{ data: Team | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch team');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Create a new team
export const createTeam = async (
  team: TeamInsert,
): Promise<{ data: Team | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...team, updated_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create team');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Update an existing team
export const updateTeam = async (
  id: string,
  updates: TeamUpdate,
): Promise<{ data: Team | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update team');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Delete a team
export const deleteTeam = async (
  id: string,
): Promise<{ data: null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete team');
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Team member management functions

// Add a team member
export const addTeamMember = async (
  teamMember: TeamMemberInsert,
): Promise<{ data: TeamMember | null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/teams/${teamMember.team_id}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamMember),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add team member');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Remove a team member
export const removeTeamMember = async (
  teamId: string,
  userId: string,
): Promise<{ data: null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/teams/${teamId}/members/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove team member');
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Update team member role
export const updateTeamMemberRole = async (
  teamId: string,
  userId: string,
  role: TeamRole,
): Promise<{ data: null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/teams/${teamId}/members/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update team member role');
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get teams by user ID (teams where user is a member)
export const getTeamsByUserId = async (
  userId: string,
): Promise<{ data: Team[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users/${userId}/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch user teams');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get teams created by user ID
export const getTeamsCreatedByUserId = async (
  userId: string,
): Promise<{ data: Team[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams?created_by=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch created teams');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get team members by team ID
export const getTeamMembers = async (
  teamId: string,
): Promise<{ data: TeamMember[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/teams/${teamId}/members`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch team members');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};
