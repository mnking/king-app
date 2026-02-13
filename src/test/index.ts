import { vi, expect } from 'vitest';

// Re-export everything from test utilities for easy importing

// Main testing utilities
export * from './utils'

// Test fixtures and mock data
export * from './fixtures'

// MSW test handlers
export * from './msw-handlers'

// Common testing patterns and helpers
export const waitForElementToBeRemoved = async (element: Element) => {
  const { waitForElementToBeRemoved: originalWait } = await import('@testing-library/react');
  return originalWait(element)
};

export const createMockFn = <T extends (...args: any[]) => any>(implementation?: T) => {
  return implementation ? vi.fn(implementation) : vi.fn()
};

// Common test utilities
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const expectElementToBeInDocument = (element: Element) => {
  expect(element).toBeInTheDocument()
};

export const expectElementNotToBeInDocument = (element: Element | null) => {
  expect(element).not.toBeInTheDocument()
};
