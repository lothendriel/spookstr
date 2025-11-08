/**
 * State Management Utilities
 * Advanced state management patterns for global state, offline support, and synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// State persistence utilities
export const StatePersistence = {
  /**
   * Save state to localStorage with automatic JSON serialization
   */
  save: <T>(key: string, value: T): void => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to save state for key "${key}":`, error);
    }
  },

  /**
   * Load state from localStorage with automatic JSON deserialization
   */
  load: <T>(key: string, defaultValue: T): T => {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) {
        return defaultValue;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error(`Failed to load state for key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Remove state from localStorage
   */
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove state for key "${key}":`, error);
    }
  },

  /**
   * Clear all state from localStorage
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },

  /**
   * Get all keys matching a prefix
   */
  getKeys: (prefix: string): string[] => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Failed to get keys from localStorage:', error);
      return [];
    }
  }
};

// Hook for persistent state
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => 
    StatePersistence.load(key, defaultValue)
  );

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;
      
      StatePersistence.save(key, newValue);
      return newValue;
    });
  }, [key]);

  const clearState = useCallback(() => {
    StatePersistence.remove(key);
    setState(defaultValue);
  }, [key, defaultValue]);

  return [state, setPersistentState, clearState];
}

// Offline state management
export class OfflineStateManager {
  private static instance: OfflineStateManager;
  private pendingActions: Array<{
    id: string;
    action: () => Promise<void>;
    timestamp: number;
    retries: number;
  }> = [];
  private isOnline = navigator.onLine;
  private listeners = new Set<(isOnline: boolean) => void>();

  private constructor() {
    this.setupEventListeners();
    this.loadPendingActions();
  }

  static getInstance(): OfflineStateManager {
    if (!OfflineStateManager.instance) {
      OfflineStateManager.instance = new OfflineStateManager();
    }
    return OfflineStateManager.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
      this.processPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  private loadPendingActions() {
    const stored = StatePersistence.load<typeof this.pendingActions>(
      'offline-pending-actions',
      []
    );
    this.pendingActions = stored;
  }

  private savePendingActions() {
    StatePersistence.save('offline-pending-actions', this.pendingActions);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  onStatusChange(callback: (isOnline: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  addPendingAction(action: () => Promise<void>): string {
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.pendingActions.push({
      id,
      action,
      timestamp: Date.now(),
      retries: 0
    });

    this.savePendingActions();

    if (this.isOnline) {
      this.processPendingActions();
    }

    return id;
  }

  private async processPendingActions() {
    if (!this.isOnline || this.pendingActions.length === 0) return;

    const actionsToProcess = [...this.pendingActions];
    
    for (const pending of actionsToProcess) {
      try {
        await pending.action();
        
        // Remove successful action
        this.pendingActions = this.pendingActions.filter(a => a.id !== pending.id);
      } catch (error) {
        console.error('Failed to process pending action:', error);
        
        // Increment retries
        const action = this.pendingActions.find(a => a.id === pending.id);
        if (action) {
          action.retries++;
          
          // Remove after 3 retries
          if (action.retries >= 3) {
            this.pendingActions = this.pendingActions.filter(a => a.id !== pending.id);
          }
        }
      }
    }

    this.savePendingActions();
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.length
    };
  }

  clearPendingActions() {
    this.pendingActions = [];
    this.savePendingActions();
  }
}

// Hook for offline state management
export function useOfflineState() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const manager = useRef(OfflineStateManager.getInstance());

  useEffect(() => {
    const unsubscribe = manager.current.onStatusChange((online) => {
      setIsOnline(online);
      const status = manager.current.getStatus();
      setPendingCount(status.pendingActions);
    });

    return unsubscribe;
  }, []);

  const queueAction = useCallback(async (action: () => Promise<void>) => {
    const id = manager.current.addPendingAction(action);
    const status = manager.current.getStatus();
    setPendingCount(status.pendingActions);
    return id;
  }, []);

  const clearPending = useCallback(() => {
    manager.current.clearPendingActions();
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    pendingCount,
    queueAction,
    clearPending
  };
}

// Real-time synchronization manager
export class RealtimeSyncManager {
  private static instance: RealtimeSyncManager;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private syncIntervals = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager();
    }
    return RealtimeSyncManager.instance;
  }

  subscribe<T>(channel: string, callback: (data: T) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(callback);

    return () => {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(callback);
        
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
          this.stopSync(channel);
        }
      }
    };
  }

  publish<T>(channel: string, data: T): void {
    const channelSubs = this.subscriptions.get(channel);
    if (channelSubs) {
      channelSubs.forEach(callback => callback(data));
    }
  }

  startSync(channel: string, fetchFn: () => Promise<any>, interval: number): void {
    if (this.syncIntervals.has(channel)) {
      return; // Already syncing
    }

    const syncInterval = setInterval(async () => {
      try {
        const data = await fetchFn();
        this.publish(channel, data);
      } catch (error) {
        console.error(`Sync error for channel "${channel}":`, error);
      }
    }, interval);

    this.syncIntervals.set(channel, syncInterval);
  }

  stopSync(channel: string): void {
    const interval = this.syncIntervals.get(channel);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(channel);
    }
  }

  stopAllSync(): void {
    this.syncIntervals.forEach((interval, channel) => {
      clearInterval(interval);
    });
    this.syncIntervals.clear();
  }
}

// Hook for real-time synchronization
export function useRealtimeSync<T>(
  channel: string,
  fetchFn: () => Promise<T>,
  options: {
    interval?: number;
    enabled?: boolean;
    onUpdate?: (data: T) => void;
  } = {}
) {
  const { interval = 5000, enabled = true, onUpdate } = options;
  const [data, setData] = useState<T | null>(null);
  const manager = useRef(RealtimeSyncManager.getInstance());

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = manager.current.subscribe<T>(channel, (newData) => {
      setData(newData);
      onUpdate?.(newData);
    });

    manager.current.startSync(channel, fetchFn, interval);

    return () => {
      unsubscribe();
      manager.current.stopSync(channel);
    };
  }, [channel, enabled, interval]);

  return { data, manager: manager.current };
}

// Optimistic update manager
export class OptimisticUpdateManager {
  private queryClient: any;
  private pendingUpdates = new Map<string, any>();

  constructor(queryClient: any) {
    this.queryClient = queryClient;
  }

  async update<T>(
    queryKey: any[],
    updateFn: (old: T | undefined) => T,
    action: () => Promise<void>
  ): Promise<void> {
    const key = JSON.stringify(queryKey);
    
    // Cancel any outgoing refetches
    await this.queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousValue = this.queryClient.getQueryData<T>(queryKey);
    this.pendingUpdates.set(key, previousValue);

    // Optimistically update
    this.queryClient.setQueryData<T>(queryKey, updateFn);

    try {
      await action();
      
      // Success - remove pending update
      this.pendingUpdates.delete(key);
    } catch (error) {
      // Rollback on error
      if (this.pendingUpdates.has(key)) {
        this.queryClient.setQueryData<T>(queryKey, this.pendingUpdates.get(key));
        this.pendingUpdates.delete(key);
      }
      
      throw error;
    }
  }

  async batchUpdate<T>(
    updates: Array<{
      queryKey: any[];
      updateFn: (old: T | undefined) => T;
      action: () => Promise<void>;
    }>
  ): Promise<void> {
    const snapshots = new Map<string, any>();

    try {
      // Cancel all queries and create snapshots
      for (const { queryKey } of updates) {
        await this.queryClient.cancelQueries({ queryKey });
        const key = JSON.stringify(queryKey);
        snapshots.set(key, this.queryClient.getQueryData(queryKey));
      }

      // Apply optimistic updates
      for (const { queryKey, updateFn } of updates) {
        this.queryClient.setQueryData(queryKey, updateFn);
      }

      // Execute all actions
      await Promise.all(updates.map(({ action }) => action()));

      // Clear snapshots on success
      snapshots.clear();
    } catch (error) {
      // Rollback all changes
      snapshots.forEach((value, key) => {
        const queryKey = JSON.parse(key);
        this.queryClient.setQueryData(queryKey, value);
      });

      throw error;
    }
  }
}

// Hook for optimistic updates
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();
  const manager = useRef(new OptimisticUpdateManager(queryClient));

  const update = useCallback(async <T>(
    queryKey: any[],
    updateFn: (old: T | undefined) => T,
    action: () => Promise<void>
  ) => {
    return manager.current.update(queryKey, updateFn, action);
  }, []);

  const batchUpdate = useCallback(async <T>(
    updates: Array<{
      queryKey: any[];
      updateFn: (old: T | undefined) => T;
      action: () => Promise<void>;
    }>
  ) => {
    return manager.current.batchUpdate(updates);
  }, []);

  return { update, batchUpdate };
}

// Global state store
interface StateStore {
  [key: string]: any;
}

export class GlobalStateManager {
  private static instance: GlobalStateManager;
  private state: StateStore = {};
  private listeners = new Map<string, Set<(value: any) => void>>();

  private constructor() {
    this.loadState();
  }

  static getInstance(): GlobalStateManager {
    if (!GlobalStateManager.instance) {
      GlobalStateManager.instance = new GlobalStateManager();
    }
    return GlobalStateManager.instance;
  }

  private loadState() {
    this.state = StatePersistence.load('global-state', {});
  }

  private saveState() {
    StatePersistence.save('global-state', this.state);
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.state[key] ?? defaultValue;
  }

  set<T>(key: string, value: T): void {
    this.state[key] = value;
    this.saveState();
    this.notifyListeners(key, value);
  }

  update<T>(key: string, updateFn: (current: T | undefined) => T): void {
    const current = this.get<T>(key);
    const newValue = updateFn(current);
    this.set(key, newValue);
  }

  remove(key: string): void {
    delete this.state[key];
    this.saveState();
    this.notifyListeners(key, undefined);
  }

  subscribe<T>(key: string, callback: (value: T) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(callback);

    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private notifyListeners(key: string, value: any) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => callback(value));
    }
  }

  clear() {
    this.state = {};
    this.saveState();
    this.listeners.forEach((listeners, key) => {
      listeners.forEach(callback => callback(undefined));
    });
  }

  getAll(): StateStore {
    return { ...this.state };
  }
}

// Hook for global state
export function useGlobalState<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T) => void, () => void] {
  const manager = useRef(GlobalStateManager.getInstance());
  const [state, setState] = useState<T | undefined>(() => 
    manager.current.get<T>(key, defaultValue)
  );

  useEffect(() => {
    const unsubscribe = manager.current.subscribe<T>(key, (value) => {
      setState(value);
    });

    return unsubscribe;
  }, [key]);

  const setValue = useCallback((value: T) => {
    manager.current.set(key, value);
  }, [key]);

  const removeValue = useCallback(() => {
    manager.current.remove(key);
  }, [key]);

  return [state, setValue, removeValue];
}

// State synchronization across tabs
export class CrossTabStateSync {
  private static instance: CrossTabStateSync;
  private channel: BroadcastChannel;
  private listeners = new Map<string, Set<(data: any) => void>>();

  private constructor() {
    this.channel = new BroadcastChannel('spookstr-state-sync');
    this.setupMessageListener();
  }

  static getInstance(): CrossTabStateSync {
    if (!CrossTabStateSync.instance) {
      CrossTabStateSync.instance = new CrossTabStateSync();
    }
    return CrossTabStateSync.instance;
  }

  private setupMessageListener() {
    this.channel.addEventListener('message', (event) => {
      const { key, data } = event.data;
      const keyListeners = this.listeners.get(key);
      
      if (keyListeners) {
        keyListeners.forEach(callback => callback(data));
      }
    });
  }

  broadcast(key: string, data: any): void {
    this.channel.postMessage({ key, data });
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(callback);

    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  close() {
    this.channel.close();
  }
}

// Hook for cross-tab state synchronization
export function useCrossTabSync<T>(key: string) {
  const sync = useRef(CrossTabStateSync.getInstance());
  const [remoteValue, setRemoteValue] = useState<T | null>(null);

  useEffect(() => {
    const unsubscribe = sync.current.subscribe(key, (data: T) => {
      setRemoteValue(data);
    });

    return unsubscribe;
  }, [key]);

  const broadcast = useCallback((data: T) => {
    sync.current.broadcast(key, data);
  }, [key]);

  return { remoteValue, broadcast };
}

// Debounced state hook
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

// State history manager for undo/redo functionality
export class StateHistoryManager<T> {
  private history: T[] = [];
  private currentIndex: number = -1;
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  push(state: T): void {
    // Remove any states after current index
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new state
    this.history.push(state);
    
    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): T | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo(): T | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getCurrent(): T | null {
    return this.history[this.currentIndex] ?? null;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Hook for state history (undo/redo)
export function useStateHistory<T>(
  initialValue: T,
  maxHistory: number = 50
) {
  const [state, setState] = useState<T>(initialValue);
  const history = useRef(new StateHistoryManager<T>(maxHistory));

  const updateState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;
      
      history.current.push(newValue);
      return newValue;
    });
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.undo();
    if (previous !== null) {
      setState(previous);
    }
  }, []);

  const redo = useCallback(() => {
    const next = history.current.redo();
    if (next !== null) {
      setState(next);
    }
  }, []);

  const canUndo = history.current.canUndo();
  const canRedo = history.current.canRedo();

  return {
    state,
    setState: updateState,
    undo,
    redo,
    canUndo,
    canRedo
  };
}

export default {
  StatePersistence,
  OfflineStateManager,
  RealtimeSyncManager,
  GlobalStateManager,
  CrossTabStateSync
};