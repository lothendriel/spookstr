/**
 * Standardized Query Key System for React Query
 *
 * This module provides consistent, predictable query keys across the application,
 * preventing cache collisions and enabling efficient cache invalidation.
 */

// Base types for query keys
export type QueryKey = readonly unknown[];

// Query key factories for different data types
export const queryKeys = {
  // User-related queries
  user: {
    all: ['users'] as const,
    details: (pubkey: string) => ['users', 'details', pubkey] as const,
    metadata: (pubkey: string) => ['users', 'metadata', pubkey] as const,
    follows: (pubkey: string) => ['users', 'follows', pubkey] as const,
    relays: (pubkey: string) => ['users', 'relays', pubkey] as const,
  },

  // Author/profile queries
  author: {
    details: (pubkey: string) => ['author', pubkey] as const,
    metadata: (pubkey: string) => ['author', 'metadata', pubkey] as const,
    feed: (pubkey: string) => ['author', 'feed', pubkey] as const,
  },

  // Post-related queries
  post: {
    details: (eventId: string) => ['post', 'details', eventId] as const,
    interactions: (eventId: string) => ['post', 'interactions', eventId] as const,
    likes: (eventId: string) => ['post', 'likes', eventId] as const,
    reposts: (eventId: string) => ['post', 'reposts', eventId] as const,
    zaps: (eventId: string) => ['post', 'zaps', eventId] as const,
    replies: (eventId: string) => ['post', 'replies', eventId] as const,
    quoted: (eventId: string) => ['post', 'quoted', eventId] as const,
  },

  // Feed-related queries
  feed: {
    main: () => ['feed', 'main'] as const,
    paranormal: () => ['feed', 'paranormal'] as const,
    global: () => ['feed', 'global'] as const,
    following: (pubkey: string) => ['feed', 'following', pubkey] as const,
    hashtag: (tag: string) => ['feed', 'hashtag', tag] as const,
  },

  // Interaction queries
  interactions: {
    batch: (eventIds: string[]) => ['interactions', 'batch', eventIds.sort().join(',')] as const,
    single: (eventId: string) => ['interactions', 'single', eventId] as const,
    likes: (eventIds: string[]) => ['interactions', 'likes', eventIds.sort().join(',')] as const,
    reposts: (eventIds: string[]) => ['interactions', 'reposts', eventIds.sort().join(',')] as const,
    zaps: (eventIds: string[]) => ['interactions', 'zaps', eventIds.sort().join(',')] as const,
    comments: (eventIds: string[]) => ['interactions', 'comments', eventIds.sort().join(',')] as const,
  },

  // Comment queries
  comment: {
    list: (eventId: string) => ['comments', 'list', eventId] as const,
    single: (commentId: string) => ['comments', 'single', commentId] as const,
    likes: (commentId: string) => ['comments', 'likes', commentId] as const,
  },

  // Media queries
  media: {
    upload: () => ['media', 'upload'] as const,
    preview: (url: string) => ['media', 'preview', url] as const,
  },

  // Authentication queries
  auth: {
    accounts: () => ['auth', 'accounts'] as const,
    current: () => ['auth', 'current'] as const,
    login: () => ['auth', 'login'] as const,
    logout: () => ['auth', 'logout'] as const,
  },

  // Configuration queries
  config: {
    app: () => ['config', 'app'] as const,
    relays: () => ['config', 'relays'] as const,
    preferences: () => ['config', 'preferences'] as const,
  },

  // Discovery queries
  discovery: {
    feed: () => ['discovery', 'feed'] as const,
    relays: () => ['discovery', 'relays'] as const,
    events: (context: string) => ['discovery', 'events', context] as const,
  },

  // Community queries
  community: {
    list: () => ['community', 'list'] as const,
    details: (id: string) => ['community', 'details', id] as const,
    topics: (id: string) => ['community', 'topics', id] as const,
    posts: (id: string) => ['community', 'posts', id] as const,
  },

  // Search queries
  search: {
    posts: (query: string) => ['search', 'posts', query] as const,
    users: (query: string) => ['search', 'users', query] as const,
    hashtags: (query: string) => ['search', 'hashtags', query] as const,
  },

  // Utility functions for building complex keys
  build: {
    withFilters: (baseKey: QueryKey, filters: Record<string, any>) =>
      [...baseKey, 'filters', filters] as const,
    withPagination: (baseKey: QueryKey, page: number, limit: number) =>
      [...baseKey, 'page', page, 'limit', limit] as const,
    withSorting: (baseKey: QueryKey, sortBy: string, sortOrder: 'asc' | 'desc') =>
      [...baseKey, 'sort', sortBy, sortOrder] as const,
    withTimeRange: (baseKey: QueryKey, since: number, until?: number) =>
      [...baseKey, 'since', since, ...(until ? ['until', until] : [])] as const,
  },
} as const;

