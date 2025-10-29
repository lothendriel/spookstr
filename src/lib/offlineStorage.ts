/**
 * Offline Storage Manager
 * 
 * Manages IndexedDB storage for offline-first Nostr experience:
 * - Event storage and retrieval
 * - Offline action queuing
 * - Conflict resolution
 * - Data synchronization
 */

import type { NostrEvent } from '@nostrify/nostrify';

const DB_NAME = 'SpookstrOffline';
const DB_VERSION = 1;

export interface OfflineEvent extends NostrEvent {
  offline_id?: string;
  offline_timestamp?: number;
  sync_status?: 'pending' | 'synced' | 'failed';
  conflict_resolution?: 'local' | 'remote' | 'merged';
}

export interface OfflineAction {
  id: string;
  type: 'publish' | 'interaction' | 'delete';
  data: any;
  timestamp: number;
  retry_count: number;
  last_attempt?: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface OfflineProfile {
  pubkey: string;
  metadata: any;
  last_updated: number;
  offline_changes?: any;
}

export interface StorageStats {
  events: number;
  actions: number;
  profiles: number;
  totalSize: number;
  lastSync: number;
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineStorage] Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupDatabase(db);
      };
    });
  }

  /**
   * Set up database schema
   */
  private setupDatabase(db: IDBDatabase): void {
    console.log('[OfflineStorage] Setting up database schema');

    // Events store - for caching Nostr events
    if (!db.objectStoreNames.contains('events')) {
      const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      eventsStore.createIndex('kind', 'kind', { unique: false });
      eventsStore.createIndex('pubkey', 'pubkey', { unique: false });
      eventsStore.createIndex('created_at', 'created_at', { unique: false });
      eventsStore.createIndex('sync_status', 'sync_status', { unique: false });
      eventsStore.createIndex('offline_timestamp', 'offline_timestamp', { unique: false });
    }

    // Offline actions queue
    if (!db.objectStoreNames.contains('offline_actions')) {
      const actionsStore = db.createObjectStore('offline_actions', { keyPath: 'id' });
      actionsStore.createIndex('type', 'type', { unique: false });
      actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      actionsStore.createIndex('status', 'status', { unique: false });
    }

    // User profiles cache
    if (!db.objectStoreNames.contains('profiles')) {
      const profilesStore = db.createObjectStore('profiles', { keyPath: 'pubkey' });
      profilesStore.createIndex('last_updated', 'last_updated', { unique: false });
    }

    // App metadata and sync state
    if (!db.objectStoreNames.contains('metadata')) {
      const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
    }

    console.log('[OfflineStorage] Database schema created');
  }

  /**
   * Store Nostr events for offline access
   */
  async storeEvents(events: NostrEvent[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');

    const promises = events.map(event => {
      const offlineEvent: OfflineEvent = {
        ...event,
        offline_timestamp: Date.now(),
        sync_status: 'synced'
      };
      return this.promisifyRequest(store.put(offlineEvent));
    });

    await Promise.all(promises);
    console.log(`[OfflineStorage] Stored ${events.length} events`);
  }

  /**
   * Retrieve events by filters (similar to Nostr query)
   */
  async getEvents(filters: {
    kinds?: number[];
    authors?: string[];
    ids?: string[];
    since?: number;
    until?: number;
    limit?: number;
    tags?: Record<string, string[]>;
  }): Promise<OfflineEvent[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');

    let events: OfflineEvent[];

    // Use appropriate index for efficient querying
    if (filters.authors && filters.authors.length > 0) {
      const index = store.index('pubkey');
      const promises = filters.authors.map(author => 
        this.promisifyRequest(index.getAll(author))
      );
      const results = await Promise.all(promises);
      events = results.flat();
    } else if (filters.kinds && filters.kinds.length > 0) {
      const index = store.index('kind');
      const promises = filters.kinds.map(kind => 
        this.promisifyRequest(index.getAll(kind))
      );
      const results = await Promise.all(promises);
      events = results.flat();
    } else {
      // Get all events and filter in memory
      events = await this.promisifyRequest(store.getAll());
    }

    // Apply filters
    let filteredEvents = events;

    if (filters.ids) {
      filteredEvents = filteredEvents.filter(e => filters.ids!.includes(e.id));
    }

    if (filters.since) {
      filteredEvents = filteredEvents.filter(e => e.created_at >= filters.since!);
    }

    if (filters.until) {
      filteredEvents = filteredEvents.filter(e => e.created_at <= filters.until!);
    }

    if (filters.tags) {
      filteredEvents = filteredEvents.filter(event => {
        for (const [tagName, tagValues] of Object.entries(filters.tags!)) {
          const eventTags = event.tags.filter(tag => tag[0] === tagName);
          const hasMatchingTag = eventTags.some(tag => tagValues.includes(tag[1]));
          if (!hasMatchingTag) return false;
        }
        return true;
      });
    }

    // Sort by created_at (newest first)
    filteredEvents.sort((a, b) => b.created_at - a.created_at);

    // Apply limit
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    console.log(`[OfflineStorage] Retrieved ${filteredEvents.length} events from cache`);
    return filteredEvents;
  }

  /**
   * Queue an action for later synchronization
   */
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retry_count' | 'status'>): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const offlineAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retry_count: 0,
      status: 'pending'
    };

    const transaction = this.db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');
    
    await this.promisifyRequest(store.put(offlineAction));
    console.log(`[OfflineStorage] Queued action: ${offlineAction.type} (${offlineAction.id})`);
    
    return offlineAction.id;
  }

  /**
   * Get pending actions for synchronization
   */
  async getPendingActions(): Promise<OfflineAction[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['offline_actions'], 'readonly');
    const store = transaction.objectStore('offline_actions');
    const index = store.index('status');
    
    const actions = await this.promisifyRequest(index.getAll('pending'));
    console.log(`[OfflineStorage] Retrieved ${actions.length} pending actions`);
    
    return actions;
  }

  /**
   * Mark action as completed and remove from queue
   */
  async completeAction(actionId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');
    
    await this.promisifyRequest(store.delete(actionId));
    console.log(`[OfflineStorage] Completed action: ${actionId}`);
  }

  /**
   * Mark action as failed and increment retry count
   */
  async failAction(actionId: string, error?: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['offline_actions'], 'readwrite');
    const store = transaction.objectStore('offline_actions');
    
    const action = await this.promisifyRequest(store.get(actionId));
    if (action) {
      action.retry_count++;
      action.last_attempt = Date.now();
      action.status = action.retry_count >= 3 ? 'failed' : 'pending';
      
      await this.promisifyRequest(store.put(action));
      console.log(`[OfflineStorage] Failed action: ${actionId} (retry ${action.retry_count})`);
    }
  }

  /**
   * Store user profile for offline access
   */
  async storeProfile(pubkey: string, metadata: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const profile: OfflineProfile = {
      pubkey,
      metadata,
      last_updated: Date.now()
    };

    const transaction = this.db.transaction(['profiles'], 'readwrite');
    const store = transaction.objectStore('profiles');
    
    await this.promisifyRequest(store.put(profile));
    console.log(`[OfflineStorage] Stored profile: ${pubkey.slice(0, 8)}...`);
  }

  /**
   * Get cached user profile
   */
  async getProfile(pubkey: string): Promise<OfflineProfile | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['profiles'], 'readonly');
    const store = transaction.objectStore('profiles');
    
    const profile = await this.promisifyRequest(store.get(pubkey));
    return profile || null;
  }

  /**
   * Resolve conflicts between local and remote data
   */
  async resolveConflict(localEvent: OfflineEvent, remoteEvent: NostrEvent): Promise<OfflineEvent> {
    // Conflict resolution strategy:
    // 1. Remote event is newer -> use remote
    // 2. Local event has more recent changes -> merge
    // 3. Same timestamp -> prefer remote (server wins)

    if (remoteEvent.created_at > localEvent.created_at) {
      console.log(`[OfflineStorage] Conflict resolved: Using remote (newer)`);
      return {
        ...remoteEvent,
        conflict_resolution: 'remote',
        offline_timestamp: localEvent.offline_timestamp
      };
    }

    if (localEvent.offline_timestamp && 
        localEvent.offline_timestamp > remoteEvent.created_at * 1000) {
      console.log(`[OfflineStorage] Conflict resolved: Using local (recent changes)`);
      return {
        ...localEvent,
        conflict_resolution: 'local'
      };
    }

    // For certain event types, we can merge data
    if (this.canMergeEvents(localEvent, remoteEvent)) {
      console.log(`[OfflineStorage] Conflict resolved: Merging data`);
      return this.mergeEvents(localEvent, remoteEvent);
    }

    // Default: prefer remote
    console.log(`[OfflineStorage] Conflict resolved: Using remote (default)`);
    return {
      ...remoteEvent,
      conflict_resolution: 'remote',
      offline_timestamp: localEvent.offline_timestamp
    };
  }

  /**
   * Check if events can be merged
   */
  private canMergeEvents(localEvent: OfflineEvent, remoteEvent: NostrEvent): boolean {
    // For now, only merge profile events (kind 0)
    return localEvent.kind === 0 && remoteEvent.kind === 0;
  }

  /**
   * Merge two events intelligently
   */
  private mergeEvents(localEvent: OfflineEvent, remoteEvent: NostrEvent): OfflineEvent {
    if (localEvent.kind === 0 && remoteEvent.kind === 0) {
      // Merge profile metadata
      try {
        const localMeta = JSON.parse(localEvent.content);
        const remoteMeta = JSON.parse(remoteEvent.content);
        
        const mergedMeta = {
          ...remoteMeta,
          ...localMeta, // Local changes take precedence
        };

        return {
          ...remoteEvent,
          content: JSON.stringify(mergedMeta),
          conflict_resolution: 'merged',
          offline_timestamp: localEvent.offline_timestamp
        };
      } catch (error) {
        // If parsing fails, use remote
        return {
          ...remoteEvent,
          conflict_resolution: 'remote',
          offline_timestamp: localEvent.offline_timestamp
        };
      }
    }

    // Default merge strategy: use local content, remote metadata
    return {
      ...remoteEvent,
      content: localEvent.content,
      conflict_resolution: 'merged',
      offline_timestamp: localEvent.offline_timestamp
    };
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events', 'offline_actions', 'profiles'], 'readonly');
    
    const [events, actions, profiles] = await Promise.all([
      this.promisifyRequest(transaction.objectStore('events').count()),
      this.promisifyRequest(transaction.objectStore('offline_actions').count()),
      this.promisifyRequest(transaction.objectStore('profiles').count())
    ]);

    // Estimate storage size (rough calculation)
    const totalSize = (events * 1000) + (actions * 500) + (profiles * 2000); // bytes

    return {
      events,
      actions,
      profiles,
      totalSize,
      lastSync: Date.now() // TODO: Store actual last sync time
    };
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['events', 'offline_actions', 'profiles'], 'readwrite');
    
    await Promise.all([
      this.promisifyRequest(transaction.objectStore('events').clear()),
      this.promisifyRequest(transaction.objectStore('offline_actions').clear()),
      this.promisifyRequest(transaction.objectStore('profiles').clear())
    ]);

    console.log('[OfflineStorage] All data cleared');
  }

  /**
   * Clean up old data to manage storage size
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - maxAge;
    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');
    const index = store.index('offline_timestamp');

    const oldEvents = await this.promisifyRequest(
      index.getAll(IDBKeyRange.upperBound(cutoffTime))
    );

    const deletePromises = oldEvents.map(event => 
      this.promisifyRequest(store.delete(event.id))
    );

    await Promise.all(deletePromises);
    console.log(`[OfflineStorage] Cleaned up ${oldEvents.length} old events`);
  }

  /**
   * Convert IndexedDB request to Promise
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[OfflineStorage] Database connection closed');
    }
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorageManager();

/**
 * Hook for React components to use offline storage
 */
export function useOfflineStorage() {
  return {
    storage: offlineStorage,
    storeEvents: offlineStorage.storeEvents.bind(offlineStorage),
    getEvents: offlineStorage.getEvents.bind(offlineStorage),
    queueAction: offlineStorage.queueAction.bind(offlineStorage),
    storeProfile: offlineStorage.storeProfile.bind(offlineStorage),
    getProfile: offlineStorage.getProfile.bind(offlineStorage),
    getStats: offlineStorage.getStats.bind(offlineStorage),
    clearAll: offlineStorage.clearAll.bind(offlineStorage)
  };
}