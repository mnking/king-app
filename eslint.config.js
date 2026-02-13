import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import checkFile from 'eslint-plugin-check-file';
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'public/mockServiceWorker.js', 'coverage/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      'check-file': checkFile,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript pragmatism for app code
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-useless-catch': 'warn',
      // Import restrictions for architecture boundaries
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Prevent features from importing from app
            {
              target: './src/features',
              from: './src/app',
            },
            // Prevent cross-feature imports
            {
              target: './src/features/auth',
              from: './src/features',
              except: ['./auth'],
            },
            {
              target: './src/features/projects',
              from: './src/features',
              except: ['./projects'],
            },
            {
              target: './src/features/tasks',
              from: './src/features',
              except: ['./tasks'],
            },
            {
              target: './src/features/teams',
              from: './src/features',
              except: ['./teams'],
            },
            {
              target: './src/features/users',
              from: './src/features',
              except: ['./users'],
            },
            // Prevent shared from importing features/app
            {
              target: ['./src/shared'],
              from: ['./src/features', './src/app'],
            },
          ],
        },
      ],
      // Naming conventions - adjusted for existing codebase
      // Suppress strict filename/folder naming to reduce noise
      'check-file/filename-naming-convention': 'off',
      'check-file/folder-naming-convention': 'off',
    },
  },
  // Vitest + React Testing Library configuration
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    ignores: ['**/*.e2e.test.{ts,tsx}', 'e2e/**'],
    plugins: {
      vitest,
      'testing-library': testingLibrary,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs.react.rules,
      // Relax new strictness introduced by @vitest/eslint-plugin v1
      'vitest/prefer-called-exactly-once-with': 'off',
      'vitest/expect-expect': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'testing-library/await-async-queries': 'error',
      'testing-library/no-wait-for-multiple-assertions': 'error',
    },
  },
  // Playwright E2E test configuration (no testing-library rules)
  {
    files: ['**/*.e2e.test.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
