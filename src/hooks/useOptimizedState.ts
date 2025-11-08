/**
 * Optimized State Management Hooks
 * Advanced hooks for efficient state management with performance optimizations
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for batched state updates to prevent excessive re-renders
 */
export function useBatchedState<T>(
  initialState: T,
  batchDelay: number = 16 // One frame at 60fps
): [T, (updater: (prev: T) => T) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Array<(prev: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.length > 0) {
      setState(prevState => {
        let newState = prevState;
        for (const update of pendingUpdates.current) {
          newState = update(newState);
        }
        return newState;
      });
      pendingUpdates.current = [];
    }
  }, []);

  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdates.current.push(updater);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(flushUpdates, batchDelay);
  }, [flushUpdates, batchDelay]);

  const forceFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    flushUpdates();
  }, [flushUpdates]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState, forceFlush];
}

/**
 * Hook for computed state with dependency tracking
 */
export function useComputedState<T, D extends readonly any[]>(
  computeFn: (...deps: D) => T,
  dependencies: D
): T {
  return useMemo(() => computeFn(...dependencies), dependencies);
}

/**
 * Hook for lazy state initialization with expensive computations
 */
export function useLazyState<T>(
  initializer: () => T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initializer);
  return [state, setState];
}

/**
 * Hook for state with validation
 */
export function useValidatedState<T>(
  initialValue: T,
  validator: (value: T) => boolean,
  onValidationError?: (value: T) => void
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isValid, setIsValid] = useState<boolean>(true);

  const setValidatedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      const valid = validator(newValue);
      setIsValid(valid);

      if (!valid) {
        onValidationError?.(newValue);
      }

      return newValue;
    });
  }, [validator, onValidationError]);

  return [state, setValidatedState, isValid];
}

/**
 * Hook for state with automatic save to cache
 */
export function useCachedState<T>(
  queryKey: any[],
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const queryClient = useQueryClient();
  
  const cachedValue = queryClient.getQueryData<T>(queryKey);
  const [state, setState] = useState<T>(cachedValue ?? initialValue);

  const setCachedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      queryClient.setQueryData(queryKey, newValue);
      return newValue;
    });
  }, [queryClient, queryKey]);

  return [state, setCachedState];
}

/**
 * Hook for state with automatic persistence
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  storage: Storage = localStorage
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Failed to load persisted state for key "${key}":`, error);
      return initialValue;
    }
  });

  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      try {
        storage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Failed to persist state for key "${key}":`, error);
      }

      return newValue;
    });
  }, [key, storage]);

  const clearPersistedState = useCallback(() => {
    try {
      storage.removeItem(key);
      setState(initialValue);
    } catch (error) {
      console.error(`Failed to clear persisted state for key "${key}":`, error);
    }
  }, [key, storage, initialValue]);

  return [state, setPersistedState, clearPersistedState];
}

/**
 * Hook for state with automatic sync across tabs
 */
export function useSyncedState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue);
          setState(newValue);
        } catch (error) {
          console.error('Failed to parse synced state:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const setSyncedState = useCallback((value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to sync state:', error);
    }
  }, [key]);

  return [state, setSyncedState];
}

/**
 * Hook for state with throttled updates
 */
export function useThrottledState<T>(
  initialValue: T,
  throttleMs: number = 100
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [throttledValue, setThrottledValue] = useState<T>(initialValue);
  const lastUpdate = useRef<number>(0);
  const pendingValue = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateThrottledValue = useCallback(() => {
    if (pendingValue.current !== null) {
      setThrottledValue(pendingValue.current);
      pendingValue.current = null;
    }
    lastUpdate.current = Date.now();
  }, []);

  const setThrottledState = useCallback((newValue: T) => {
    setValue(newValue);
    pendingValue.current = newValue;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate.current;

    if (timeSinceLastUpdate >= throttleMs) {
      updateThrottledValue();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(
        updateThrottledValue,
        throttleMs - timeSinceLastUpdate
      );
    }
  }, [throttleMs, updateThrottledValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, throttledValue, setThrottledState];
}

/**
 * Hook for state with automatic cleanup
 */
export function useCleanupState<T>(
  initialValue: T,
  cleanup: (value: T) => void
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanupRef.current(state);
    };
  }, [state]);

  return [state, setState];
}

