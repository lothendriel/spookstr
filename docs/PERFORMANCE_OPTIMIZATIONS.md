# Performance Optimizations

This document outlines the performance optimizations implemented to make Spookstr faster and more efficient.

## Major Optimizations Implemented

### 1. Batch Interaction Queries

**Problem**: Each post was making individual network requests to fetch interaction counts (likes, reposts, zaps, comments), resulting in 24+ network requests for a feed of 12 posts.

**Solution**: Created `useBatchInteractions` hook that fetches interactions for all visible posts in a single query.

**Impact**: Reduced network requests from 24+ to 1 per feed load (~96% reduction).

**Implementation**:
- New hook: `src/hooks/useBatchInteractions.ts`
- Modified: `src/pages/Index.tsx` to use batch queries
- Modified: `src/hooks/useRealtimeInteractions.ts` to work with batch data

### 2. Removed Real-time Subscriptions

**Problem**: Each post created its own WebSocket subscription for real-time updates, overwhelming the connection with 12+ concurrent subscriptions.

**Solution**: Removed per-post real-time subscriptions and rely on optimistic updates + manual refreshes.

**Impact**: Eliminated 12+ WebSocket connections per page load.

**Trade-off**: Real-time interaction counts are no longer live, but optimistic updates provide immediate feedback when users interact.

### 3. Lazy Loading with Intersection Observer

**Problem**: All posts and their data were loaded immediately, even those off-screen.

**Solution**: Implemented lazy loading using React Intersection Observer to only load posts as they come into viewport.

**Impact**: Initial render time reduced, especially on slower connections.

**Implementation**:
- Modified: `src/components/ParanormalPost.tsx` with `useInView` hook
- Added skeleton loading states for posts not yet in viewport
- 200px rootMargin for smooth loading before scrolling

### 4. Component Memoization

**Problem**: Components were re-rendering unnecessarily on every state change.

**Solution**: Wrapped `ParanormalPost` with `React.memo` to prevent unnecessary re-renders.

**Impact**: Reduced re-renders when other posts update or user interacts with the page.

### 5. Optimized Query Configuration

**Problem**: Default query settings were not optimized for the app's usage patterns.

**Solution**: Updated TanStack Query configuration with better defaults:
- Reduced retries from 3 to 1 for faster failure recovery
- Increased staleTime for profile data (5 minutes - profiles don't change often)
- Added `refetchOnMount: false` to prevent unnecessary refetches
- Better garbage collection times (5-10 minutes)

**Impact**: Fewer redundant network requests, better cache utilization.

### 6. Code Splitting

**Problem**: Initial bundle included all page components, even rarely accessed ones.

**Solution**: Implemented lazy loading for non-critical pages using React's `lazy()`.

**Impact**: Smaller initial bundle size, faster first paint.

**Pages lazy loaded**:
- Calendar
- NIP19Page
- Notifications
- RelaySettings
- Hashtag
- Community pages
- PostDetailPage

### 7. Build Optimizations

**Problem**: Default Vite build was not optimally configured for production.

**Solution**: Enhanced Vite config with:
- Manual chunk splitting for vendor dependencies
- Separate chunks for React, Nostr, UI, and Query libraries
- Better caching strategy through chunking
- CSS minification enabled
- Target set to `esnext` for modern browsers

**Impact**: Better browser caching, faster subsequent loads.

### 8. Removed Debug Logging

**Problem**: 961+ console log messages in production were slowing down performance.

**Solution**: Removed console.log statements from production code.

**Impact**: Reduced console overhead and improved overall performance.

### 9. Enhanced LocalStorage Caching

**Problem**: Author profiles were being re-fetched unnecessarily.

**Solution**: Improved `useAuthor` hook with:
- Better localStorage caching with error handling
- Longer staleTime (5 minutes)
- Longer garbage collection time (10 minutes)
- Enabled/disabled based on whether pubkey exists

**Impact**: Fewer profile queries, faster profile display.

### 10. Optimized Feed Query

**Problem**: Feed query had short staleTime and aggressive refetching.

**Solution**: Updated `useParanormalFeed` with:
- Increased staleTime from 30s to 60s
- Added garbage collection time (5 minutes)
- Reduced retries from 3 to 1
- Increased timeout from 3s to 5s

**Impact**: Better cache utilization, fewer redundant feed requests.

## Performance Metrics

### Before Optimizations:
- **Initial Load**: 24+ network requests for interactions alone
- **WebSocket Connections**: 12+ concurrent subscriptions
- **Console Messages**: 961+ log messages per session
- **Bundle Size**: All pages in initial bundle
- **Re-renders**: Frequent unnecessary re-renders

### After Optimizations:
- **Initial Load**: 1 batch request for all interactions (~96% reduction)
- **WebSocket Connections**: 0 persistent subscriptions
- **Console Messages**: Minimal production logging
- **Bundle Size**: Code-split with lazy loading
- **Re-renders**: Memoized components prevent unnecessary updates

## Monitoring Performance

To monitor the effectiveness of these optimizations:

1. **Chrome DevTools Network Tab**: Check number of requests on page load
2. **React DevTools Profiler**: Measure component render times
3. **Chrome DevTools Performance Tab**: Analyze overall page performance
4. **Lighthouse**: Run audit for performance score

## Future Optimizations

Potential future improvements:

1. **Virtual Scrolling**: For feeds with 100+ posts
2. **Service Worker**: For offline caching and faster loads
3. **Image Optimization**: Lazy load images with WebP format
4. **Prefetching**: Prefetch next page of posts on scroll
5. **HTTP/2 Server Push**: Push critical resources early
6. **Compression**: Enable Brotli/Gzip on server
7. **CDN**: Serve static assets from CDN

## Trade-offs

These optimizations involve some trade-offs:

1. **Real-time Updates**: Removed in favor of performance - users now rely on manual refresh or optimistic updates
2. **Initial Data**: Lazy loaded posts show skeletons briefly before content appears
3. **Cache Management**: Longer staleTime means slightly stale data, but better performance

These trade-offs are acceptable for most use cases and can be adjusted based on user feedback.
