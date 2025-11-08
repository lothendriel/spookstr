# Pagination Guide for Spookstr Feeds

This document explains the different pagination approaches available in Spookstr and provides guidance on when to use each method.

## Available Pagination Methods

### 1. Traditional "Load More" Pagination

**Files:**
- `useParanormalFeed.ts` - Hook implementation
- `useCommunityFeed.ts` - Hook implementation  
- `FeedContent.tsx` - Component for rendering
- `pages/Index.tsx` - Usage example

**How it works:**
- Fetches all posts upfront with a fixed limit (50-100 posts)
- Uses client-side pagination with `postsToShow` state
- Shows a "Load More" button to incrementally display more posts
- Simple to implement and understand

**Pros:**
- ✅ Simple implementation
- ✅ Predictable behavior
- ✅ Easy to debug
- ✅ Works well for smaller feeds
- ✅ No complex state management

**Cons:**
- ❌ Inefficient data loading (fetches all upfront)
- ❌ Poor performance with large feeds
- ❌ High memory usage
- ❌ Not scalable for growing content
- ❌ Manual user interaction required

**Best for:**
- Small communities with limited content
- Development/testing phases
- Situations where simplicity is prioritized over performance

### 2. Infinite Scroll with `useInfiniteQuery`

**Files:**
- `useParanormalFeedInfinite.ts` - Hook implementation
- `useCommunityFeedInfinite.ts` - Hook implementation
- `InfiniteFeedContent.tsx` - Component for rendering
- `pages/Index.tsx` - Usage example with toggle

**How it works:**
- Uses TanStack Query's `useInfiniteQuery` for pagination
- Leverages Nostr's `until` parameter for timestamp-based pagination
- Automatically loads more content as user scrolls
- Uses intersection observer for performance

**Pros:**
- ✅ Highly efficient data loading
- ✅ Excellent performance and scalability
- ✅ Automatic content loading
- ✅ Better user experience
- ✅ Low memory footprint
- ✅ Handles large feeds gracefully

**Cons:**
- ❌ More complex implementation
- ❌ Requires careful state management
- ❌ Can be harder to debug
- ❌ Needs proper loading states
- ❌ May require duplicate event handling

**Best for:**
- Production applications
- Large, active communities
- Content-heavy feeds
- Mobile-first experiences
- Performance-critical applications

### 3. Hybrid Approach (Recommended)

The current implementation includes a toggle in `pages/Index.tsx` that allows switching between both methods. This provides the flexibility to:

- Start with traditional pagination during development
- Switch to infinite scroll for production
- A/B test both approaches
- Fall back to simple pagination if issues arise

## Implementation Details

### Nostr Pagination Strategy

Nostr uses timestamp-based pagination with the `until` parameter:

```typescript
// First page
const events = await nostr.query([{
  kinds: [1],
  '#t': ['paranormal'],
  limit: 20,
}]);

// Subsequent pages
const olderEvents = await nostr.query([{
  kinds: [1],
  '#t': ['paranormal'],
  limit: 20,
  until: oldestEventTimestamp - 1, // -1 because 'until' is inclusive
}]);
```

### Key Implementation Considerations

#### 1. Duplicate Event Handling
Infinite scroll can fetch duplicate events across pages. Always deduplicate by event ID:

```typescript
const posts = useMemo(() => {
  const seen = new Set<string>();
  return data?.pages.flat().filter(event => {
    if (!event.id || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }) || [];
}, [data?.pages]);
```

#### 2. Loading States
Provide appropriate loading indicators for different states:

```typescript
// Initial load
{isInfiniteInitialLoading && <InitialLoadingSkeleton />}

// Loading more content
{isFetchingNextPage && <MoreContentSkeleton />}

// End of feed
{!hasNextPage && posts.length > 0 && <EndOfFeedIndicator />}
```

#### 3. Intersection Observer Configuration
Configure the intersection observer for optimal performance:

