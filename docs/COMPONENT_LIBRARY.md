# Spookstr Component Library

Comprehensive documentation for all standardized components in the Spookstr application.

## Table of Contents

- [Loading Components](#loading-components)
- [Author Display Components](#author-display-components)
- [Error Handling Components](#error-handling-components)
- [Interaction Components](#interaction-components)
- [Dialog Components](#dialog-components)
- [Post Components](#post-components)
- [Feed Components](#feed-components)
- [Offline Components](#offline-components)
- [Performance Components](#performance-components)

---

## Loading Components

Located in: `src/components/ui/LoadingComponents.tsx`

### `<Loading />`

Main loading component with multiple variants for different loading scenarios.

**Props:**
- `variant`: `'spinner' | 'dots' | 'bars' | 'skeleton'` (default: `'spinner'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `showText`: `boolean` (default: `false`)
- `text`: `string` (default: `'Loading...'`)
- `count`: `number` (default: `1`) - for skeleton variant
- `className`: `string`

**Usage:**
```tsx
// Spinner
<Loading variant="spinner" size="md" />

// Dots with text
<Loading variant="dots" showText text="Loading posts..." />

// Skeleton
<Loading variant="skeleton" count={3} />
```

### `<Skeleton />`

Flexible skeleton loader for placeholder content.

**Props:**
- `lines`: `number` (default: `1`)
- `width`: `string | number` (default: `'full'`)
- `height`: `string | number`
- `variant`: `'text' | 'avatar' | 'button' | 'card' | 'custom'` (default: `'text'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `className`: `string`

**Usage:**
```tsx
// Avatar skeleton
<Skeleton variant="avatar" size="md" />

// Multi-line text skeleton
<Skeleton lines={3} width="full" />

// Button skeleton
<Skeleton variant="button" size="lg" />
```

### Specialized Skeletons

#### `<PostSkeleton />`
Pre-configured skeleton for post cards.

```tsx
<PostSkeleton className="mb-4" />
```

#### `<FeedSkeleton />`
Multiple post skeletons for feed loading.

```tsx
<FeedSkeleton count={5} />
```

#### `<ProfileSkeleton />`
Skeleton for profile pages.

```tsx
<ProfileSkeleton />
```

#### `<CommentSkeleton />`
Skeleton for comment sections.

```tsx
<CommentSkeleton />
```

### Other Loading Components

#### `<LoadingOverlay />`
Full-screen loading overlay for blocking operations.

```tsx
<LoadingOverlay isVisible={isSubmitting} text="Publishing post..." />
```

#### `<InlineLoading />`
Small inline spinner for buttons.

```tsx
<Button disabled={isLoading}>
  {isLoading && <InlineLoading />}
  Submit
</Button>
```

---

## Author Display Components

Located in: `src/components/author/AuthorDisplay.tsx`

### `<AuthorDisplay />`

Standardized component for displaying user information.

**Props:**
- `pubkey`: `string` (required) - User's Nostr public key
- `metadata`: `NostrMetadata` - Optional pre-loaded metadata
- `showAvatar`: `boolean` (default: `true`)
- `showName`: `boolean` (default: `true`)
- `showNip05`: `boolean` (default: `true`)
- `showTime`: `boolean` (default: `false`)
- `timestamp`: `number` - Unix timestamp for "time ago" display
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `variant`: `'default' | 'compact' | 'minimal'` (default: `'default'`)
- `onAvatarClick`: `(pubkey: string) => void`
- `onNameClick`: `(pubkey: string) => void`
- `className`: `string`

**Usage:**
```tsx
// Basic usage
<AuthorDisplay 
  pubkey={event.pubkey} 
  showTime
  timestamp={event.created_at}
/>

// With custom metadata
<AuthorDisplay 
  pubkey={user.pubkey}
  metadata={user.metadata}
  size="lg"
/>

// Compact variant for tight spaces
<AuthorDisplay 
  pubkey={author.pubkey}
  variant="compact"
  size="sm"
/>
```

### Variants

#### `<CompactAuthorDisplay />`
Compact spacing for cards and lists.

```tsx
<CompactAuthorDisplay pubkey={pubkey} showTime timestamp={created_at} />
```

#### `<MinimalAuthorDisplay />`
Minimal spacing for very tight layouts.

```tsx
<MinimalAuthorDisplay pubkey={pubkey} showAvatar={false} />
```

#### `<CommentAuthorDisplay />`
Small size optimized for comments.

```tsx
<CommentAuthorDisplay pubkey={comment.pubkey} />
```

#### `<RepostAuthorDisplay />`
Shows both reposter and original author.

```tsx
<RepostAuthorDisplay
  reposterPubkey={repost.pubkey}
  reposterMetadata={reposterMetadata}
  pubkey={originalEvent.pubkey}
  metadata={originalMetadata}
/>
```

#### `<EnhancedAuthorDisplay />`
Extended information with about and lightning address.

```tsx
<EnhancedAuthorDisplay
  pubkey={user.pubkey}
  metadata={user.metadata}
  showAbout
  showLightningAddress
  maxAboutLength={150}
/>
```

---

## Error Handling Components

Located in: `src/components/ui/ErrorBoundary.tsx`

### `<ErrorBoundary />`

React error boundary for catching and handling component errors.

**Props:**
- `children`: `ReactNode` (required)
- `fallback`: `ReactNode` - Custom error UI
- `onError`: `(error: Error, errorInfo: ErrorInfo) => void`
- `resetKeys`: `Array<string | number>` - Reset on key changes
- `resetOnPropsChange`: `boolean` (default: `false`)
- `className`: `string`

**Usage:**
```tsx
<ErrorBoundary 
  onError={(error) => console.error(error)}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <ComplexComponent />
</ErrorBoundary>
```

### `<NetworkError />`

Specialized error display for network failures.

```tsx
<NetworkError 
  error={error} 
  onRetry={() => refetch()}
/>
```

### `<EmptyState />`

Consistent empty state display.

```tsx
<EmptyState
  icon={<FileText className="h-8 w-8" />}
  title="No posts found"
  description="Try adjusting your filters or check another relay"
  action={<Button onClick={refresh}>Refresh</Button>}
/>
```

### `<ErrorAlert />`

Inline error messages with optional dismiss.

```tsx
<ErrorAlert 
  error={error} 
  onDismiss={() => clearError()}
  variant="destructive"
/>
```

### `<PageError />`

Full-page error display.

```tsx
<PageError
  title="Page Not Found"
  description="The page you're looking for doesn't exist."
  action={{
    label: "Go Home",
    onClick: () => navigate('/'),
    icon: <Home className="h-4 w-4" />
  }}
  backAction={{
    onClick: () => navigate(-1)
  }}
/>
```

---

## Interaction Components

Located in: `src/components/interactions/InteractionButtons.tsx`

### `<InteractionButtons />`

Complete set of interaction buttons (like, repost, comment, zap).

**Props:**
- `eventId`: `string` (required)
- `targetPubkey`: `string` (required)
- `isLiked`: `boolean`
- `isReposted`: `boolean`
- `likeCount`: `number`
- `repostCount`: `number`
- `commentCount`: `number`
- `zapCount`: `number`
- `totalSats`: `number`
- `hasLightningAddress`: `boolean`
- `onComment`: `() => void`
- `onQuote`: `() => void`
- `onInteraction`: `(type, data) => void`
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `variant`: `'default' | 'compact' | 'minimal'` (default: `'default'`)
- `disabled`: `boolean`
- `className`: `string`

**Usage:**
```tsx
<InteractionButtons
  eventId={post.id}
  targetPubkey={post.pubkey}
  likeCount={20}
  repostCount={5}
  commentCount={12}
  zapCount={8}
  totalSats={5000}
  hasLightningAddress={!!author.lud16}
  onComment={() => navigateToComments()}
  onQuote={() => openQuoteDialog()}
/>
```

### Individual Buttons

#### `<LikeButton />`
```tsx
<LikeButton
  eventId={post.id}
  targetPubkey={post.pubkey}
  isLiked={hasLiked}
  likeCount={20}
/>
```

#### `<RepostButton />`
```tsx
<RepostButton
  eventId={post.id}
  targetPubkey={post.pubkey}
  isReposted={hasReposted}
  repostCount={5}
  onQuote={() => openQuoteDialog()}
/>
```

#### `<CommentButton />`
```tsx
<CommentButton
  eventId={post.id}
  commentCount={12}
  onComment={() => scrollToComments()}
/>
```

#### `<ZapButtonComponent />`
```tsx
<ZapButtonComponent
  eventId={post.id}
  targetPubkey={post.pubkey}
  zapCount={8}
  totalSats={5000}
  hasLightningAddress={true}
/>
```

---

## Dialog Components

Located in: `src/components/dialogs/`

### `<QuoteDialog />`

Dialog for creating quote reposts.

**Props:**
- `isOpen`: `boolean` (required)
- `onClose`: `() => void` (required)
- `targetEvent`: `NostrEvent` (required)
- `onQuote`: `(content: string, spookstrOnly: boolean) => void`
- `isSubmitting`: `boolean`
- `spookstrOnly`: `boolean`
- `onSpookstrOnlyChange`: `(checked: boolean) => void`
- `className`: `string`

**Usage:**
```tsx
const { isOpen, targetEvent, openQuoteDialog, closeQuoteDialog } = useQuoteDialog();

<QuoteDialog
  isOpen={isOpen}
  onClose={closeQuoteDialog}
  targetEvent={targetEvent}
  onQuote={handleQuoteSubmit}
/>
```

### `useQuoteDialog` Hook

Manages quote dialog state.

```tsx
const {
  isOpen,
  targetEvent,
  isSubmitting,
  spookstrOnly,
  setSpookstrOnly,
  openQuoteDialog,
  closeQuoteDialog,
  setIsSubmitting
} = useQuoteDialog();
```

---

## Post Components

Located in: `src/components/posts/`

### `<StandardizedPost />`

Optimized, standardized post component with all features.

**Props:**
- `event`: `NostrEvent` (required)
- `onClick`: `() => void`
- `showActions`: `boolean` (default: `true`)
- `showHeader`: `boolean` (default: `true`)
- `showFooter`: `boolean` (default: `true`)
- `isCompact`: `boolean` (default: `false`)
- `variant`: `'default' | 'card' | 'minimal'` (default: `'default'`)
- `className`: `string`

**Usage:**
```tsx
// Full post
<StandardizedPost 
  event={post}
  onClick={() => navigateToDetail(post)}
/>

// Compact variant
<StandardizedPost 
  event={post}
  isCompact
  variant="minimal"
/>

// Memoized version for better performance
<MemoizedStandardizedPost event={post} />
```

### `<SafeStandardizedPost />`

Post component with built-in error boundary.

```tsx
<SafeStandardizedPost event={post} onClick={handleClick} />
```

---

## Feed Components

Located in: `src/components/feeds/`

### `<OptimizedFeed />`

High-performance feed with virtual scrolling and infinite scroll.

**Props:**
- `filters`: `Filter[]` (required) - Nostr filters
- `initialLoadSize`: `number` (default: `20`)
- `batchSize`: `number` (default: `20`)
- `virtualScrolling`: `boolean` (default: `true`)
- `dynamicHeight`: `boolean` (default: `false`)
- `estimatedItemHeight`: `number` (default: `200`)
- `onPostClick`: `(post: NostrEvent) => void`
- `emptyStateTitle`: `string`
- `emptyStateDescription`: `string`
- `enablePerformanceMonitoring`: `boolean` (default: `false`)
- `className`: `string`

**Usage:**
```tsx
<OptimizedFeed
  filters={[{ kinds: [1], limit: 20 }]}
  onPostClick={(post) => navigate(`/post/${post.id}`)}
  emptyStateTitle="No paranormal posts"
  emptyStateDescription="Be the first to share a spooky story!"
/>

// With performance monitoring (dev only)
<OptimizedFeed
  filters={[{ kinds: [1], '#t': ['ghost'] }]}
  virtualScrolling={true}
  dynamicHeight={true}
  enablePerformanceMonitoring={true}
/>
```

---

## Offline Components

Located in: `src/components/offline/`

### `<OfflineManager />`

Comprehensive offline state management UI.

**Props:**
- `showBanner`: `boolean` (default: `true`)
- `showDetails`: `boolean` (default: `false`)
- `className`: `string`

**Usage:**
```tsx
// In header/layout
<OfflineManager showBanner showDetails={false} />

// In settings page
<OfflineManager showBanner showDetails />
```

### `<OfflineIndicatorBadge />`

Compact badge for headers showing offline/syncing status.

```tsx
<div className="flex items-center gap-2">
  <h1>Spookstr</h1>
  <OfflineIndicatorBadge />
</div>
```

### `<OfflineDotIndicator />`

Minimal dot indicator for tight spaces.

```tsx
<OfflineDotIndicator className="ml-2" />
```

---

## Performance Components

Located in: `src/components/performance/`

### `<PerformanceMonitor />`

Development tool for monitoring component performance.

**Props:**
- `children`: `ReactNode` (required)
- `enabled`: `boolean` (default: `process.env.NODE_ENV === 'development'`)
- `maxHistory`: `number` (default: `50`)
- `onMetricsUpdate`: `(metrics: PerformanceMetrics) => void`
- `showInProduction`: `boolean` (default: `false`)
- `trackMemory`: `boolean` (default: `true`)
- `slowRenderThreshold`: `number` (default: `16`) - milliseconds

**Usage:**
```tsx
<PerformanceMonitor 
  enabled={isDev}
  onMetricsUpdate={(metrics) => logMetrics(metrics)}
>
  <App />
</PerformanceMonitor>
```

### `<PerformanceWrapper />`

Lightweight performance tracking for individual components.

```tsx
<PerformanceWrapper 
  componentName="FeedContent"
  logSlowRenders
  slowRenderThreshold={16}
>
  <FeedContent posts={posts} />
</PerformanceWrapper>
```

---

## Virtual Scrolling Components

Located in: `src/components/ui/VirtualScroll.tsx`

### `<VirtualScroll />`

Efficient virtual scrolling for large lists.

**Props:**
- `items`: `any[]` (required)
- `renderItem`: `(item, index, style) => ReactNode` (required)
- `itemHeight`: `number | ((index, item) => number)` (default: `60`)
- `overscan`: `number` (default: `5`)
- `height`: `number` (default: `400`)
- `isLoading`: `boolean`
- `hasMore`: `boolean`
- `onLoadMore`: `() => void`
- `emptyState`: `ReactNode`
- `loadingState`: `ReactNode`
- `className`: `string`

**Usage:**
```tsx
<VirtualScroll
  items={posts}
  itemHeight={200}
  renderItem={(post, index, style) => (
    <div style={style}>
      <Post event={post} />
    </div>
  )}
  height={600}
  hasMore={hasMore}
  onLoadMore={loadMore}
/>
```

### `<DynamicVirtualScroll />`

Virtual scrolling with dynamic item heights.

```tsx
<DynamicVirtualScroll
  items={posts}
  estimatedItemHeight={200}
  getItemHeight={(index, post) => calculateHeight(post)}
  renderItem={(post, index, style) => (
    <div style={style}><Post event={post} /></div>
  )}
/>
```

### `<InfiniteScroll />`

Simple infinite scroll wrapper.

```tsx
<InfiniteScroll
  hasMore={hasMore}
  isLoading={isLoading}
  onLoadMore={loadMore}
  threshold={0.8}
>
  {posts.map(post => <Post key={post.id} event={post} />)}
</InfiniteScroll>
```

---

## Image Components

Located in: `src/components/ui/ImageLazyLoad.tsx`

### `<ImageLazyLoad />`

Optimized image loading with lazy loading and error handling.

**Props:**
- `src`: `string` (required)
- `alt`: `string` (required)
- `placeholder`: `string` - Low-res placeholder
- `fallback`: `string` - Error fallback image
- `width`: `number`
- `height`: `number`
- `loading`: `'lazy' | 'eager'` (default: `'lazy'`)
- `priority`: `boolean` (default: `false`)
- `blurDataURL`: `string` - Blur placeholder
- `objectFit`: `'cover' | 'contain' | 'fill' | 'none' | 'scale-down'`
- `aspectRatio`: `string`
- `zoomable`: `boolean`
- `onLoad`: `() => void`
- `onError`: `(error: Error) => void`
- `className`: `string`

**Usage:**
```tsx
<ImageLazyLoad
  src={imageUrl}
  alt="Paranormal photo"
  aspectRatio="16/9"
  objectFit="cover"
  priority={isHero}
/>
```

### `<ImageGallery />`

Grid gallery with lazy loading.

```tsx
<ImageGallery
  images={[
    { src: 'url1', alt: 'Photo 1', title: 'Ghost sighting' },
    { src: 'url2', alt: 'Photo 2', title: 'UFO' }
  ]}
  columns={3}
  gap={4}
  onImageClick={(index) => openLightbox(index)}
/>
```

### `<LazyAvatar />`

Optimized avatar component.

```tsx
<LazyAvatar
  src={user.picture}
  alt={user.name}
  size="md"
  fallback="/default-avatar.png"
/>
```

---

## Advanced Hooks

### State Management Hooks

Located in: `src/hooks/useOptimizedState.ts`

#### `usePersistentState`
State that persists to localStorage.

```tsx
const [theme, setTheme, clearTheme] = usePersistentState('theme', 'dark');
```

#### `useBatchedState`
Batches updates to prevent excessive re-renders.

```tsx
const [state, setState, flush] = useBatchedState(initialValue, 16);
```

#### `useDraftState`
Auto-saving drafts with dirty tracking.

```tsx
const [draft, setDraft, clearDraft, isDirty] = useDraftState(
  'post-draft',
  '',
  1000 // Auto-save delay
);
```

#### `useUndoableState`
Full undo/redo functionality.

```tsx
const {
  state,
  setState,
  undo,
  redo,
  canUndo,
  canRedo,
  reset
} = useUndoableState(initialValue);
```

#### `useFormState`
Complete form management.

```tsx
const {
  values,
  errors,
  touched,
  isDirty,
  isValid,
  setValue,
  setFieldTouched,
  validateAll,
  reset
} = useFormState(
  { email: '', password: '' },
  {
    email: (val) => !val.includes('@') ? 'Invalid email' : null,
    password: (val) => val.length < 8 ? 'Too short' : null
  }
);
```

### Offline Hooks

Located in: `src/lib/stateManagement.ts`

#### `useOfflineState`
Offline detection and action queuing.

```tsx
const { isOnline, pendingCount, queueAction, clearPending } = useOfflineState();

// Queue action for offline sync
queueAction(async () => {
  await publishEvent(event);
});
```

### Real-time Sync Hooks

Located in: `src/lib/realtimeSync.ts`

#### `useFeedRealtimeUpdates`
Live feed updates with notifications.

```tsx
const { 
  isConnected, 
  newPostCount, 
  latestEvent, 
  resetNewPostCount 
} = useFeedRealtimeUpdates({
  kinds: [1],
  enabled: true,
  onNewPost: (event) => toast('New post!')
});
```

#### `useInteractionRealtimeUpdates`
Real-time interaction counters.

```tsx
const { isConnected, updates } = useInteractionRealtimeUpdates(eventId);

console.log(updates.likes, updates.reposts, updates.zaps, updates.comments);
```

---

## Performance Utilities

Located in: `src/lib/bundleOptimization.ts`

### Lazy Loading

```tsx
import { LazyComponents } from '@/lib/bundleOptimization';

// Use lazy loaded components
<LazyComponents.CommunitiesPage />
<LazyComponents.ParanormalMap />
<LazyComponents.PodcastPlayerCard />
```

### Performance Optimization

```tsx
import { PerformanceOptimizer } from '@/lib/bundleOptimization';

// Debounce function
const debouncedSearch = PerformanceOptimizer.debounce(search, 300);

// Throttle scroll handler
const throttledScroll = PerformanceOptimizer.throttle(handleScroll, 100);

// Memoize expensive computation
const memoizedCompute = PerformanceOptimizer.memoize(expensiveFunction, 100);
```

### Bundle Analysis

```tsx
import { BundleAnalyzer, BundleOptimization } from '@/lib/bundleOptimization';

// Get bundle size
const size = await BundleAnalyzer.getEstimatedSize();
console.log(size); // { js: 1024000, css: 50000, images: 200000, total: 1274000 }

// Get memory stats
const memory = BundleAnalyzer.getMemoryStats();
console.log(memory); // { used: 45, total: 100, percentage: 45 }

// Get optimization recommendations
const recommendations = await BundleOptimization.getRecommendations();
console.log(recommendations);
```

---

## Best Practices

### Component Composition

Always use standardized components instead of duplicating logic:

```tsx
// ❌ Bad: Duplicate logic
function MyPost() {
  const author = useAuthor(pubkey);
  const displayName = getDisplayName(author.metadata, pubkey);
  
  return (
    <div>
      <img src={author.metadata?.picture} />
      <span>{displayName}</span>
    </div>
  );
}

// ✅ Good: Use standardized component
function MyPost() {
  return (
    <StandardizedPost 
      event={post}
      onClick={handleClick}
    />
  );
}
```

### Loading States

Use skeleton loading for structured content, spinners only for buttons:

```tsx
// ✅ Good: Skeleton for feed
{isLoading ? <FeedSkeleton count={5} /> : <FeedContent posts={posts} />}

// ✅ Good: Inline spinner for button
<Button disabled={isSubmitting}>
  {isSubmitting && <InlineLoading />}
  Submit
</Button>
```

### Error Handling

Wrap complex components in error boundaries:

```tsx
<ErrorBoundary onError={logError}>
  <ComplexFeature />
</ErrorBoundary>
```

### Performance

Use virtualization for large lists:

```tsx
// ❌ Bad: Render all 10,000 items
{posts.map(post => <Post event={post} />)}

// ✅ Good: Virtual scroll
<VirtualScroll
  items={posts}
  itemHeight={200}
  renderItem={(post) => <Post event={post} />}
/>
```

---

## Migration Guide

### Migrating from ParanormalPost to StandardizedPost

```tsx
// Before
<ParanormalPost 
  event={post}
  onClick={() => navigate(`/post/${post.id}`)}
  showActions={true}
/>

// After
<StandardizedPost
  event={post}
  onClick={() => navigate(`/post/${post.id}`)}
  showActions={true}
/>
```

Benefits:
- 80% less code duplication
- Better performance through memoization
- Consistent error handling
- Standardized loading states

---

## TypeScript Support

All components have full TypeScript support with exported prop types:

```tsx
import type { 
  EventDisplayProps,
  AuthorDisplayProps,
  InteractionProps,
  LoadingProps,
  ErrorBoundaryProps
} from '@/types/components';
```

---

## Contributing

When creating new components:

1. **Use existing components** as building blocks
2. **Follow prop naming conventions** from `@/types/components.ts`
3. **Add error boundaries** for complex components
4. **Use skeleton loading** for content, spinners for actions
5. **Memoize** expensive components
6. **Add TypeScript types** for all props
7. **Test** with provided test utilities

---

## Support

For questions or issues:
- Check existing component implementations in `src/components/`
- Review type definitions in `src/types/components.ts`
- See examples in component test files
- Consult architecture documentation in `/docs/`

**Last Updated**: January 8, 2025
**Version**: 3.0.0 - Phase 3 Complete