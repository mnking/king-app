/**
 * Test Error Handlers
 *
 * These handlers are used in tests to simulate error scenarios.
 * They override the happy-path handlers from @/mocks/handlers.
 *
 * Usage:
 * ```typescript
 * import { setupServer } from 'msw/node'
 * import { containersHandlers } from '@/mocks/handlers/containers'
 * import { containerErrorHandlers } from '@/test/handlers/error-scenarios'
 *
 * const server = setupServer(...containersHandlers)
 *
 * test('handles errors', () => {
 *   server.use(containerErrorHandlers.listServerError)
 *   // Test error handling...
 * })
 * ```
 */

export * from './error-scenarios';
