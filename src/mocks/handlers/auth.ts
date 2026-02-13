import { http, HttpResponse } from 'msw';
import type { User } from '../../services/apiUsers';

// Use relative URLs for MSW handlers to work with dev server
import { mockUsers } from '../data/users';
const API_URL = '';

// Helper function to create mock session
const createMockSession = (user: User, accessToken: string = 'mock-token') => ({
  access_token: accessToken,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user,
});

// Helper function to create success response
const createSuccessResponse = (data: Record<string, unknown>) => ({
  ...data,
  error: null,
});

// Get the primary admin user from centralized mock data and transform to auth structure
const baseUser = mockUsers.find(
  (user) => user.id === 'd60260e8-5466-4a91-ad6e-54fb9ed25357',
)!;
const realUserData = {
  id: baseUser.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: baseUser.email,
  email_confirmed_at: '2025-06-29T08:35:36.239884Z',
  phone: '',
  confirmed_at: '2025-06-29T08:35:36.239884Z',
  last_sign_in_at: '2025-09-12T05:32:20.371579699Z',
  app_metadata: {
    provider: 'email',
    providers: ['email', 'github'],
  },
  user_metadata: {
    avatar_url: baseUser.avatar_url,
    department: baseUser.department,
    email: baseUser.email,
    email_verified: true,
    full_name: baseUser.full_name,
    iss: 'https://api.github.com',
    job_title: baseUser.job_title,
    phone_verified: false,
    preferred_username: 'administrator',
    provider_id: '18650614',
    role: baseUser.role,
    sub: '18650614',
    user_name: 'administrator',
  },
  created_at: baseUser.created_at,
  updated_at: baseUser.updated_at,
  is_anonymous: false,
};

// Signup handler for new user registration
const signupHandler = http.post(
  `${API_URL}/api/auth/signup`,
  async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      userData?: Record<string, unknown>;
    };

    const newUser = {
      ...realUserData,
      id: crypto.randomUUID(),
      email: body.email,
      user_metadata: {
        ...realUserData.user_metadata,
        email: body.email,
        full_name: body.userData?.full_name || body.email,
        role: body.userData?.role || 'user',
      },
    };

    return HttpResponse.json(
      createSuccessResponse({
        user: newUser,
        session: createMockSession(newUser, 'mock-signup-token'),
      }),
    );
  },
);

// Login handler for user authentication
const loginHandler = http.post(
  `${API_URL}/api/auth/login`,
  async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    // Test credentials for different user roles (password is always '123456' for testing)
    const testCredentials = [
      { email: 'admin@seatos.vn', password: '123456', role: 'admin' },
      { email: 'manager@seatos.vn', password: '123456', role: 'manager' },
      { email: 'member@seatos.vn', password: '123456', role: 'user' },
      { email: 'viewer@seatos.vn', password: '123456', role: 'viewer' },
    ];

    const validCredential = testCredentials.find(
      (cred) => cred.email === body.email && cred.password === body.password,
    );

    if (validCredential) {
      // Find the corresponding user data
      const userData = mockUsers.find(
        (user) => user.email === validCredential.email,
      );

      if (userData) {
        // Create auth-formatted user data
        const authUserData = {
          id: userData.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: userData.email,
          email_confirmed_at: userData.created_at,
          phone: '',
          confirmed_at: userData.created_at,
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
          user_metadata: {
            avatar_url: userData.avatar_url,
            department: userData.department,
            email: userData.email,
            email_verified: true,
            full_name: userData.full_name,
            job_title: userData.job_title,
            phone_verified: false,
            preferred_username: userData.full_name
              .toLowerCase()
              .replace(/\s+/g, ''),
            provider_id: userData.id.slice(-8),
            role: userData.role,
            sub: userData.id.slice(-8),
            user_name: userData.full_name.toLowerCase().replace(/\s+/g, ''),
          },
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          is_anonymous: false,
        };

        // Generate a role-specific mock JWT token
        const mockJWT = `eyJhbGciOiJIUzI1NiIsImtpZCI6Ik5HMDdTZ0JBQThLRDlxQ1QiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL21vY2stYXBpLmNvbS9hdXRoL3YxIiwic3ViIjoiJHt1c2VyRGF0YS5pZH0iLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoke01hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApICsgMzYwMH0sImlhdCI6JHtNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKX0sImVtYWlsIjoiJHt1c2VyRGF0YS5lbWFpbH0iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsInVzZXJfbWV0YWRhdGEiOnsicm9sZSI6IiR7dXNlckRhdGEucm9sZX0ifSwiaXNfYW5vbnltb3VzIjpmYWxzZX0.mock-signature-${validCredential.role}`;

        console.log(
          `✅ MSW: Login successful for ${validCredential.role} user: ${userData.email}`,
        );

        return HttpResponse.json(
          createSuccessResponse({
            user: authUserData,
            session: createMockSession(authUserData, mockJWT),
          }),
        );
      }
    }

    console.log(`❌ MSW: Login failed for: ${body.email}`);
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  },
);

// Logout handler
const logoutHandler = http.post(`${API_URL}/api/auth/logout`, () => {
  return HttpResponse.json(
    createSuccessResponse({
      data: null,
    }),
  );
});

