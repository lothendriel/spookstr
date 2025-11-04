/**
 * Offline Sync Manager
 *
 * Handles synchronization between offline storage and online Nostr relays:
 * - Background sync when online
 * - Conflict detection and resolution
 * - Retry logic for failed operations
 * - Real-time sync status updates
 */

import type { NostrEvent } from '@nostrify/nostrify';
import { offlineStorage, type OfflineAction, type OfflineEvent } from './offlineStorage';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  pendingActions: number;
  failedActions: number;
  syncProgress: number; // 0-100
}

export interface SyncOptions {
  retryInterval: number; // milliseconds
  maxRetries: number;
  batchSize: number;
  backgroundSyncInterval: number;
}

const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  retryInterval: 30000, // 30 seconds
  maxRetries: 3,
  batchSize: 10,
  backgroundSyncInterval: 5 * 60 * 1000, // 5 minutes
};

class OfflineSyncManager {
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    failedActions: 0,
    syncProgress: 0,
  };

  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private syncInterval: number | null = null;
  private nostrClient: any = null; // Will be injected
  private options: SyncOptions = DEFAULT_SYNC_OPTIONS;

  constructor(options?: Partial<SyncOptions>) {
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options };
    this.setupEventListeners();
    this.startBackgroundSync();
  }

  /**
   * Initialize with Nostr client instance
   */
  init(nostrClient: any): void {
    this.nostrClient = nostrClient;
  }

  /**
   * Set up online/offline event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for background sync events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.syncStatus.isOnline = true;
    this.notifyListeners();
    this.sync();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.syncStatus.isOnline = false;
    this.syncStatus.isSyncing = false;
    this.notifyListeners();
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data.type === 'BACKGROUND_SYNC_COMPLETE') {
      this.updateSyncStats();
    }
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
        this.sync();
      }
    }, this.options.backgroundSyncInterval);
  }

  /**
   * Stop background synchronization
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform full synchronization
   */
  async sync(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing || !this.nostrClient) {
      return;
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncProgress = 0;
    this.notifyListeners();

    try {
      // Get pending actions
      const pendingActions = await offlineStorage.getPendingActions();
      this.syncStatus.pendingActions = pendingActions.length;

      if (pendingActions.length === 0) {
        this.syncStatus.syncProgress = 100;
        this.syncStatus.lastSync = Date.now();
        return;
      }

      // Process actions in batches
      const batches = this.createBatches(pendingActions, this.options.batchSize);
      let completed = 0;

      for (const batch of batches) {
        await this.processBatch(batch);
        completed += batch.length;
        this.syncStatus.syncProgress = Math.round((completed / pendingActions.length) * 100);
        this.notifyListeners();
      }

      this.syncStatus.lastSync = Date.now();

    } catch (error) {
    } finally {
      this.syncStatus.isSyncing = false;
      this.syncStatus.syncProgress = 100;
      this.updateSyncStats();
      this.notifyListeners();
    }
  }

  /**
   * Process a batch of actions
   */
  private async processBatch(actions: OfflineAction[]): Promise<void> {
    const promises = actions.map(action => this.processAction(action));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single action
   */
  private async processAction(action: OfflineAction): Promise<void> {
    try {
      switch (action.type) {
        case 'publish':
          await this.syncPublishAction(action);
          break;
        case 'interaction':
          await this.syncInteractionAction(action);
          break;
        case 'delete':
          await this.syncDeleteAction(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Mark as completed
      await offlineStorage.completeAction(action.id);

    } catch (error) {
      await offlineStorage.failAction(action.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Sync a publish action
   */
  private async syncPublishAction(action: OfflineAction): Promise<void> {
    const eventData = action.data;

    // Check for conflicts with remote data
    const remoteEvents = await this.nostrClient.query([
      { ids: [eventData.id] }
    ], { signal: AbortSignal.timeout(5000) });

    if (remoteEvents.length > 0) {
      // Event already exists remotely, resolve conflict
      const resolvedEvent = await offlineStorage.resolveConflict(eventData, remoteEvents[0]);

      if (resolvedEvent.conflict_resolution === 'local') {
        // Publish the local version
        await this.nostrClient.event(resolvedEvent);
      } else {
        // Update local storage with remote/merged version
        await offlineStorage.storeEvents([resolvedEvent]);
      }
    } else {
      // No conflict, publish normally
      await this.nostrClient.event(eventData);
    }
  }

  /**
   * Sync an interaction action (like, repost, etc.)
   */
  private async syncInteractionAction(action: OfflineAction): Promise<void> {
    const eventData = action.data;

    // For interactions, we generally don't need conflict resolution
    // Just publish the interaction event
    await this.nostrClient.event(eventData);
  }

  /**
   * Sync a delete action
   */
  private async syncDeleteAction(action: OfflineAction): Promise<void> {
    const { eventId, reason } = action.data;

    // Create a kind 5 deletion event
    const deleteEvent = {
      kind: 5,
      content: reason || 'Deleted',
      tags: [['e', eventId]],
      created_at: Math.floor(Date.now() / 1000),
    };

    await this.nostrClient.event(deleteEvent);
  }

  /**
   * Queue an offline action
   */
  async queueAction(type: OfflineAction['type'], data: any): Promise<string> {
    const actionId = await offlineStorage.queueAction({ type, data });

    // Trigger background sync if online
    if (this.syncStatus.isOnline && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.sync) {
          registration.sync.register(`nostr-${type}`);
        }
      });
    }

    this.updateSyncStats();
    return actionId;
  }

  /**
   * Cache events for offline access
   */
  async cacheEvents(events: NostrEvent[]): Promise<void> {
    await offlineStorage.storeEvents(events);
  }

  /**
   * Get cached events (for offline mode)
   */
  async getCachedEvents(filters: any): Promise<OfflineEvent[]> {
    const events = await offlineStorage.getEvents(filters);
    return events;
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStats(): Promise<void> {
    try {
      const actions = await offlineStorage.getPendingActions();
      this.syncStatus.pendingActions = actions.filter(a => a.status === 'pending').length;
      this.syncStatus.failedActions = actions.filter(a => a.status === 'failed').length;
      this.notifyListeners();
    } catch (error) {
      // Silent error handling for stats
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Subscribe to sync status updates
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(): void {
    this.syncListeners.forEach(listener => {
      try {
        listener({ ...this.syncStatus });
      } catch (error) {
        // Silent error handling for listeners
      }
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force immediate sync
   */
  async forcSync(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.sync();
  }

  /**
   * Clear all offline data and reset sync state
   */
  async reset(): Promise<void> {
    this.stopBackgroundSync();
    await offlineStorage.clearAll();

    this.syncStatus = {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSync: null,
      pendingActions: 0,
      failedActions: 0,
      syncProgress: 0,
    };

    this.notifyListeners();
    this.startBackgroundSync();

    }

  /**
   * Cleanup old data and optimize storage
   */
  async optimize(): Promise<void> {
    await offlineStorage.cleanup();
    const stats = await offlineStorage.getStats();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopBackgroundSync();
    this.syncListeners = [];

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    }
}

// Create singleton instance
export const offlineSync = new OfflineSyncManager();

/**
 * React hook for using offline sync
 */
export function useOfflineSync() {
  return {
    sync: offlineSync,
    queueAction: offlineSync.queueAction.bind(offlineSync),
    cacheEvents: offlineSync.cacheEvents.bind(offlineSync),
    getCachedEvents: offlineSync.getCachedEvents.bind(offlineSync),
    getSyncStatus: offlineSync.getSyncStatus.bind(offlineSync),
    onSyncStatusChange: offlineSync.onSyncStatusChange.bind(offlineSync),
    forceSync: offlineSync.forcSync.bind(offlineSync),
    optimize: offlineSync.optimize.bind(offlineSync),
  };
}