import { http, HttpResponse } from 'msw'
import { createMockApiResponse, createMockUser, createMockProject } from './fixtures'

// Test-specific MSW handlers
// These can be used to override default handlers for specific tests

export const testHandlers = {
  // Auth handlers
  auth: {
    loginSuccess: http.post('/auth/login', () => {
      return HttpResponse.json(createMockApiResponse.success({
        user: createMockUser(),
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      }))
    }),

    loginError: http.post('/auth/login', () => {
      return HttpResponse.json(
        createMockApiResponse.error('Invalid credentials', 'INVALID_CREDENTIALS'),
        { status: 401 }
      )
    }),

    refreshSuccess: http.post('/auth/refresh', () => {
      return HttpResponse.json(createMockApiResponse.success({
        accessToken: 'new-access-token',
        expiresIn: 3600,
      }))
    }),

    refreshError: http.post('/auth/refresh', () => {
      return HttpResponse.json(
        createMockApiResponse.error('Invalid refresh token', 'INVALID_REFRESH_TOKEN'),
        { status: 401 }
      )
    }),
  },

  // Users handlers
  users: {
    listSuccess: http.get('/api/users', () => {
      return HttpResponse.json(createMockApiResponse.paginated([
        createMockUser({ id: '1', username: 'user1' }),
        createMockUser({ id: '2', username: 'user2' }),
      ]))
    }),

    createSuccess: http.post('/api/users', () => {
      return HttpResponse.json(createMockApiResponse.success(
        createMockUser({ id: '3', username: 'newuser' })
      ))
    }),

    updateSuccess: http.put('/api/users/:id', ({ params }) => {
      return HttpResponse.json(createMockApiResponse.success(
        createMockUser({ id: params.id as string })
      ))
    }),

    deleteSuccess: http.delete('/api/users/:id', () => {
      return HttpResponse.json(createMockApiResponse.success(null))
    }),
  },

  // Projects handlers
  projects: {
    listSuccess: http.get('/api/projects', () => {
      return HttpResponse.json(createMockApiResponse.paginated([
        createMockProject({ id: '1', name: 'Project 1' }),
        createMockProject({ id: '2', name: 'Project 2' }),
      ]))
    }),

    createSuccess: http.post('/api/projects', () => {
      return HttpResponse.json(createMockApiResponse.success(
        createMockProject({ id: '3', name: 'New Project' })
      ))
    }),

    updateSuccess: http.put('/api/projects/:id', ({ params }) => {
      return HttpResponse.json(createMockApiResponse.success(
        createMockProject({ id: params.id as string })
      ))
    }),

    deleteSuccess: http.delete('/api/projects/:id', () => {
      return HttpResponse.json(createMockApiResponse.success(null))
    }),
  },

  // Generic error handlers
  errors: {
    serverError: (path: string) => http.all(path, () => {
      return HttpResponse.json(
        createMockApiResponse.error('Internal server error', 'SERVER_ERROR'),
        { status: 500 }
      )
    }),

    networkError: (path: string) => http.all(path, () => {
      return HttpResponse.error()
    }),

    notFound: (path: string) => http.all(path, () => {
      return HttpResponse.json(
        createMockApiResponse.error('Resource not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }),

    unauthorized: (path: string) => http.all(path, () => {
      return HttpResponse.json(
        createMockApiResponse.error('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }),

    forbidden: (path: string) => http.all(path, () => {
      return HttpResponse.json(
        createMockApiResponse.error('Forbidden', 'FORBIDDEN'),
        { status: 403 }
      )
    }),
  },
}

// Helper function to create custom handlers for tests
export const createTestServer = () => {
  // This can be extended to set up a test server with custom handlers
  // For now, we'll export the handlers for manual setup in tests
  return testHandlers
}