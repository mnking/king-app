import { http, HttpResponse } from 'msw';
import { mockTeams } from '../data/teams';
import { mockUsers } from '../data/users';
import { mockTeamMembers } from '../data/teamMembers';

// Use relative URLs for MSW handlers to work with dev server
const API_URL = '';

// In-memory storage for teams and members (simulates database)
// eslint-disable-next-line prefer-const
let teams = [...mockTeams];

let teamMembers = [...mockTeamMembers];

// Helper function to attach user and member data to teams
const enrichTeamData = (team: any) => {
  const creator = mockUsers.find((user) => user.id === team.created_by);
  const members = teamMembers.filter((member) => member.team_id === team.id);
  const membersWithUserData = members.map((member) => ({
    ...member,
    users: mockUsers.find((user) => user.id === member.user_id),
  }));

  return {
    ...team,
    users: creator
      ? {
          id: creator.id,
          full_name: creator.full_name,
          email: creator.email,
          avatar_url: creator.avatar_url,
        }
      : null,
    team_members: membersWithUserData,
  };
};

// Get all teams handler
const getTeamsHandler = http.get(`${API_URL}/api/teams`, ({ request }) => {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.includes('Bearer')) {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const createdBy = url.searchParams.get('created_by');
  let filteredTeams = teams;

  if (createdBy) {
    filteredTeams = teams.filter((team) => team.created_by === createdBy);
  }

  // Enrich teams with user and member data, sort by name
  const enrichedTeams = filteredTeams
    .map(enrichTeamData)
    .sort((a, b) => a.name.localeCompare(b.name));

  return HttpResponse.json(enrichedTeams);
});

// Get single team handler
const getTeamHandler = http.get(
  `${API_URL}/api/teams/:id`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id as string;
    const team = teams.find((team) => team.id === teamId);

    if (!team) {
      return HttpResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return HttpResponse.json(enrichTeamData(team));
  },
);

// Create team handler
const createTeamHandler = http.post(
  `${API_URL}/api/teams`,
  async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as any;

    const newTeam = {
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    teams.push(newTeam);

    return HttpResponse.json(enrichTeamData(newTeam), { status: 201 });
  },
);

// Update team handler
const updateTeamHandler = http.put(
  `${API_URL}/api/teams/:id`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id as string;
    const updates = (await request.json()) as any;

    const teamIndex = teams.findIndex((team) => team.id === teamId);

    if (teamIndex === -1) {
      return HttpResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    teams[teamIndex] = {
      ...teams[teamIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(enrichTeamData(teams[teamIndex]));
  },
);

// Delete team handler
const deleteTeamHandler = http.delete(
  `${API_URL}/api/teams/:id`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id as string;
    const teamIndex = teams.findIndex((team) => team.id === teamId);

    if (teamIndex === -1) {
      return HttpResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    teams.splice(teamIndex, 1);
    // Also remove all team members
    teamMembers = teamMembers.filter((member) => member.team_id !== teamId);

    return HttpResponse.json({ success: true });
  },
);

// Get team members handler
const getTeamMembersHandler = http.get(
  `${API_URL}/api/teams/:id/members`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id as string;
    const members = teamMembers
      .filter((member) => member.team_id === teamId)
      .map((member) => ({
        ...member,
        users: mockUsers.find((user) => user.id === member.user_id),
      }))
      .sort(
        (a, b) =>
          new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
      );

    return HttpResponse.json(members);
  },
);

// Add team member handler
const addTeamMemberHandler = http.post(
  `${API_URL}/api/teams/:id/members`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id as string;
    const body = (await request.json()) as any;

    // Check if team exists
    const team = teams.find((team) => team.id === teamId);
    if (!team) {
      return HttpResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = teamMembers.find(
      (member) => member.team_id === teamId && member.user_id === body.user_id,
    );
    if (existingMember) {
      return HttpResponse.json(
        { error: 'User is already a team member' },
        { status: 409 },
      );
    }

    const newMember = {
      id: `tm-${Date.now()}`,
      team_id: teamId,
      user_id: body.user_id,
      role: body.role || 'member',
      joined_at: new Date().toISOString(),
    };

    teamMembers.push(newMember);

    return HttpResponse.json(newMember, { status: 201 });
  },
);

// Update team member handler
const updateTeamMemberHandler = http.put(
  `${API_URL}/api/teams/:teamId/members/:userId`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, userId } = params as { teamId: string; userId: string };
    const updates = (await request.json()) as any;

    const memberIndex = teamMembers.findIndex(
      (member) => member.team_id === teamId && member.user_id === userId,
    );

    if (memberIndex === -1) {
      return HttpResponse.json(
        { error: 'Team member not found' },
        { status: 404 },
      );
    }

    teamMembers[memberIndex] = {
      ...teamMembers[memberIndex],
      ...updates,
    };

    return HttpResponse.json({ success: true });
  },
);

// Remove team member handler
const removeTeamMemberHandler = http.delete(
  `${API_URL}/api/teams/:teamId/members/:userId`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, userId } = params as { teamId: string; userId: string };

    const memberIndex = teamMembers.findIndex(
      (member) => member.team_id === teamId && member.user_id === userId,
    );

    if (memberIndex === -1) {
      return HttpResponse.json(
        { error: 'Team member not found' },
        { status: 404 },
      );
    }

    teamMembers.splice(memberIndex, 1);

    return HttpResponse.json({ success: true });
  },
);

// Get user teams handler
const getUserTeamsHandler = http.get(
  `${API_URL}/api/users/:userId/teams`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId as string;
    const userMemberships = teamMembers.filter(
      (member) => member.user_id === userId,
    );
    const userTeams = teams
      .filter((team) =>
        userMemberships.some((membership) => membership.team_id === team.id),
      )
      .map(enrichTeamData)
      .sort((a, b) => a.name.localeCompare(b.name));

    return HttpResponse.json(userTeams);
  },
);

export const teamHandlers = [
  getTeamsHandler,
  getTeamHandler,
  createTeamHandler,
  updateTeamHandler,
  deleteTeamHandler,
  getTeamMembersHandler,
  addTeamMemberHandler,
  updateTeamMemberHandler,
  removeTeamMemberHandler,
  getUserTeamsHandler,
];
