// Simple fixture factories used in tests
export const createMockUser = (overrides: Partial<any> = {}) => {
  return {
    id: overrides.id ?? 'user-1',
    username: overrides.username ?? 'testuser',
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    roles: overrides.roles ?? ['user'],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    ...overrides,
  };
};

export const createMockProject = (overrides: Partial<any> = {}) => {
  return {
    id: overrides.id ?? 'project-1',
    name: overrides.name ?? 'Demo Project',
    description: overrides.description ?? null,
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    ...overrides,
  };
};

export const createMockApiResponse = {
  success: (data: any) => ({ statusCode: 200, data }),
  error: (message: string, code?: string) => ({ statusCode: 400, message, errorCode: code ?? 'ERROR', data: null }),
  paginated: (results: any[] = [], total = results.length) => ({ results, total }),
};

export default {
  createMockUser,
  createMockProject,
  createMockApiResponse,
};
