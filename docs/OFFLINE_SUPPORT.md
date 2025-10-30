# Offline Support Implementation

This document details the comprehensive offline support system implemented in Spookstr, providing a seamless offline-first experience for users.

## Overview

The offline support system enables Spookstr to work completely offline while maintaining full functionality. Users can read cached content, create new posts, interact with existing posts, and have all actions automatically synchronized when they come back online.

## Architecture Components

### 1. Service Worker (`public/sw.js`)

**Purpose**: Handles network requests, caching, and background synchronization.

**Key Features:**
- **Static Asset Caching**: App shell, JavaScript, CSS, HTML files
- **Nostr Event Caching**: Automatic caching of Nostr relay responses
- **Image Caching**: Long-term caching of media files from various hosts
- **Background Sync**: Processes offline actions when network returns
- **Cache Management**: Intelligent cache expiration and cleanup

**Cache Strategies:**
- **Static Assets**: Cache-first with 7-day expiration
- **Images**: Cache-first with 30-day expiration  
- **Nostr Data**: Network-first with 24-hour cache fallback
- **API Requests**: Network-first with cache fallback for GET requests

### 2. IndexedDB Storage (`src/lib/offlineStorage.ts`)

**Purpose**: Local database for storing Nostr events, user profiles, and offline actions.

**Data Stores:**
- **Events**: Cached Nostr events with offline metadata
- **Offline Actions**: Queued actions (publish, like, repost, etc.)
- **Profiles**: User profile metadata cache
- **Metadata**: App sync state and configuration

**Key Features:**
- **Query Interface**: Nostr-like filtering and retrieval
- **Conflict Resolution**: Smart merging of local and remote changes
- **Action Queuing**: Reliable offline action storage
- **Storage Management**: Automatic cleanup and size optimization

### 3. Sync Manager (`src/lib/offlineSync.ts`)

**Purpose**: Orchestrates synchronization between offline storage and online relays.

**Sync Process:**
1. **Detect Network Status**: Monitor online/offline transitions
2. **Process Action Queue**: Sync pending actions in batches
3. **Conflict Resolution**: Handle conflicts between local and remote data
4. **Background Sync**: Automatic periodic synchronization
5. **Error Handling**: Retry failed operations with exponential backoff

**Sync Strategies:**
- **Immediate Sync**: When network becomes available
- **Background Sync**: Every 5 minutes while online
- **Force Sync**: Manual user-triggered synchronization
- **Service Worker Sync**: Browser-native background sync

### 4. Offline Hooks (`src/hooks/useOfflineNostr.ts`)

**Purpose**: React hooks that seamlessly integrate offline capabilities.

**Available Hooks:**
- **`useOfflineNostrQuery`**: Enhanced query with offline fallback
- **`useOfflineNostrPublish`**: Publishing with offline queuing
- **`useOfflineNostrInteraction`**: Interactions with optimistic updates
- **`useOfflineStatus`**: Real-time sync status and statistics
- **`useOfflineStats`**: Storage usage and performance metrics

## User Experience

### Online Mode
- **Normal Operation**: All requests go to network
- **Automatic Caching**: Responses cached for offline use
- **Real-time Updates**: Live data from relays
- **Background Sync**: Continuous synchronization

### Offline Mode
- **Cached Content**: Read posts, profiles, and media from cache
- **Optimistic UI**: Immediate feedback for user actions
- **Action Queuing**: Posts, likes, reposts queued for later sync
- **Status Indicators**: Clear feedback about offline state

### Back Online
- **Automatic Sync**: All queued actions synchronized
- **Conflict Resolution**: Smart handling of data conflicts
- **Progress Feedback**: Real-time sync progress indication
- **Error Recovery**: Failed actions retried automatically

## Conflict Resolution

### Strategy Overview
When local and remote data conflicts occur, the system uses intelligent resolution:

1. **Timestamp Comparison**: Newer data typically wins
2. **Local Changes Priority**: Recent offline changes preserved
3. **Mergeable Data**: Profile metadata intelligently merged
4. **Server Authority**: Remote data preferred for immutable events

### Implementation Examples

**Profile Conflicts:**
```typescript
// Local profile has recent changes, remote has older data
const mergedProfile = {
  ...remoteProfile,
  ...localChanges, // Local changes take precedence
};
```

**Event Conflicts:**
```typescript
// Remote event is newer -> use remote
if (remoteEvent.created_at > localEvent.created_at) {
  return { ...remoteEvent, conflict_resolution: 'remote' };
}

// Local has recent offline changes -> use local  
if (localEvent.offline_timestamp > remoteEvent.created_at * 1000) {
  return { ...localEvent, conflict_resolution: 'local' };
}
```

## Performance Optimizations

### Efficient Querying
- **Index-based Searches**: Fast retrieval using IndexedDB indexes
- **Batch Processing**: Multiple actions processed together
- **Memory Management**: Automatic cleanup of old cached data
- **Size Limits**: Configurable storage quotas and cleanup

### Smart Caching
- **Content-aware Expiration**: Different TTL for different content types
- **Compression**: Efficient storage of JSON data
- **Selective Caching**: Only cache relevant events and profiles
- **Background Cleanup**: Automatic removal of stale data

### Network Efficiency
- **Request Deduplication**: Avoid duplicate network requests
- **Batch Synchronization**: Multiple actions in single network call
- **Progressive Sync**: Prioritize important actions first
- **Connection Awareness**: Adapt behavior based on connection quality

## Storage Management

