import { mockUsers } from '@/mocks/data/users';

/**
 * Quick access to test users
 */
export const testUsers = {
  admin: mockUsers[0],
  manager: mockUsers[1],
  user: mockUsers[2],
  all: mockUsers,
};

/**
 * Build a user with optional overrides
 */
export const buildUser = (overrides?: Partial<typeof mockUsers[0]>) => ({
  ...mockUsers[0],
  id: crypto.randomUUID(),
  email: `test-${Date.now()}@seatos.vn`,
  ...overrides,
});

/**
 * Test scenarios for edge cases
 */
export const userScenarios = {
  /** Admin user */
  admin: () =>
    buildUser({
      role: 'admin',
      department: 'IT',
      job_title: 'System Administrator',
    }),

  /** Manager user */
  manager: () =>
    buildUser({
      role: 'manager',
      department: 'Engineering',
      job_title: 'Engineering Manager',
    }),

  /** Regular user */
  regularUser: () =>
    buildUser({
      role: 'user',
      department: 'Operations',
      job_title: 'Operations Specialist',
    }),

  /** Inactive user */
  inactive: () =>
    buildUser({
      is_active: false,
    }),

  /** Batch of users */
  batch: (count: number, role: 'admin' | 'manager' | 'user' = 'user') =>
    Array.from({ length: count }, (_, i) =>
      buildUser({
        role,
        email: `user-${i}@seatos.vn`,
        full_name: `Test User ${i}`,
      }),
    ),
};
