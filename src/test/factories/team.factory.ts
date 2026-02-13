import { mockTeams } from '@/mocks/data/teams';
import { mockTeamMembers } from '@/mocks/data/teamMembers';

/**
 * Quick access to test teams
 */
export const testTeams = {
  engineering: mockTeams[0],
  design: mockTeams[1],
  all: mockTeams,
};

/**
 * Quick access to test team members
 */
export const testTeamMembers = {
  first: mockTeamMembers[0],
  all: mockTeamMembers,
};

/**
 * Build a team with optional overrides
 */
export const buildTeam = (overrides?: Partial<typeof mockTeams[0]>) => ({
  ...mockTeams[0],
  id: crypto.randomUUID(),
  name: `Test Team ${Date.now()}`,
  ...overrides,
});

/**
 * Build a team member with optional overrides
 */
export const buildTeamMember = (overrides?: Partial<typeof mockTeamMembers[0]>) => ({
  ...mockTeamMembers[0],
  id: crypto.randomUUID(),
  ...overrides,
});

/**
 * Test scenarios for edge cases
 */
export const teamScenarios = {
  /** Active team */
  active: () =>
    buildTeam({
      is_active: true,
    }),

  /** Inactive team */
  inactive: () =>
    buildTeam({
      is_active: false,
    }),

  /** Team with members */
  withMembers: (memberCount: number) => {
    const team = buildTeam();
    const members = Array.from({ length: memberCount }, () =>
      buildTeamMember({ team_id: team.id }),
    );
    return { team, members };
  },

  /** Batch of teams */
  batch: (count: number) =>
    Array.from({ length: count }, (_, i) =>
      buildTeam({
        name: `Team ${i}`,
      }),
    ),
};
