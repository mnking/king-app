import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, useUserPreferences } from '../useLocalStorage'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock console.warn to avoid noise in tests
const consoleWarnMock = vi.fn()

beforeEach(() => {
  // Reset mocks
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  consoleWarnMock.mockClear()

  // Replace global localStorage and console.warn
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  global.console.warn = consoleWarnMock
})

describe('useLocalStorage', () => {
  describe('initialization', () => {
    it('should return initial value when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'))

      expect(result.current[0]).toBe('initial-value')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should return parsed value from localStorage when available', () => {
      const storedValue = { name: 'John', age: 30 }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))

      const { result } = renderHook(() => useLocalStorage('user', {}))

      expect(result.current[0]).toEqual(storedValue)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user')
    })

    it('should return initial value and warn when JSON parsing fails', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json{')

      const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))

      expect(result.current[0]).toBe('fallback')
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      )
    })

    it('should handle different data types', () => {
      // Test with number
      localStorageMock.getItem.mockReturnValue('42')
      const { result: numberResult } = renderHook(() => useLocalStorage('number', 0))
      expect(numberResult.current[0]).toBe(42)

      // Test with boolean
      localStorageMock.getItem.mockReturnValue('true')
      const { result: boolResult } = renderHook(() => useLocalStorage('bool', false))
      expect(boolResult.current[0]).toBe(true)

      // Test with array
      localStorageMock.getItem.mockReturnValue('[1,2,3]')
      const { result: arrayResult } = renderHook(() => useLocalStorage('array', []))
      expect(arrayResult.current[0]).toEqual([1, 2, 3])
    })
  })

  describe('setValue', () => {
    it('should update state and localStorage with new value', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

      act(() => {
        result.current[1]('new-value')
      })

      expect(result.current[0]).toBe('new-value')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('new-value')
      )
    })

    it('should work with function updater', () => {
      localStorageMock.getItem.mockReturnValue('5')

      const { result } = renderHook(() => useLocalStorage('counter', 0))

      act(() => {
        result.current[1]((prev) => prev + 1)
      })

      expect(result.current[0]).toBe(6)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'counter',
        JSON.stringify(6)
      )
    })

    it('should handle complex objects', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useLocalStorage('user', {}))
      const newUser = { name: 'Jane', age: 25, settings: { theme: 'dark' } }

      act(() => {
        result.current[1](newUser)
      })

      expect(result.current[0]).toEqual(newUser)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(newUser)
      )
    })

    it('should warn when localStorage.setItem fails', () => {
      localStorageMock.getItem.mockReturnValue(null)
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

      act(() => {
        result.current[1]('new-value')
      })

      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new-value')
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(Error)
      )
    })
  })

  describe('removeValue', () => {
    it('should remove value from localStorage and reset to initial value', () => {
      localStorageMock.getItem.mockReturnValue('"stored-value"')

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

      // Verify initial state
      expect(result.current[0]).toBe('stored-value')

      act(() => {
        result.current[2]() // removeValue
      })

      expect(result.current[0]).toBe('initial')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should warn when localStorage.removeItem fails', () => {
      localStorageMock.getItem.mockReturnValue('"stored-value"')
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Failed to remove')
      })

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

      act(() => {
        result.current[2]() // removeValue
      })

      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Error removing localStorage key "test-key":',
        expect.any(Error)
      )
    })
  })
})

describe('useUserPreferences', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should initialize with default preferences', () => {
    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.preferences).toEqual({
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        taskUpdates: true,
        teamInvites: true,
        projectDeadlines: true,
      },
      dashboard: {
        showCompletedTasks: false,
        defaultView: 'grid',
        itemsPerPage: 10,
      },
    })
  })

  it('should load existing preferences from localStorage', () => {
    const existingPrefs = {
      theme: 'dark',
      language: 'es',
      notifications: {
        email: false,
        push: true,
        taskUpdates: false,
        teamInvites: true,
        projectDeadlines: false,
      },
      dashboard: {
        showCompletedTasks: true,
        defaultView: 'list',
        itemsPerPage: 20,
      },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(existingPrefs))

    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.preferences).toEqual(existingPrefs)
  })

  describe('updatePreference', () => {
    it('should update top-level preference', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.updatePreference('theme', 'dark')
      })

      expect(result.current.preferences.theme).toBe('dark')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userPreferences',
        expect.stringContaining('"theme":"dark"')
      )
    })

    it('should update language preference', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.updatePreference('language', 'fr')
      })

      expect(result.current.preferences.language).toBe('fr')
    })
  })

  describe('updateNestedPreference', () => {
    it('should update notification preferences', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.updateNestedPreference('notifications', 'email', false)
      })

      expect(result.current.preferences.notifications.email).toBe(false)
      expect(result.current.preferences.notifications.push).toBe(true) // Other values preserved
    })

    it('should update dashboard preferences', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.updateNestedPreference('dashboard', 'defaultView', 'list')
      })

      expect(result.current.preferences.dashboard.defaultView).toBe('list')
      expect(result.current.preferences.dashboard.itemsPerPage).toBe(10) // Other values preserved
    })

    it('should update dashboard items per page', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.updateNestedPreference('dashboard', 'itemsPerPage', 25)
      })

      expect(result.current.preferences.dashboard.itemsPerPage).toBe(25)
    })
  })

  describe('resetPreferences', () => {
    it('should call localStorage.removeItem when reset is called', () => {
      const { result } = renderHook(() => useUserPreferences())

      act(() => {
        result.current.resetPreferences()
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userPreferences')
    })

    // Note: Full reset functionality is tested at the useLocalStorage level
    // The resetPreferences function delegates to the removeValue function
    // which is already thoroughly tested above
  })
})
