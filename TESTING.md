# Testing Guide

This document explains how to write and run tests in the TOS Platform frontend.

## Overview

We use a modern testing stack following the testing pyramid:

- **60-70% Unit Tests** (what this setup provides)
- **20-30% Integration Tests** (existing E2E tests)
- **5-10% E2E Tests** (existing Playwright tests)

## Testing Stack

- **[Vitest](https://vitest.dev/)** - Fast, Vite-native test runner
- **[React Testing Library](https://testing-library.com/react)** - Component testing utilities
- **[@testing-library/jest-dom](https://github.com/testing-library/jest-dom)** - Extended DOM matchers
- **[jsdom](https://github.com/jsdom/jsdom)** - Browser environment for tests

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Writing Your First Test

1. Create a test file next to your source file:
   ```
   src/utils/myFunction.ts
   src/utils/__tests__/myFunction.test.ts
   ```

2. Import test utilities:
   ```typescript
   import { describe, it, expect } from 'vitest'
   // For component tests:
   import { render, screen, userEvent } from '@/test'
   ```

3. Write tests using the AAA pattern:
   ```typescript
   describe('myFunction', () => {
     it('should return expected result when given valid input', () => {
       // Arrange
       const input = 'test'

       // Act
       const result = myFunction(input)

       // Assert
       expect(result).toBe('expected')
     })
   })
   ```

## Test Categories

### 1. Pure Function Tests
Test utilities, helpers, and business logic functions.

```typescript
// src/shared/utils/__tests__/validation.test.ts
import { validateEmail } from '../validation'

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

### 2. Schema Tests (Zod)
Test validation schemas thoroughly - these prevent bad data.

```typescript
// src/features/users/schemas/__tests__/user-schemas.test.ts
import { UserCreateSchema } from '../user-schemas'

describe('UserCreateSchema', () => {
  it('should validate correct user data', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
    }

    const result = UserCreateSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })
})
```

### 3. Hook Tests
Test custom React hooks using `renderHook`.

```typescript
// src/shared/hooks/__tests__/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

describe('useLocalStorage', () => {
  it('should store and retrieve values', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'))

    act(() => {
      result.current[1]('new value')
    })

    expect(result.current[0]).toBe('new value')
  })
})
```

### 4. Component Tests
Test component behavior, not implementation.

```typescript
// src/shared/components/__tests__/Button.test.tsx
import { render, screen, userEvent } from '@/test'
import { Button } from '../Button'

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

## Test Utilities

### Custom Render
Use our custom render that includes providers:

```typescript
import { render, screen } from '@/test'

// Automatically wraps with QueryClient, Router, etc.
render(<MyComponent />)
```

### Mock Data
Use our fixture factories for consistent test data:

```typescript
import { createMockUser, createMockTeam } from '@/test'

const user = createMockUser({ name: 'Custom Name' })
const team = createMockTeam({ name: 'Custom Team' })
```

### MSW Handlers
Override API responses for specific tests:

```typescript
import { testHandlers } from '@/test'

// Use in beforeEach or individual tests
server.use(testHandlers.users.createSuccess)
```

## Best Practices

### ✅ Do's

- **Test behavior, not implementation**
- **Use descriptive test names**: `should_[expected]_when_[condition]`
- **Follow AAA pattern**: Arrange, Act, Assert
- **Test edge cases**: empty strings, null values, error states
- **Mock external dependencies**: APIs, localStorage, timers
- **Keep tests isolated**: Each test should be independent

### ❌ Don'ts

- **Don't test third-party libraries**
- **Don't test implementation details**
- **Don't create overly complex test setups**
- **Don't skip error cases**
- **Don't test the same logic multiple times**

### Test Organization

**Standard**: All test files MUST be placed in `__tests__/` directories within their respective feature/component folders.

```
src/
├── features/
│   ├── containers/
│   │   ├── components/
│   │   │   └── ContainerNumberPicker/
│   │   │       ├── __tests__/
│   │   │       │   └── ContainerNumberPicker.test.tsx
│   │   │       ├── ContainerNumberPicker.tsx
│   │   │       └── index.ts
│   │   ├── schemas/
│   │   │   ├── __tests__/
│   │   │   │   └── container-picker.schema.test.ts
│   │   │   └── container-picker.schema.ts
│   │   └── __tests__/
│   │       └── use-containers-query.test.tsx
├── shared/
│   ├── hooks/__tests__/
│   │   └── useLocalStorage.test.ts        # ✅ 100% coverage
│   ├── utils/
│   │   └── container/__tests__/
│   │       └── iso6346-validator.test.ts
│   └── components/
│       ├── forms/__tests__/
│       │   └── FormSelect.test.tsx
│       └── ui/__tests__/
│           ├── Button.test.tsx
│           ├── Input.test.tsx
│           ├── LoadingSpinner.test.tsx
│           ├── ConfirmDialog.test.tsx
│           └── tabs.test.tsx
└── test/                                  # Test utilities
    ├── setup.ts
    ├── utils.tsx
    ├── fixtures/
    └── msw-handlers.ts
```

**Why `__tests__/` directories?**
- Clear separation between source and test files
- Consistent structure across the codebase
- Easy to identify test files in file explorers
- Follows common React/Jest conventions
- Aligns with testing documentation (see `docs/testing/02-architecture-strategy.md`)

## Debugging Tests

### VS Code Integration
1. Install the [Vitest Runner](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) extension
2. Click the debug icon next to any test
3. Set breakpoints in your test or source code

### Command Line Debugging
```bash
# Run a specific test file
npm test src/utils/__tests__/validation.test.ts

# Run tests matching a pattern
npm test -- --grep "validation"

# Run with verbose output
npm test -- --reporter=verbose
```

## Coverage Guidelines

### Targets
- **Overall**: 50% minimum (will increase as we add more tests)
- **Critical paths**: 80%+ (auth, validation, data processing)
- **New code**: 80%+ required

### Viewing Coverage
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report (more detailed)
open coverage/index.html
```

### What to Prioritize
1. **Business logic** (validation, calculations, data transformations)
2. **Error handling** (user input validation, API error states)
3. **User interactions** (form submissions, button clicks)
4. **State management** (stores, reducers, complex state updates)

## CI/CD Integration

Tests run automatically on:
- **Pull requests** - All tests must pass
- **Main branch pushes** - Includes coverage reporting
- **Release builds** - Full test suite + coverage validation

### GitHub Actions
Our CI pipeline includes:
1. Install dependencies
2. Run type checking (`npm run type-check`)
3. Run linting (`npm run lint`)
4. Run unit tests (`npm run test:run`)
5. Generate coverage report
6. Build application (`npm run build`)

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
- Check your import paths use the `@/` alias
- Ensure the file exists and is exported correctly

**2. "localStorage is not defined"**
- Our setup mocks localStorage automatically
- Check `src/test/setup.ts` for mock implementations

**3. "act() warning" messages**
- Wrap state updates in `act()` from `@testing-library/react`
- This ensures React processes all updates before assertions

**4. Tests pass locally but fail in CI**
- Check for timing issues - use `waitFor()` for async operations
- Ensure tests don't depend on external services

### Getting Help

1. Check existing tests for similar patterns
2. Review this guide and linked documentation
3. Ask the team in our development channel

---

## Examples Repository

The `src/test/` directory contains:
- ✅ **Working examples** of all test patterns
- ✅ **Reusable utilities** for common testing scenarios
- ✅ **Mock factories** for consistent test data
- ✅ **Best practices** implemented in real code

Start by reading the existing tests to understand our patterns, then use them as templates for your own tests.

---

## Recent Changes

### 2025-10-03: Test File Organization Standardization

All test files have been reorganized to follow the `__tests__/` directory convention:

**Files moved:**
- `ContainerNumberPicker.test.tsx` → `ContainerNumberPicker/__tests__/ContainerNumberPicker.test.tsx`
- `container-picker.schema.test.ts` → `schemas/__tests__/container-picker.schema.test.ts`
- `Button.test.tsx` → `ui/__tests__/Button.test.tsx`
- `Input.test.tsx` → `ui/__tests__/Input.test.tsx`
- `LoadingSpinner.test.tsx` → `ui/__tests__/LoadingSpinner.test.tsx`
- `iso6346-validator.test.ts` → `container/__tests__/iso6346-validator.test.ts`

All import paths have been updated accordingly. Type checking and tests pass successfully.