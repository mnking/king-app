// Application constants
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TEAMS: '/teams',
  USERS: '/users',
  ADMIN: '/admin',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type RouteKey = (typeof ROUTES)[keyof typeof ROUTES];
