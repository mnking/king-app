// Shared role type definitions
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type TeamRole = 'lead' | 'member';

// Role hierarchy for permissions (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

// Check if user has required role or higher
export const hasRoleAccess = (
  userRole: UserRole,
  requiredRole: UserRole,
): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};