```typescript
const { ref, inView } = useInView({
  threshold: 0.1,
  rootMargin: '200px', // Start loading 200px before visible
});
```

#### 4. Error Handling
Implement robust error handling that doesn't break the user experience:

```typescript
if (error) {
  return <ErrorComponent onRetry={refetch} />;
}
```

### Performance Optimizations

#### 1. Query Limits
- Use smaller limits for infinite scroll (20-30 posts per page)
- Adjust based on content type and user needs
- Consider network conditions and device capabilities

#### 2. Cache Management
- Configure appropriate `staleTime` and `gcTime` values
- Use background refetching for active users
- Implement cache invalidation strategies

#### 3. Memory Management
- Aggressively clean up unused data with `gcTime`
- Use `useMemo` for expensive computations
- Implement proper cleanup in effects

### Migration Guide

#### From Traditional to Infinite Scroll

1. **Replace the hook:**
   ```typescript
   // Before
   const { data: posts, isLoading, error, refetch } = useParanormalFeed();
   
   // After  
   const { 
     data: infiniteData, 
     fetchNextPage, 
     hasNextPage, 
     isFetchingNextPage,
     isLoading: isInfiniteInitialLoading,
     error: infiniteError,
     refetch: refetchInfinite
   } = useParanormalFeedInfinite();
   ```

2. **Update the component:**
   ```typescript
   // Before
   <FeedContent posts={posts} postsToShow={postsToShow} />
   
   // After
   <InfiniteFeedContent 
     data={infiniteData}
     hasNextPage={hasNextPage}
     isFetchingNextPage={isFetchingNextPage}
     fetchNextPage={fetchNextPage}
   />
   ```

3. **Handle loading states:**
   ```typescript
   // Before
   {isLoading && <LoadingSkeleton />}
   
   // After
   {(isLoading || isInfiniteInitialLoading) && <LoadingSkeleton />}
   ```

#### Best Practices for Migration

1. **Implement both approaches simultaneously** with a toggle
2. **Test thoroughly** with different data sizes
3. **Monitor performance** metrics (load time, memory usage)
4. **Gather user feedback** on experience
5. **Gradual rollout** to production

## Troubleshooting

### Common Issues

#### 1. Duplicate Events
**Problem:** Same events appear multiple times in infinite scroll
**Solution:** Implement proper deduplication by event ID

#### 2. Missing Events
**Problem:** Some events don't appear in the feed
**Solution:** Check relay consistency and query parameters

#### 3. Performance Issues
**Problem:** Slow loading or high memory usage
**Solution:** Optimize query limits and cache settings

#### 4. Infinite Loading
**Problem:** Content keeps loading without stopping
**Solution:** Ensure proper `getNextPageParam` implementation

### Debugging Tips

1. **Enable console logging** to track pagination behavior
2. **Monitor network requests** in browser dev tools
3. **Check query parameters** sent to relays
4. **Verify timestamp calculations** for pagination
5. **Test with different relay configurations**

## Future Enhancements

### 1. Adaptive Pagination
- Switch between methods based on feed size
- Adjust query limits based on device capabilities
- Implement network-aware loading strategies

### 2. Prefetching
- Prefetch next page when user pauses scrolling
- Implement intelligent prefetching based on user behavior
- Cache content for offline viewing

### 3. Virtualization
- Implement windowing for very large feeds
- Use react-window or react-virtualized
- Optimize rendering performance for thousands of items

### 4. Smart Loading
- Prioritize loading based on user engagement
- Implement progressive loading with placeholders
- Use skeleton screens for better perceived performance

## Conclusion

For Spookstr, **infinite scroll with `useInfiniteQuery` is the recommended approach** for production use. It provides the best balance of performance, user experience, and scalability for a growing paranormal content platform.

The hybrid implementation with a toggle allows for easy comparison and fallback, making it ideal for development and testing phases.

**Recommendation:** Start with the traditional approach for initial development, then switch to infinite scroll as the content base grows and performance becomes more critical.