# Enhanced Caching Strategy Implementation

This document details the enhanced caching strategy implemented across Spookstr to improve performance, reduce network requests, and provide a better user experience through intelligent background data refresh.

## Overview

The Enhanced Caching Strategy implements smart, content-aware background refresh patterns that balance data freshness with performance. The strategy uses different caching intervals based on content type, user activity, and data volatility.

## Key Improvements

### 1. Intelligent Background Refresh

**Before:**
- No background refresh intervals
- Data only updated on manual refresh or window focus
- Users saw stale data until explicit refresh actions

**After:**
- Smart background refresh based on content type
- Tab visibility awareness (no refresh when tab is hidden)
- Observer count consideration (no refresh when no components are listening)

### 2. Content-Type Aware Caching

Different content types have different refresh patterns based on how frequently they change:

| Content Type | Stale Time | GC Time | Refresh Interval | Reasoning |
|--------------|------------|---------|------------------|-----------|
| **Main Feed** | 1 minute | 10 minutes | 5 minutes | Frequently updated, users expect fresh content |
| **Interactions** | 45 seconds | 10 minutes | 1.5 minutes | Dynamic data, users want to see new likes/zaps |
| **Profiles** | 15 minutes | 30 minutes | 30 minutes | Rarely change, very conservative refresh |
| **Replies** | 1 minute | 5 minutes | 2 minutes | Active conversations need fresher data |
| **Notifications** | 30 seconds | 5 minutes | 1 minute | Users want timely notification updates |
| **Zap Receipts** | 1 minute | 5 minutes | 2 minutes | Relatively static once created |

### 3. Smart Window Focus Behavior

**Enhanced Logic:**
- Only refetch on window focus if data is older than 2 minutes
- Profiles don't refetch on window focus (too infrequent to matter)
- Notifications have intelligent focus behavior for timely updates

## Implementation Details

### Feed Caching (`useParanormalFeed`)

```typescript
// Enhanced background refresh every 5 minutes for active users
refetchInterval: (data, query) => {
  if (document.hidden || !data) return false;
  return 300000; // 5 minutes
},

// Smart window focus: only if data is older than 2 minutes
refetchOnWindowFocus: (query) => {
  if (!query.state.data) return true;
  const lastUpdated = query.state.dataUpdatedAt;
  const twoMinutesAgo = Date.now() - 120000;
  return lastUpdated < twoMinutesAgo;
},
```

### Interaction Caching (`useBatchInteractions`)

```typescript
// Balanced refresh for interaction counts
staleTime: 45000, // 45 seconds
gcTime: 600000, // 10 minutes
refetchInterval: (data, query) => {
  if (document.hidden || !data || eventIds.length === 0) return false;
  return 90000; // 1.5 minutes
},
```

### Profile Caching (`useAuthor`)

```typescript
// Very conservative caching for profiles
staleTime: 900000, // 15 minutes
gcTime: 1800000, // 30 minutes
refetchInterval: (data, query) => {
  if (document.hidden || !data || !pubkey) return false;
  return 1800000; // 30 minutes
},
refetchOnWindowFocus: false, // Profiles don't need frequent updates
```

### Notification Caching (`useNotifications`)

```typescript
// Timely updates for notifications
staleTime: 30000, // 30 seconds
gcTime: 300000, // 5 minutes
refetchInterval: (data, query) => {
  if (document.hidden || !user?.pubkey) return false;
  return 60000; // 1 minute
},
```

## Tab Visibility Optimization

All enhanced queries include tab visibility checks to prevent unnecessary network requests when the user isn't actively viewing the application:

```typescript
if (document.hidden || !data) return false;
```

This ensures:
- No background requests when tab is hidden
- Battery life preservation on mobile devices
- Reduced server load
- Network bandwidth conservation

## Observer Count Awareness

For specific hooks like `useZaps`, we check if components are actively observing the query:

```typescript
if (query.getObserversCount() === 0) return false;
```

This prevents:
- Background requests for unmounted components
- Unnecessary data fetching for hidden UI elements
- Resource waste on unused queries

## Query Client Global Defaults

Enhanced global defaults provide better error handling and caching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute default
      gcTime: 600000, // 10 minutes - longer cache retention
      refetchInterval: false, // Individual hooks control intervals
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

## Performance Benefits

### Network Request Reduction
- **Before:** Only manual/focus-based refresh
- **After:** Intelligent background refresh reduces user-initiated requests

### User Experience Improvements
- **Fresh Data:** Users see updated content without manual refresh
- **Reduced Loading:** Longer GC times mean less re-fetching of recently accessed data
- **Responsive UI:** Smart caching prevents UI freezes during data fetches

### Resource Optimization
- **Battery Life:** Tab visibility checks preserve mobile battery
- **Bandwidth:** No unnecessary requests when user isn't active
- **Memory:** Appropriate GC times balance memory usage with performance

## Configuration Flexibility

Each hook can be individually tuned by adjusting:

1. **`staleTime`** - How long data is considered fresh
2. **`gcTime`** - How long data stays in cache
3. **`refetchInterval`** - Background refresh frequency
4. **Conditions** - When background refresh should occur

## Monitoring and Debugging

To monitor the caching strategy effectiveness:

1. **Chrome DevTools Network Tab**: Check background request patterns
2. **React Query DevTools**: Monitor cache hits/misses and refresh intervals
3. **Performance Tab**: Measure impact on page performance
4. **Console Logs**: Custom logging shows when background refreshes occur

## Best Practices Applied

### 1. Progressive Enhancement
- Graceful degradation when offline or with poor connectivity
- Fallback to cached data when fresh requests fail

### 2. User-Centric Design
- Different refresh rates based on user expectations for each content type
- No interruption of user interactions with background updates

### 3. Resource Efficiency
- Tab visibility checks prevent waste
- Observer count awareness for component lifecycle respect
- Exponential backoff for retry logic

## Future Enhancements

Potential improvements to the caching strategy:

1. **Adaptive Intervals**: Adjust refresh rates based on user activity patterns
2. **Connection-Aware**: Reduce refresh rates on slow connections
3. **Content Freshness Scoring**: Dynamic intervals based on content age and interaction rates
4. **Cross-Tab Coordination**: Share cache updates across multiple tabs
5. **Predictive Prefetching**: Preload likely-needed data based on user behavior

## Trade-offs and Considerations

### Benefits
✅ **Better UX**: Fresh data without user action  
✅ **Improved Performance**: Smarter caching reduces redundant requests  
✅ **Resource Efficiency**: Tab visibility and observer awareness  
✅ **Flexibility**: Content-type specific strategies  

### Considerations
⚠️ **Background Network Usage**: Increased background requests  
⚠️ **Battery Impact**: More frequent network activity (mitigated by visibility checks)  
⚠️ **Complexity**: More sophisticated caching logic to maintain  

### Mitigation Strategies
- Tab visibility checks minimize background usage
- Conservative intervals for low-volatility content (profiles)
- Aggressive intervals only for high-value content (feed, notifications)
- Observer count checks prevent waste on unmounted components

## Conclusion

The Enhanced Caching Strategy provides a significant improvement to Spookstr's performance and user experience through intelligent, content-aware background refresh patterns. The implementation balances data freshness with resource efficiency, resulting in a more responsive application that keeps users engaged with timely updates while respecting device resources and network constraints.