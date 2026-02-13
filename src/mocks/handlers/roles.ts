import { http, HttpResponse } from 'msw';

// Use relative URLs for MSW handlers to work with dev server
const API_URL = '';

// Define permission interface
interface Permission {
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

// Default permission matrix - realistic role-based permissions
const defaultPermissions: Permission[] = [
  // Admin permissions - full access
  { role: 'admin', resource: 'users', action: 'create', allowed: true },
  { role: 'admin', resource: 'users', action: 'read', allowed: true },
  { role: 'admin', resource: 'users', action: 'update', allowed: true },
  { role: 'admin', resource: 'users', action: 'delete', allowed: true },
  { role: 'admin', resource: 'teams', action: 'create', allowed: true },
  { role: 'admin', resource: 'teams', action: 'read', allowed: true },
  { role: 'admin', resource: 'teams', action: 'update', allowed: true },
  { role: 'admin', resource: 'teams', action: 'delete', allowed: true },
  { role: 'admin', resource: 'projects', action: 'create', allowed: true },
  { role: 'admin', resource: 'projects', action: 'read', allowed: true },
  { role: 'admin', resource: 'projects', action: 'update', allowed: true },
  { role: 'admin', resource: 'projects', action: 'delete', allowed: true },
  { role: 'admin', resource: 'tasks', action: 'create', allowed: true },
  { role: 'admin', resource: 'tasks', action: 'read', allowed: true },
  { role: 'admin', resource: 'tasks', action: 'update', allowed: true },
  { role: 'admin', resource: 'tasks', action: 'delete', allowed: true },
  { role: 'admin', resource: 'settings', action: 'manage', allowed: true },

  // Manager permissions - team and project management
  { role: 'manager', resource: 'users', action: 'create', allowed: false },
  { role: 'manager', resource: 'users', action: 'read', allowed: true },
  { role: 'manager', resource: 'users', action: 'update', allowed: true },
  { role: 'manager', resource: 'users', action: 'delete', allowed: false },
  { role: 'manager', resource: 'teams', action: 'create', allowed: true },
  { role: 'manager', resource: 'teams', action: 'read', allowed: true },
  { role: 'manager', resource: 'teams', action: 'update', allowed: true },
  { role: 'manager', resource: 'teams', action: 'delete', allowed: false },
  { role: 'manager', resource: 'projects', action: 'create', allowed: true },
  { role: 'manager', resource: 'projects', action: 'read', allowed: true },
  { role: 'manager', resource: 'projects', action: 'update', allowed: true },
  { role: 'manager', resource: 'projects', action: 'delete', allowed: true },
  { role: 'manager', resource: 'tasks', action: 'create', allowed: true },
  { role: 'manager', resource: 'tasks', action: 'read', allowed: true },
  { role: 'manager', resource: 'tasks', action: 'update', allowed: true },
  { role: 'manager', resource: 'tasks', action: 'delete', allowed: true },
  { role: 'manager', resource: 'settings', action: 'manage', allowed: false },

  // User permissions - standard user
  { role: 'user', resource: 'users', action: 'create', allowed: false },
  { role: 'user', resource: 'users', action: 'read', allowed: true },
  { role: 'user', resource: 'users', action: 'update', allowed: false },
  { role: 'user', resource: 'users', action: 'delete', allowed: false },
  { role: 'user', resource: 'teams', action: 'create', allowed: false },
  { role: 'user', resource: 'teams', action: 'read', allowed: true },
  { role: 'user', resource: 'teams', action: 'update', allowed: false },
  { role: 'user', resource: 'teams', action: 'delete', allowed: false },
  { role: 'user', resource: 'projects', action: 'create', allowed: false },
  { role: 'user', resource: 'projects', action: 'read', allowed: true },
  { role: 'user', resource: 'projects', action: 'update', allowed: true },
  { role: 'user', resource: 'projects', action: 'delete', allowed: false },
  { role: 'user', resource: 'tasks', action: 'create', allowed: true },
  { role: 'user', resource: 'tasks', action: 'read', allowed: true },
  { role: 'user', resource: 'tasks', action: 'update', allowed: true },
  { role: 'user', resource: 'tasks', action: 'delete', allowed: false },
  { role: 'user', resource: 'settings', action: 'manage', allowed: false },

  // Viewer permissions - read-only access
  { role: 'viewer', resource: 'users', action: 'create', allowed: false },
  { role: 'viewer', resource: 'users', action: 'read', allowed: true },
  { role: 'viewer', resource: 'users', action: 'update', allowed: false },
  { role: 'viewer', resource: 'users', action: 'delete', allowed: false },
  { role: 'viewer', resource: 'teams', action: 'create', allowed: false },
  { role: 'viewer', resource: 'teams', action: 'read', allowed: true },
  { role: 'viewer', resource: 'teams', action: 'update', allowed: false },
  { role: 'viewer', resource: 'teams', action: 'delete', allowed: false },
  { role: 'viewer', resource: 'projects', action: 'create', allowed: false },
  { role: 'viewer', resource: 'projects', action: 'read', allowed: true },
  { role: 'viewer', resource: 'projects', action: 'update', allowed: false },
  { role: 'viewer', resource: 'projects', action: 'delete', allowed: false },
  { role: 'viewer', resource: 'tasks', action: 'create', allowed: false },
  { role: 'viewer', resource: 'tasks', action: 'read', allowed: true },
  { role: 'viewer', resource: 'tasks', action: 'update', allowed: false },
  { role: 'viewer', resource: 'tasks', action: 'delete', allowed: false },
  { role: 'viewer', resource: 'settings', action: 'manage', allowed: false },
];

// In-memory storage for permissions (simulates database)
const permissions = [...defaultPermissions];

// Get all permissions handler
const getPermissionsHandler = http.get(
  `${API_URL}/api/roles`,
  ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(
      '🔍 MSW: GET /api/roles - Auth header:',
      authHeader?.substring(0, 50) + '...',
    );

    return HttpResponse.json(permissions, { status: 200 });
  },
);

// Update permission handler
const updatePermissionHandler = http.put(
  `${API_URL}/api/roles/:role/permissions`,
  async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = params;

    try {
      const body = (await request.json()) as {
        resource: string;
        action: string;
        allowed: boolean;
      };
      const { resource, action, allowed } = body;

      console.log('🔍 MSW: PUT /api/roles/:role/permissions', {
        role,
        resource,
        action,
        allowed,
      });

      // Find existing permission or create new one
      const existingIndex = permissions.findIndex(
        (p) =>
          p.role === role && p.resource === resource && p.action === action,
      );

      if (existingIndex >= 0) {
        // Update existing permission
        permissions[existingIndex] = { ...permissions[existingIndex], allowed };
      } else {
        // Create new permission
        permissions.push({ role: role as string, resource, action, allowed });
      }

      console.log('✅ MSW: Permission updated successfully');

      return HttpResponse.json(
        { success: true, message: 'Permission updated' },
        { status: 200 },
      );
    } catch (error) {
      console.error('❌ MSW: Error updating permission:', error);
      return HttpResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }
  },
);

// Get permissions for specific role
const getRolePermissionsHandler = http.get(
  `${API_URL}/api/roles/:role`,
  ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes('Bearer')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = params;
    const rolePermissions = permissions.filter((p) => p.role === role);

    console.log(
      `🔍 MSW: GET /api/roles/${role} - Found ${rolePermissions.length} permissions`,
    );

    return HttpResponse.json(rolePermissions, { status: 200 });
  },
);

// Export handlers
export const roleHandlers = [
  getPermissionsHandler,
  updatePermissionHandler,
  getRolePermissionsHandler,
];
