import { http, HttpResponse, delay } from 'msw';

/**
 * Generic Error Handler Factories
 * These create reusable error handlers for testing various failure scenarios
 */

export const createErrorHandler = (path: string, status: number, message: string) =>
  http.all(path, () =>
    HttpResponse.json({ statusCode: status, message }, { status }),
  );

export const createNetworkErrorHandler = (path: string) =>
  http.all(path, () => HttpResponse.error());

export const createTimeoutHandler = (path: string, delayMs: number = 10000) =>
  http.all(path, async () => {
    await delay(delayMs);
    return HttpResponse.json({ data: [] });
  });

/**
 * Generic Error Handlers
 * Reusable error scenarios for any API path
 */
export const genericErrorHandlers = {
  serverError: (path: string) => createErrorHandler(path, 500, 'Internal server error'),
  notFound: (path: string) => createErrorHandler(path, 404, 'Not found'),
  unauthorized: (path: string) => createErrorHandler(path, 401, 'Unauthorized'),
  forbidden: (path: string) => createErrorHandler(path, 403, 'Forbidden'),
  badRequest: (path: string, message: string) => createErrorHandler(path, 400, message),
  networkError: (path: string) => createNetworkErrorHandler(path),
  timeout: (path: string, delayMs?: number) => createTimeoutHandler(path, delayMs),
};

/**
 * Container Error Handlers
 */
export const containerErrorHandlers = {
  // List errors
  listServerError: createErrorHandler(
    '/api/containers/v1/containers',
    500,
    'Internal server error',
  ),
  listNetworkError: createNetworkErrorHandler('/api/containers/v1/containers'),
  listTimeout: createTimeoutHandler('/api/containers/v1/containers'),

  // Create errors
  createDuplicate: http.post('/api/containers/v1/containers', () =>
    HttpResponse.json(
      { statusCode: 400, message: 'Container number already exists' },
      { status: 400 },
    ),
  ),
  createInvalidType: http.post('/api/containers/v1/containers', () =>
    HttpResponse.json(
      { statusCode: 400, message: 'Invalid container type code' },
      { status: 400 },
    ),
  ),
  createMissingFields: http.post('/api/containers/v1/containers', () =>
    HttpResponse.json({ statusCode: 400, message: 'Missing required fields' }, { status: 400 }),
  ),

  // Get errors
  getNotFound: createErrorHandler(
    '/api/containers/v1/containers/:id',
    404,
    'Container not found',
  ),
  getServerError: createErrorHandler(
    '/api/containers/v1/containers/:id',
    500,
    'Internal server error',
  ),

  // Update errors
  updateNotFound: http.patch('/api/containers/v1/containers/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Container not found' }, { status: 404 }),
  ),
  updateInvalidData: http.patch('/api/containers/v1/containers/:id', () =>
    HttpResponse.json({ statusCode: 400, message: 'Invalid update data' }, { status: 400 }),
  ),

  // Delete errors
  deleteNotFound: http.delete('/api/containers/v1/containers/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Container not found' }, { status: 404 }),
  ),
  deleteConflict: http.delete('/api/containers/v1/containers/:id', () =>
    HttpResponse.json(
      { statusCode: 409, message: 'Cannot delete container in use' },
      { status: 409 },
    ),
  ),
};

/**
 * User Error Handlers
 */
export const userErrorHandlers = {
  // List errors
  listServerError: createErrorHandler('/api/users', 500, 'Internal server error'),
  listNetworkError: createNetworkErrorHandler('/api/users'),
  listUnauthorized: createErrorHandler('/api/users', 401, 'Unauthorized'),

  // Create errors
  createDuplicateEmail: http.post('/api/users', () =>
    HttpResponse.json({ statusCode: 400, message: 'Email already exists' }, { status: 400 }),
  ),
  createInvalidEmail: http.post('/api/users', () =>
    HttpResponse.json({ statusCode: 400, message: 'Invalid email format' }, { status: 400 }),
  ),
  createWeakPassword: http.post('/api/users', () =>
    HttpResponse.json({ statusCode: 400, message: 'Password too weak' }, { status: 400 }),
  ),

  // Get errors
  getNotFound: createErrorHandler('/api/users/:id', 404, 'User not found'),
  getUnauthorized: createErrorHandler('/api/users/:id', 401, 'Unauthorized'),

  // Update errors
  updateNotFound: http.patch('/api/users/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'User not found' }, { status: 404 }),
  ),
  updateDuplicateEmail: http.patch('/api/users/:id', () =>
    HttpResponse.json({ statusCode: 400, message: 'Email already exists' }, { status: 400 }),
  ),

  // Delete errors
  deleteNotFound: http.delete('/api/users/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'User not found' }, { status: 404 }),
  ),
  deleteSelf: http.delete('/api/users/:id', () =>
    HttpResponse.json({ statusCode: 400, message: 'Cannot delete yourself' }, { status: 400 }),
  ),
};