// Type helpers for better TypeScript support
export type UserQueryKeys = typeof queryKeys.user;
export type AuthorQueryKeys = typeof queryKeys.author;
export type PostQueryKeys = typeof queryKeys.post;
export type FeedQueryKeys = typeof queryKeys.feed;
export type InteractionQueryKeys = typeof queryKeys.interactions;
export type CommentQueryKeys = typeof queryKeys.comment;
export type MediaQueryKeys = typeof queryKeys.media;
export type AuthQueryKeys = typeof queryKeys.auth;
export type ConfigQueryKeys = typeof queryKeys.config;
export type DiscoveryQueryKeys = typeof queryKeys.discovery;
export type CommunityQueryKeys = typeof queryKeys.community;
export type SearchQueryKeys = typeof queryKeys.search;

// Cache invalidation helpers
export const invalidate = {
  // User data
  user: (pubkey?: string) => {
    const keys = pubkey
      ? [queryKeys.user.details(pubkey), queryKeys.user.metadata(pubkey)]
      : [queryKeys.user.all];
    return { queryKey: keys };
  },

  // Author data
  author: (pubkey: string) => {
    return { queryKey: [queryKeys.author.details(pubkey), queryKeys.author.metadata(pubkey)] };
  },

  // Post data
  post: (eventId: string) => {
    return {
      queryKey: [
        queryKeys.post.details(eventId),
        queryKeys.post.interactions(eventId),
        queryKeys.post.likes(eventId),
        queryKeys.post.reposts(eventId),
        queryKeys.post.zaps(eventId),
        queryKeys.post.replies(eventId),
      ]
    };
  },

  // Feed data
  feed: () => {
    return { queryKey: [queryKeys.feed.main(), queryKeys.feed.paranormal(), queryKeys.feed.global()] };
  },

  // Interactions
  interactions: (eventIds?: string[]) => {
    const keys = eventIds
      ? eventIds.map(id => queryKeys.interactions.single(id))
      : [queryKeys.interactions.batch([])];
    return { queryKey: keys };
  },

  // Comments
  comments: (eventId?: string) => {
    const keys = eventId
      ? [queryKeys.comment.list(eventId)]
      : ['comments'];
    return { queryKey: keys };
  },

  // Auth data
  auth: () => {
    return { queryKey: [queryKeys.auth.accounts(), queryKeys.auth.current()] };
  },

  // Config data
  config: () => {
    return { queryKey: [queryKeys.config.app(), queryKeys.config.relays(), queryKeys.config.preferences()] };
  },

  // Discovery data
  discovery: () => {
    return { queryKey: [queryKeys.discovery.feed(), queryKeys.discovery.relays()] };
  },

  // Community data
  community: (id?: string) => {
    const keys = id
      ? [queryKeys.community.details(id), queryKeys.community.topics(id), queryKeys.community.posts(id)]
      : [queryKeys.community.list()];
    return { queryKey: keys };
  },
} as const;

// Prefetch helpers
export const prefetch = {
  // User data
  user: (pubkey: string) => {
    return [queryKeys.user.details(pubkey), queryKeys.user.metadata(pubkey)];
  },

  // Author data
  author: (pubkey: string) => {
    return [queryKeys.author.details(pubkey), queryKeys.author.metadata(pubkey)];
  },

  // Post data
  post: (eventId: string) => {
    return [
      queryKeys.post.details(eventId),
      queryKeys.post.interactions(eventId),
    ];
  },

  // Feed data
  feed: () => {
    return [queryKeys.feed.main(), queryKeys.feed.paranormal()];
  },
} as const;

// All query keys are already exported above