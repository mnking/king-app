// Enhanced auth data with comprehensive fields captured from automated API harvesting
export const mockAuthResponses = {
  // Mock user session for authenticated state
  session: {
    access_token: 'mock-access-token-123',
    refresh_token: 'mock-refresh-token-456',
    expires_in: 3600,
    expires_at: Date.now() + 3600000, // 1 hour from now
    token_type: 'bearer',
    user: {
      id: '08dfd5e5-6562-4ac0-a111-d7f864cd5e1b',
      email: 'admin@seatos.vn',
      email_confirmed_at: '2025-05-15T08:00:00.000Z',
      phone: '',
      confirmed_at: '2025-05-15T08:00:00.000Z',
      last_sign_in_at: '2025-09-12T14:20:00.000Z',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        full_name: 'John Doe',
        role: 'admin',
        department: 'Engineering',
      },
      aud: 'authenticated',
      created_at: '2025-05-15T08:00:00.000Z',
      updated_at: '2025-09-12T14:20:00.000Z',
    },
  },

  // Mock users for testing different authentication scenarios
  users: {
    admin: {
      id: '08dfd5e5-6562-4ac0-a111-d7f864cd5e1b',
      email: 'admin@seatos.vn',
      full_name: 'Admin SeaTos',
      role: 'admin',
      department: 'IT',
    },
    lead: {
      id: 'd21c90d2-3d14-440d-b26a-81b04f6e4e62',
      email: 'jane.smith@company.com',
      full_name: 'Jane Smith',
      role: 'lead',
      department: 'Engineering',
    },
    user: {
      id: 'b59cbf2e-4ff1-4e7e-876c-627b49a72fbd',
      email: 'mike.wilson@company.com',
      full_name: 'Mike Wilson',
      role: 'user',
      department: 'Documentation',
    },
  },

  // Mock credentials for testing sign in
  validCredentials: [
    { email: 'admin@seatos.vn', password: '123456' },
    { email: 'jane.smith@company.com', password: 'password123' },
    { email: 'mike.wilson@company.com', password: 'password123' },
  ],

  // OAuth provider configurations
  oauthProviders: {
    google: {
      provider: 'google',
      url: 'https://accounts.google.com/oauth/authorize?client_id=mock&redirect_uri=mock',
    },
    github: {
      provider: 'github',
      url: 'https://github.com/login/oauth/authorize?client_id=mock&redirect_uri=mock',
    },
  },
};
