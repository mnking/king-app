import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/users';

// Use relative URLs for MSW handlers to work with dev server
const API_URL = '';

// In-memory storage for users (simulates database)
// eslint-disable-next-line prefer-const
let users = [...mockUsers];

// Get all users handler (with filtering support)
const getUsersHandler = http.get(`${API_URL}/api/users`, ({ request }) => {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.includes('Bearer')) {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let filteredUsers = users;

  // Apply filters from query parameters
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const role = url.searchParams.get('role');
  const department = url.searchParams.get('department');
  const isActive = url.searchParams.get('is_active');

  if (email) {
    filteredUsers = filteredUsers.filter((user) =>
      user.email.toLowerCase().includes(email.toLowerCase()),
    );
  }

  if (role) {
    filteredUsers = filteredUsers.filter((user) => user.role === role);
  }

  if (department) {
    filteredUsers = filteredUsers.filter(
      (user) => user.department === department,
    );
  }

  if (isActive) {
    const active = isActive === 'true';
    filteredUsers = filteredUsers.filter((user) => user.is_active === active);
  }

  // Sort by full_name
  filteredUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));

  return HttpResponse.json({ data: filteredUsers });
});

// Get single user handler
const getUserHandler = http.get(
  `${API_URL}/api/users/:id`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id as string;
    const user = users.find((user) => user.id === userId);

    if (!user) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: user });
  },
);

// Create user handler
const createUserHandler = http.post(
  `${API_URL}/api/users`,
  async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as any;

    // Check if email already exists
    const existingUser = users.find((user) => user.email === body.email);
    if (existingUser) {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 409 },
      );
    }

    const newUser = {
      id: crypto.randomUUID(),
      ...body,
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    users.push(newUser);

    return HttpResponse.json({ data: newUser }, { status: 201 });
  },
);

// Update user handler
const updateUserHandler = http.put(
  `${API_URL}/api/users/:id`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id as string;
    const updates = (await request.json()) as any;

    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check email uniqueness if updating email
    if (updates.email && updates.email !== users[userIndex].email) {
      const existingUser = users.find((user) => user.email === updates.email);
      if (existingUser) {
        return HttpResponse.json(
          { error: 'Email already exists' },
          { status: 409 },
        );
      }
    }

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ data: users[userIndex] });
  },
);

// Delete user handler
const deleteUserHandler = http.delete(
  `${API_URL}/api/users/:id`,
  ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id as string;
    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users.splice(userIndex, 1);

    return HttpResponse.json({ success: true });
  },
);

// Toggle user status handler
const toggleUserStatusHandler = http.put(
  `${API_URL}/api/users/:id/status`,
  async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id as string;
    const body = (await request.json()) as any;

    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users[userIndex] = {
      ...users[userIndex],
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ data: users[userIndex] });
  },
);

// Search users handler
const searchUsersHandler = http.get(
  `${API_URL}/api/users/search`,
  ({ request, url }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchTerm = url.searchParams.get('q');

    if (!searchTerm) {
      return HttpResponse.json(
        { error: 'Search term is required' },
        { status: 400 },
      );
    }

    const term = searchTerm.toLowerCase();
    const filteredUsers = users
      .filter(
        (user) =>
          user.full_name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    return HttpResponse.json({ data: filteredUsers });
  },
);

export const userHandlers = [
  getUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  toggleUserStatusHandler,
  searchUsersHandler,
];
