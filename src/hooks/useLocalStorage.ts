import { useState, useEffect } from 'react';

/**
 * Generic hook for managing localStorage state
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  }
) {
  const serialize = serializer?.serialize || JSON.stringify;
  const deserialize = serializer?.deserialize || JSON.parse;

  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return defaultValue;
      }

      // Validate that the item is valid JSON
      const parsed = deserialize(item);

      // For arrays, ensure it's actually an array
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        console.warn(`Invalid data format for ${key}, expected array, got:`, typeof parsed);
        return defaultValue;
      }

      return parsed;
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);

      // If there's an error parsing, try to clear the corrupted data
      try {
        localStorage.removeItem(key);
        console.log(`Removed corrupted data for ${key}`);
      } catch (clearError) {
        console.error(`Failed to clear corrupted data for ${key}:`, clearError);
      }

      return defaultValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);

      // Validate data before storing
      if (Array.isArray(defaultValue) && !Array.isArray(valueToStore)) {
        throw new Error(`Invalid data type for ${key}: expected array`);
      }

      localStorage.setItem(key, serialize(valueToStore));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);

      // Show user-friendly error message
      if (error instanceof Error) {
        console.error(`Storage error for ${key}:`, error.message);
      }
    }
  };

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = deserialize(e.newValue);

          // Validate the data format
          if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(`Invalid data format for ${key} from storage event, expected array`);
            return;
          }

          setState(parsed);
        } catch (error) {
          console.warn(`Failed to sync ${key} from localStorage:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, defaultValue]);

  // Add a function to manually refresh from localStorage
  const refresh = () => {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        setState(defaultValue);
        return;
      }

      const parsed = deserialize(item);

      // Validate the data format
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        console.warn(`Invalid data format for ${key} during refresh, expected array`);
        setState(defaultValue);
        return;
      }

      setState(parsed);
    } catch (error) {
      console.warn(`Failed to refresh ${key} from localStorage:`, error);
      setState(defaultValue);
    }
  };

  return [state, setValue, refresh] as const;
}