/**
 * Team Error Handlers
 */
export const teamErrorHandlers = {
  // List errors
  listServerError: createErrorHandler('/api/teams', 500, 'Internal server error'),
  listNetworkError: createNetworkErrorHandler('/api/teams'),

  // Create errors
  createDuplicateName: http.post('/api/teams', () =>
    HttpResponse.json({ statusCode: 400, message: 'Team name already exists' }, { status: 400 }),
  ),

  // Get errors
  getNotFound: createErrorHandler('/api/teams/:id', 404, 'Team not found'),

  // Update errors
  updateNotFound: http.patch('/api/teams/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Team not found' }, { status: 404 }),
  ),

  // Delete errors
  deleteNotFound: http.delete('/api/teams/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Team not found' }, { status: 404 }),
  ),
  deleteHasMembers: http.delete('/api/teams/:id', () =>
    HttpResponse.json(
      { statusCode: 409, message: 'Cannot delete team with members' },
      { status: 409 },
    ),
  ),
};

/**
 * Zone/Location Error Handlers
 */
export const zoneLocationErrorHandlers = {
  // Zone list errors
  zoneListServerError: createErrorHandler('/api/zones', 500, 'Internal server error'),
  zoneListNetworkError: createNetworkErrorHandler('/api/zones'),

  // Zone create errors
  zoneCreateDuplicateCode: http.post('/api/zones', () =>
    HttpResponse.json({ statusCode: 400, message: 'Zone code already exists' }, { status: 400 }),
  ),

  // Zone errors
  zoneGetNotFound: createErrorHandler('/api/zones/:id', 404, 'Zone not found'),
  zoneUpdateNotFound: http.patch('/api/zones/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Zone not found' }, { status: 404 }),
  ),
  zoneDeleteNotFound: http.delete('/api/zones/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Zone not found' }, { status: 404 }),
  ),
  zoneDeleteHasLocations: http.delete('/api/zones/:id', () =>
    HttpResponse.json(
      { statusCode: 409, message: 'Cannot delete zone with locations' },
      { status: 409 },
    ),
  ),

  // Location errors
  locationListServerError: createErrorHandler('/api/locations', 500, 'Internal server error'),
  locationGetNotFound: createErrorHandler('/api/locations/:id', 404, 'Location not found'),
  locationCreateInvalidZone: http.post('/api/locations', () =>
    HttpResponse.json({ statusCode: 400, message: 'Invalid zone ID' }, { status: 400 }),
  ),
  locationUpdateNotFound: http.patch('/api/locations/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Location not found' }, { status: 404 }),
  ),
  locationDeleteNotFound: http.delete('/api/locations/:id', () =>
    HttpResponse.json({ statusCode: 404, message: 'Location not found' }, { status: 404 }),
  ),
};

/**
 * Auth Error Handlers
 */
export const authErrorHandlers = {
  loginInvalidCredentials: http.post('/api/auth/login', () =>
    HttpResponse.json(
      { statusCode: 401, message: 'Invalid email or password' },
      { status: 401 },
    ),
  ),
  loginAccountLocked: http.post('/api/auth/login', () =>
    HttpResponse.json({ statusCode: 403, message: 'Account is locked' }, { status: 403 }),
  ),
  loginServerError: createErrorHandler('/api/auth/login', 500, 'Internal server error'),

  refreshTokenExpired: http.post('/api/auth/refresh', () =>
    HttpResponse.json({ statusCode: 401, message: 'Refresh token expired' }, { status: 401 }),
  ),
  refreshTokenInvalid: http.post('/api/auth/refresh', () =>
    HttpResponse.json({ statusCode: 401, message: 'Invalid refresh token' }, { status: 401 }),
  ),

  logoutServerError: createErrorHandler('/api/auth/logout', 500, 'Internal server error'),
};