/**
 * Hook for coordinated state updates across multiple components
 */
export function useCoordinatedState<T>(
  channel: string,
  initialValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(channel);

      const handleMessage = (event: MessageEvent) => {
        setState(event.data);
      };

      channelRef.current.addEventListener('message', handleMessage);

      return () => {
        channelRef.current?.close();
        channelRef.current = null;
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }, [channel]);

  const setCoordinatedState = useCallback((value: T) => {
    setState(value);
    try {
      channelRef.current?.postMessage(value);
    } catch (error) {
      console.error('Failed to broadcast state update:', error);
    }
  }, []);

  return [state, setCoordinatedState];
}

/**
 * Hook for state with undo/redo functionality
 */
export function useUndoableState<T>(
  initialValue: T,
  maxHistory: number = 50
) {
  const [state, setState] = useState<T>(initialValue);
  const history = useRef<T[]>([initialValue]);
  const currentIndex = useRef(0);

  const updateState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      // Remove any states after current index
      history.current = history.current.slice(0, currentIndex.current + 1);
      
      // Add new state
      history.current.push(newValue);
      
      // Limit history size
      if (history.current.length > maxHistory) {
        history.current.shift();
      } else {
        currentIndex.current++;
      }

      return newValue;
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex.current > 0) {
      currentIndex.current--;
      setState(history.current[currentIndex.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (currentIndex.current < history.current.length - 1) {
      currentIndex.current++;
      setState(history.current[currentIndex.current]);
    }
  }, []);

  const canUndo = currentIndex.current > 0;
  const canRedo = currentIndex.current < history.current.length - 1;

  const reset = useCallback(() => {
    history.current = [initialValue];
    currentIndex.current = 0;
    setState(initialValue);
  }, [initialValue]);

  return {
    state,
    setState: updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  };
}

/**
 * Hook for state with automatic cache invalidation
 */
export function useInvalidatingState<T>(
  initialValue: T,
  queryKeysToInvalidate: any[][]
) {
  const [state, setState] = useState<T>(initialValue);
  const queryClient = useQueryClient();

  const setInvalidatingState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      // Invalidate related queries
      queryKeysToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      return newValue;
    });
  }, [queryClient, queryKeysToInvalidate]);

  return [state, setInvalidatingState];
}

/**
 * Hook for state that automatically saves drafts
 */
export function useDraftState<T>(
  key: string,
  initialValue: T,
  autoSaveDelay: number = 1000
): [T, (value: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [state, setState] = useState<T>(() => {
    try {
      const draft = localStorage.getItem(`draft-${key}`);
      return draft ? JSON.parse(draft) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const saveDraft = useCallback((value: T) => {
    try {
      localStorage.setItem(`draft-${key}`, JSON.stringify(value));
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [key]);

  const setDraftState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;

      setIsDirty(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        saveDraft(newValue);
      }, autoSaveDelay);

      return newValue;
    });
  }, [saveDraft, autoSaveDelay]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`draft-${key}`);
      setState(initialValue);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setDraftState, clearDraft, isDirty];
}

/**
 * Hook for managing form state with validation
 */
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validators?: Partial<Record<keyof T, (value: any) => string | null>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => {
      const newValues = { ...prev, [field]: value };
      setIsDirty(true);

      // Validate if validator exists
      if (validators?.[field]) {
        const error = validators[field]!(value);
        setErrors(prevErrors => ({
          ...prevErrors,
          [field]: error || undefined
        }));
      }

      return newValues;
    });
  }, [validators]);

  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const validateField = useCallback((field: keyof T): boolean => {
    if (!validators?.[field]) return true;

    const error = validators[field]!(values[field]);
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }));

    return !error;
  }, [validators, values]);

  const validateAll = useCallback((): boolean => {
    if (!validators) return true;

    let isValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const field in validators) {
      const error = validators[field as keyof T]!(values[field]);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validators, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    setValue,
    setFieldTouched,
    validateField,
    validateAll,
    reset
  };
}

