# Multi-Relay System Documentation

This document explains the enhanced multi-relay system implemented in Spookstr that provides comprehensive coverage for notes, interactions, and notifications across multiple Nostr relays.

## Overview

The multi-relay system ensures that users don't miss content, interactions, or notifications by querying multiple relays simultaneously and deduplicating results. This is especially important in the Nostr ecosystem where content may be distributed across different relays.

## Components

### 1. Core Multi-Relay Query Hook

**`useMultiRelayQuery`** - The foundation hook that queries multiple relays simultaneously.

```typescript
import { useMultiRelayQuery } from '@/hooks/useMultiRelayQuery';

function MyComponent() {
  const { data: events, isLoading } = useMultiRelayQuery({
    filters: [{
      kinds: [1],
      limit: 50,
    }],
    enabled: true,
    staleTime: 30000,
    retry: 2,
  });

  return <div>{/* Render events */}</div>;
}
```

**Features:**
- Queries all preset relays from the relay selector
- Automatic fallback to default relay if relay group fails
- Comprehensive error handling and logging
- Built-in timeout protection (10 seconds)

### 2. Enhanced Interaction System

**`useBatchInteractions`** - Fetches interaction counts for multiple posts using multi-relay approach.

```typescript
import { useBatchInteractions } from '@/hooks/useBatchInteractions';

function PostFeed({ posts }) {
  const postIds = posts.map(p => p.id);
  
  // Automatically queries all relays for comprehensive interaction coverage
  useBatchInteractions(postIds);
  
  return (
    <div>
      {posts.map(post => <PostComponent key={post.id} post={post} />)}
    </div>
  );
}
```

**`useRealtimeInteractionUpdates`** - Real-time updates across multiple relays with deduplication.

```typescript
import { useRealtimeInteractionUpdates } from '@/hooks/useRealtimeInteractionUpdates';

function PostFeed({ posts }) {
  const postIds = posts.map(p => p.id);
  
  // Enable real-time interaction updates from all relays
  useRealtimeInteractionUpdates(postIds);
  
  return <div>{/* Posts automatically update with new interactions */}</div>;
}
```

**`useRealtimeInteractions`** - Individual post interaction counts (already enhanced).

```typescript
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';

function PostComponent({ post }) {
  const { data: counts, optimisticUpdate } = useRealtimeInteractions(post.id);
  
  const handleLike = () => {
    // Optimistic update while publishing
    optimisticUpdate(7, 1); // kind 7 = like, increment by 1
    // ... publish like event
  };
  
  return (
    <div>
      <button onClick={handleLike}>
        ❤️ {counts?.likes || 0}
      </button>
    </div>
  );
}
```

### 3. Enhanced Notifications System

**`useNotifications`** - Enhanced with multi-relay approach for comprehensive notification coverage.

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useNotifications();
  
  // Automatically queries:
  // - User's NIP-65 relay list (inbox model)
  // - All preset relays from relay selector
  // - Configured read relays
  
  return <div>{/* Render notifications from all relays */}</div>;
}
```

**`useRealtimeNotifications`** - Real-time notification updates across all relays.

```typescript
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function App() {
  // Enable real-time notifications across all relays
  useRealtimeNotifications();
  
  return <div>{/* App with live notification updates */}</div>;
}
```

### 4. Enhanced Feed System

**`useParanormalFeed`** - Enhanced to use multi-relay queries for better content discovery.

```typescript
import { useParanormalFeed } from '@/hooks/useParanormalFeed';

function HomePage() {
  const feed = useParanormalFeed();
  
  // Automatically:
  // - Queries all preset relays
  // - Deduplicates results
  // - Applies content filters
  // - Sorts by timestamp
  
  return <div>{/* Render comprehensive feed */}</div>;
}
```

## How It Works

### 1. Relay Selection Strategy

The system uses a hierarchical approach to select relays:

1. **Spookstr-Only Mode**: Only uses Spookstr relay
2. **User's NIP-65 Relays**: Uses user's published relay list (inbox model)
3. **Preset Relays**: All relays from the relay selector
4. **Configured Relays**: Fallback to app configuration
5. **Default Relay**: Final fallback

### 2. Query Process

1. **Multi-Relay Query**: Queries all selected relays simultaneously
2. **Deduplication**: Removes duplicate events by ID across relays
3. **Error Handling**: Falls back to individual relays if group query fails
4. **Logging**: Comprehensive logging for debugging and monitoring

### 3. Real-Time Updates

1. **Shared Subscriptions**: Prevents connection overload with shared WebSocket subscriptions
2. **Multi-Relay Coverage**: Subscribes to all configured relays simultaneously
3. **Deduplication**: Prevents duplicate real-time updates
4. **Throttling**: Limits update frequency to prevent UI thrashing

## Benefits

### 1. Comprehensive Coverage

- **No Missed Content**: Queries multiple relays ensure comprehensive content discovery
- **No Missed Interactions**: All likes, reposts, zaps, and comments from any relay
- **No Missed Notifications**: Real-time updates from all user's relays

### 2. Performance Optimizations

- **Batch Queries**: Single query fetches data for multiple posts
- **Shared Subscriptions**: Prevents multiple WebSocket connections
- **Deduplication**: Efficient handling of duplicate content across relays
- **Caching**: Query results cached and shared across components

### 3. Reliability

- **Fallback Mechanisms**: Multiple layers of fallback if relays fail
- **Error Handling**: Graceful degradation when relays are unavailable
- **Timeout Protection**: Prevents hanging queries from slow relays

## Implementation Guidelines

### For New Components

1. **Use Multi-Relay Hooks**: Prefer `useMultiRelayQuery` over direct `nostr.query()`
2. **Enable Real-Time Updates**: Use appropriate real-time hooks for live data
3. **Handle Loading States**: Multi-relay queries may take longer initially
4. **Consider Deduplication**: Always expect and handle duplicate events

### For Existing Components

1. **Gradual Migration**: Replace direct Nostr queries with multi-relay hooks
2. **Test Thoroughly**: Ensure deduplication works correctly
3. **Monitor Performance**: Watch for increased network usage
4. **Update Documentation**: Document any breaking changes

### Best Practices

1. **Relay Selection**: Trust the hierarchical relay selection strategy
2. **Error Handling**: Always provide fallback UI for failed queries
3. **Logging**: Use provided logging for debugging multi-relay issues
4. **Performance**: Use batch hooks for multiple events, individual hooks for single events

## Troubleshooting

### Common Issues

1. **Slow Initial Load**: Multi-relay queries may be slower initially but provide better coverage
2. **Duplicate Content**: Ensure proper deduplication in custom components
3. **High Network Usage**: Monitor and optimize query frequencies
4. **Relay Failures**: Check logs for specific relay connection issues

### Debug Information

The system provides comprehensive logging:
- `[Multi-relay Query]`: Core query operations
- `[Batch Interactions]`: Interaction count updates
- `[Real-time Interactions]`: Live interaction updates
- `[Enhanced Notifications]`: Notification system operations

### Performance Monitoring

Key metrics to monitor:
- Number of relays queried per operation
- Deduplication effectiveness (events before/after)
- Query response times across relays
- Real-time subscription health

## Future Enhancements

Potential improvements to the multi-relay system:
1. **Relay Health Monitoring**: Track and prefer faster, more reliable relays
2. **Geographic Optimization**: Prefer geographically closer relays
3. **Load Balancing**: Distribute queries across relays more intelligently
4. **User Preferences**: Allow users to customize relay selection strategy