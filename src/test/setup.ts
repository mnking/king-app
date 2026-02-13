import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Setup and teardown for tests that may need it
beforeAll(() => {
  // Global setup if needed
})

afterAll(() => {
  // Global cleanup if needed
})

// Mock IntersectionObserver (often needed for UI components)
global.IntersectionObserver = class MockIntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return [] }
}

// Mock ResizeObserver (needed for some chart/layout components)
global.ResizeObserver = class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia (needed for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock localStorage with a proper in-memory implementation
const createStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createStorage(),
})

Object.defineProperty(window, 'sessionStorage', {
  value: createStorage(),
})