// Get current user handler
const getCurrentUserHandler = http.get(
  `${API_URL}/api/auth/me`,
  ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    console.log(
      '🔍 MSW: GET /api/auth/me - Auth header:',
      authHeader?.substring(0, 50) + '...',
    );

    if (authHeader?.includes('Bearer') && authHeader.includes('eyJ')) {
      const accessToken = authHeader.replace('Bearer ', '');

      // Determine user based on token signature
      let currentUser = realUserData; // default to admin

      if (accessToken.includes('mock-signature-manager')) {
        const managerData = mockUsers.find((user) => user.role === 'manager');
        if (managerData) {
          currentUser = {
            id: managerData.id,
            aud: 'authenticated',
            role: 'authenticated',
            email: managerData.email,
            email_confirmed_at: managerData.created_at,
            phone: '',
            confirmed_at: managerData.created_at,
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {
              avatar_url: managerData.avatar_url,
              department: managerData.department,
              email: managerData.email,
              email_verified: true,
              full_name: managerData.full_name,
              iss: 'https://api.github.com',
              job_title: managerData.job_title,
              phone_verified: false,
              preferred_username: managerData.full_name
                .toLowerCase()
                .replace(/\s+/g, ''),
              provider_id: managerData.id.slice(-8),
              role: managerData.role,
              sub: managerData.id.slice(-8),
              user_name: managerData.full_name
                .toLowerCase()
                .replace(/\s+/g, ''),
            },
            created_at: managerData.created_at,
            updated_at: managerData.updated_at,
            is_anonymous: false,
          };
        }
      } else if (accessToken.includes('mock-signature-member')) {
        const memberData = mockUsers.find(
          (user) => user.email === 'member@seatos.vn',
        );
        if (memberData) {
          currentUser = {
            id: memberData.id,
            aud: 'authenticated',
            role: 'authenticated',
            email: memberData.email,
            email_confirmed_at: memberData.created_at,
            phone: '',
            confirmed_at: memberData.created_at,
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {
              avatar_url: memberData.avatar_url,
              department: memberData.department,
              email: memberData.email,
              email_verified: true,
              full_name: memberData.full_name,
              iss: 'https://api.github.com',
              job_title: memberData.job_title,
              phone_verified: false,
              preferred_username: memberData.full_name
                .toLowerCase()
                .replace(/\s+/g, ''),
              provider_id: memberData.id.slice(-8),
              role: memberData.role,
              sub: memberData.id.slice(-8),
              user_name: memberData.full_name.toLowerCase().replace(/\s+/g, ''),
            },
            created_at: memberData.created_at,
            updated_at: memberData.updated_at,
            is_anonymous: false,
          };
        }
      } else if (accessToken.includes('mock-signature-viewer')) {
        const viewerData = mockUsers.find((user) => user.role === 'viewer');
        if (viewerData) {
          currentUser = {
            id: viewerData.id,
            aud: 'authenticated',
            role: 'authenticated',
            email: viewerData.email,
            email_confirmed_at: viewerData.created_at,
            phone: '',
            confirmed_at: viewerData.created_at,
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {
              avatar_url: viewerData.avatar_url,
              department: viewerData.department,
              email: viewerData.email,
              email_verified: true,
              full_name: viewerData.full_name,
              iss: 'https://api.github.com',
              job_title: viewerData.job_title,
              phone_verified: false,
              preferred_username: viewerData.full_name
                .toLowerCase()
                .replace(/\s+/g, ''),
              provider_id: viewerData.id.slice(-8),
              role: viewerData.role,
              sub: viewerData.id.slice(-8),
              user_name: viewerData.full_name.toLowerCase().replace(/\s+/g, ''),
            },
            created_at: viewerData.created_at,
            updated_at: viewerData.updated_at,
            is_anonymous: false,
          };
        }
      }

      console.log(
        `✅ MSW: Valid JWT token found, returning ${currentUser.user_metadata.role} user session`,
      );
      return HttpResponse.json(
        createSuccessResponse({
          data: {
            session: {
              access_token: accessToken,
              user: currentUser,
            },
          },
        }),
      );
    }

    console.log('❌ MSW: Invalid or missing token, returning 401');
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  },
);

// Get user preferences handler
const getUserPreferencesHandler = http.get(
  `${API_URL}/api/users/:userId/preferences`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId as string;

    if (
      userId === baseUser.id ||
      userId === 'd60260e8-5466-4a91-ad6e-54fb9ed25357'
    ) {
      const preferences = {
        theme: 'light',
        language: 'en',
        notifications: true,
        email_notifications: true,
        created_at: baseUser.created_at,
        updated_at: baseUser.updated_at,
      };

      return HttpResponse.json(createSuccessResponse({ data: preferences }));
    }

    return HttpResponse.json({ error: 'User not found' }, { status: 404 });
  },
);

// Update user preferences handler
const updateUserPreferencesHandler = http.put(
  `${API_URL}/api/users/:userId/preferences`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId as string;
    const updates = (await request.json()) as Record<string, any>;

    if (
      userId === baseUser.id ||
      userId === 'd60260e8-5466-4a91-ad6e-54fb9ed25357'
    ) {
      const updatedPreferences = {
        theme: 'light',
        language: 'en',
        notifications: true,
        email_notifications: true,
        ...updates,
        created_at: baseUser.created_at,
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(
        createSuccessResponse({ data: updatedPreferences }),
      );
    }

    return HttpResponse.json({ error: 'User not found' }, { status: 404 });
  },
);

export const authHandlers = [
  signupHandler,
  loginHandler,
  logoutHandler,
  getCurrentUserHandler,
  getUserPreferencesHandler,
  updateUserPreferencesHandler,
];
