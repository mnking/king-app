import { useState } from 'react';

/**
 * Custom hook for managing localStorage with TypeScript support
 * @param key - The localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Remove value from localStorage
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing user preferences in localStorage
 */
export function useUserPreferences() {
  const [preferences, setPreferences, removePreferences] = useLocalStorage(
    'userPreferences',
    {
      theme: 'light' as 'light' | 'dark',
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
        defaultView: 'grid' as 'grid' | 'list',
        itemsPerPage: 10,
      },
    },
  );

  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: (typeof preferences)[K],
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedPreference = <
    K extends keyof typeof preferences,
    NK extends keyof (typeof preferences)[K],
  >(
    key: K,
    nestedKey: NK,
    value: (typeof preferences)[K][NK],
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [nestedKey]: value,
      },
    }));
  };

  return {
    preferences,
    updatePreference,
    updateNestedPreference,
    resetPreferences: removePreferences,
  };
}