### Data Organization
```
IndexedDB: SpookstrOffline
├── events/                 # Cached Nostr events
│   ├── Primary Key: event.id
│   ├── Indexes: kind, pubkey, created_at, sync_status
│   └── Data: NostrEvent + offline metadata
├── offline_actions/        # Queued actions  
│   ├── Primary Key: action.id
│   ├── Indexes: type, timestamp, status
│   └── Data: Action type + event data + retry info
├── profiles/              # User profiles
│   ├── Primary Key: pubkey
│   ├── Index: last_updated
│   └── Data: Profile metadata + offline changes
└── metadata/              # App sync state
    ├── Primary Key: setting key
    └── Data: Sync timestamps, config, statistics
```

### Storage Quotas
- **Default Limit**: 50MB (configurable)
- **Auto Cleanup**: Remove data older than 7 days
- **Priority Retention**: Keep recent and frequently accessed data
- **User Control**: Manual cache clearing options

## API Reference

### useOfflineNostrQuery
```typescript
const { data, isLoading, isOnline, isCached } = useOfflineNostrQuery({
  queryKey: ['feed'],
  filters: [{ kinds: [1], limit: 20 }],
  options: { staleTime: 60000 }
});
```

### useOfflineNostrPublish
```typescript
const { mutate: publish, isPending } = useOfflineNostrPublish();

publish({
  kind: 1,
  content: "Hello from offline!",
  tags: []
});
```

### useOfflineStatus
```typescript
const {
  isOnline,
  isSyncing,
  pendingActions,
  failedActions,
  syncProgress,
  lastSync
} = useOfflineStatus();
```

## Development Tools

### Debug Panel Integration
The offline system integrates with the debug panel to show:
- **Storage Statistics**: Events, actions, profiles count and size
- **Sync Status**: Current sync state and progress
- **Cache Management**: Clear offline data and reset sync state
- **Action Queue**: View pending and failed actions

### Service Worker DevTools
- **Cache Inspector**: View cached resources and their status
- **Network Logs**: Monitor service worker request handling
- **Sync Events**: Track background sync registrations and executions
- **Storage Quota**: Monitor IndexedDB usage and limits

## Configuration Options

### Sync Configuration
```typescript
const syncOptions = {
  retryInterval: 30000,        // 30 seconds between retries
  maxRetries: 3,               // Maximum retry attempts
  batchSize: 10,               // Actions per batch
  backgroundSyncInterval: 300000, // 5 minutes background sync
};
```

### Storage Configuration
```typescript
const storageOptions = {
  maxEvents: 1000,             // Maximum cached events
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days data retention
  compressionEnabled: true,     // Compress stored data
  autoCleanup: true,           // Automatic old data cleanup
};
```

### Cache Configuration
```typescript
const cacheOptions = {
  staticTTL: 7 * 24 * 60 * 60 * 1000,  // Static assets: 7 days
  nostrTTL: 24 * 60 * 60 * 1000,       // Nostr data: 24 hours  
  imageTTL: 30 * 24 * 60 * 60 * 1000,  // Images: 30 days
  maxCacheSize: 100 * 1024 * 1024,     // 100MB total cache limit
};
```

## Security Considerations

### Data Protection
- **Local Encryption**: Sensitive data encrypted in IndexedDB
- **Secure Storage**: Private keys never stored locally
- **Action Validation**: All offline actions validated before sync
- **Conflict Prevention**: Cryptographic signatures prevent tampering

### Privacy
- **No Tracking**: Offline system doesn't track user behavior
- **Local Only**: Cached data stays on user's device
- **User Control**: Users can clear all offline data
- **Transparent**: Clear indication of offline vs. online data

## Troubleshooting

### Common Issues

**Service Worker Not Registering:**
- Check browser support and HTTPS requirement
- Verify service worker file is accessible at `/sw.js`
- Check console for registration errors

**Sync Not Working:**
- Verify network connectivity
- Check if background sync is supported
- Look for failed actions in debug panel

**Storage Quota Exceeded:**
- Run automatic cleanup: `offlineStorage.cleanup()`
- Clear old data: `offlineStorage.clearAll()`
- Reduce cache retention time

**Conflicts Not Resolving:**
- Check conflict resolution strategy
- Verify timestamp accuracy
- Review merge logic for specific event types

### Debug Commands
```javascript
// Browser console commands for debugging
window.offlineStorage.getStats()           // Storage statistics
window.offlineSync.getSyncStatus()         // Current sync status  
window.serviceWorkerManager.getCacheStats() // Cache information
window.offlineStorage.clearAll()           // Clear all data
```

## Best Practices

### For Users
1. **Stay Connected**: Sync regularly when online
2. **Monitor Storage**: Keep an eye on storage usage
3. **Clear Cache**: Periodically clear old cached data
4. **Update App**: Keep app updated for latest offline features

### For Developers
1. **Test Offline**: Always test offline functionality
2. **Handle Conflicts**: Implement proper conflict resolution
3. **Monitor Performance**: Track storage usage and sync times
4. **Error Handling**: Graceful degradation when offline features fail

## Future Enhancements

### Planned Features
1. **Smart Prefetching**: Predict and cache likely-needed content
2. **Selective Sync**: User choice of what to sync offline
3. **Compression**: More efficient storage of cached data  
4. **P2P Sync**: Direct device-to-device synchronization
5. **Advanced Conflicts**: More sophisticated conflict resolution

### Performance Improvements
1. **Incremental Sync**: Only sync changed data
2. **Parallel Processing**: Concurrent action processing
3. **Connection Awareness**: Adapt to network conditions
4. **Background Updates**: Update cache during idle time

## Conclusion

The offline support system provides a robust, user-friendly offline experience that maintains full functionality even without network connectivity. Through intelligent caching, conflict resolution, and seamless synchronization, users can continue using Spookstr regardless of their connection status.

The system is designed for performance, reliability, and user experience while maintaining data integrity and security. All offline actions are preserved and synchronized automatically, providing a truly offline-first experience.