/**
 * Hook for managing array state with common operations
 */
export function useArrayState<T>(initialArray: T[] = []) {
  const [array, setArray] = useState<T[]>(initialArray);

  const push = useCallback((item: T) => {
    setArray(prev => [...prev, item]);
  }, []);

  const pop = useCallback(() => {
    setArray(prev => prev.slice(0, -1));
  }, []);

  const shift = useCallback(() => {
    setArray(prev => prev.slice(1));
  }, []);

  const unshift = useCallback((item: T) => {
    setArray(prev => [item, ...prev]);
  }, []);

  const removeAt = useCallback((index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateAt = useCallback((index: number, value: T) => {
    setArray(prev => prev.map((item, i) => i === index ? value : item));
  }, []);

  const insertAt = useCallback((index: number, value: T) => {
    setArray(prev => [
      ...prev.slice(0, index),
      value,
      ...prev.slice(index)
    ]);
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const reverse = useCallback(() => {
    setArray(prev => [...prev].reverse());
  }, []);

  const sort = useCallback((compareFn?: (a: T, b: T) => number) => {
    setArray(prev => [...prev].sort(compareFn));
  }, []);

  const filter = useCallback((predicate: (item: T, index: number) => boolean) => {
    setArray(prev => prev.filter(predicate));
  }, []);

  const map = useCallback(<U>(mapper: (item: T, index: number) => U) => {
    return array.map(mapper);
  }, [array]);

  return {
    array,
    setArray,
    push,
    pop,
    shift,
    unshift,
    removeAt,
    updateAt,
    insertAt,
    clear,
    reverse,
    sort,
    filter,
    map,
    length: array.length
  };
}

/**
 * Hook for managing set state
 */
export function useSetState<T>(initialSet: Set<T> = new Set()) {
  const [set, setSet] = useState<Set<T>>(initialSet);

  const add = useCallback((item: T) => {
    setSet(prev => new Set([...prev, item]));
  }, []);

  const remove = useCallback((item: T) => {
    setSet(prev => {
      const newSet = new Set(prev);
      newSet.delete(item);
      return newSet;
    });
  }, []);

  const toggle = useCallback((item: T) => {
    setSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  const clear = useCallback(() => {
    setSet(new Set());
  }, []);

  const has = useCallback((item: T) => {
    return set.has(item);
  }, [set]);

  return {
    set,
    setSet,
    add,
    remove,
    toggle,
    clear,
    has,
    size: set.size,
    values: Array.from(set)
  };
}

/**
 * Hook for managing map state
 */
export function useMapState<K, V>(initialMap: Map<K, V> = new Map()) {
  const [map, setMap] = useState<Map<K, V>>(initialMap);

  const set = useCallback((key: K, value: V) => {
    setMap(prev => new Map(prev).set(key, value));
  }, []);

  const remove = useCallback((key: K) => {
    setMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const clear = useCallback(() => {
    setMap(new Map());
  }, []);

  const get = useCallback((key: K): V | undefined => {
    return map.get(key);
  }, [map]);

  const has = useCallback((key: K): boolean => {
    return map.has(key);
  }, [map]);

  return {
    map,
    setMap,
    set,
    get,
    remove,
    clear,
    has,
    size: map.size,
    keys: Array.from(map.keys()),
    values: Array.from(map.values()),
    entries: Array.from(map.entries())
  };
}

export default {
  useBatchedState,
  useComputedState,
  useLazyState,
  useValidatedState,
  useCachedState,
  usePersistedState,
  useSyncedState,
  useThrottledState,
  useCleanupState,
  useCoordinatedState,
  useUndoableState,
  useInvalidatingState,
  useDraftState,
  useFormState,
  useArrayState,
  useSetState,
  useMapState
};