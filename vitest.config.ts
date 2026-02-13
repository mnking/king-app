import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/pages': path.resolve(__dirname, './src/pages'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Memory optimization settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Allow parallel but isolated
      }
    },
    maxWorkers: 2, // Limit concurrent workers to reduce memory pressure
    minWorkers: 1,
    isolate: true, // Each test file in separate process
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test/**',
        '**/index.ts',
        'src/mocks/**',
        'src/main.tsx',
        'dist/',
        'coverage/',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
    // Include test files (exclude E2E tests)
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    // Exclude files
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.cache',
      // Exclude E2E tests (they use Playwright) - pattern-based exclusion
      '**/*.e2e.test.ts',
      '**/*.e2e.test.tsx',
      'e2e/**',
      // Exclude test utils/helpers (not test suites)
      '**/__tests__/utils/**',
      '**/test-utils.ts',
      '**/test-data-factory.ts',
      // Exclude integration tests by default (they require backend at http://localhost:8000)
      // To run integration tests, use: RUN_INTEGRATION_TESTS=true npm test
      ...(process.env.RUN_INTEGRATION_TESTS !== 'true' ? ['**/*.integration.test.*'] : []),
    ],
  },
})