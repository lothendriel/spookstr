/**
 * Central Type Definitions for Spookstr Application
 * 
 * This module provides comprehensive type safety across the application,
 * ensuring consistent data structures and reducing runtime errors.
 */

// Re-export core Nostr types for convenience
export type {
  NostrEvent,
  Filter,
  NostrMetadata,
  NostrSigner,
} from '@nostrify/nostrify';

// Application-specific type extensions
export interface AppUser {
  pubkey: string;
  metadata: NostrMetadata;
  signer: NostrSigner;
  isLoggedIn: boolean;
  isCurrentUser?: boolean;
}

export interface AppAccount {
  id: string;
  pubkey: string;
  event?: NostrEvent;
  metadata: NostrMetadata;
}

export interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

export interface EventInteractions {
  likes: NostrEvent[];
  reposts: NostrEvent[];
  zaps: NostrEvent[];
  replies: NostrEvent[];
  counts: InteractionCounts;
}

export interface InteractionsByEvent {
  [eventId: string]: EventInteractions;
}

export interface AllInteractions {
  likes: NostrEvent[];
  reposts: NostrEvent[];
  zaps: NostrEvent[];
  replies: NostrEvent[];
  counts: InteractionCounts;
  byEvent: InteractionsByEvent;
}

// Feed types
export interface FeedItem {
  event: NostrEvent;
  author: AppUser;
  interactions?: EventInteractions;
  isRepost?: boolean;
  repostedEvent?: NostrEvent;
}

export interface FeedConfig {
  limit: number;
  kinds?: number[];
  authors?: string[];
  hashtags?: string[];
  since?: number;
  until?: number;
}

// Relay configuration types
export interface RelayConfig {
  url: string;
  mode: 'read' | 'write' | 'both';
  isPreset?: boolean;
  priority?: number;
}

export interface AppConfiguration {
  relayUrl: string;
  relays: RelayConfig[];
  blossomServers: string[];
  includeClientTag: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

// Media types
export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaMetadata {
  size?: number;
  format?: string;
  bitrate?: number;
  fps?: number;
  spotifyType?: 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode';
  spotifyId?: string;
  streamingFormat?: 'hls' | 'dash';
  cdnProvider?: 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'vimeo' | 'youtube' | 'generic';
  isAdaptive?: boolean;
  qualities?: Array<{ height: number; bitrate: number; url?: string }>;
  masterPlaylist?: string;
  type?: string;
  year?: string;
  rating?: string;
  postId?: string;
  postType?: 'post' | 'video' | 'photo' | 'reel';
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'youtube' | 'vimeo' | 'twitch' | 'dailymotion' | 'tiktok' | 'spotify' | 'soundcloud' | 'bandcamp' | 'mixcloud' | 'external' | 'link' | 'hls' | 'dash' | 'imdb' | 'instagram' | 'twitter' | 'facebook' | 'minds' | 'odysee' | 'rumble' | 'bitchute' | 'peertube';
  url: string;
  alt?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  dimensions?: MediaDimensions;
  description?: string;
  siteName?: string;
  metadata?: MediaMetadata;
}

// Open Graph types
export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
  type?: string;
}

// Comment types
export interface Comment {
  id: string;
  event: NostrEvent;
  author: AppUser;
  replies: Comment[];
  likes: number;
  createdAt: number;
  isReply?: boolean;
  replyTo?: string;
}

export interface CommentThread {
  root: Comment;
  replies: Comment[];
}

// Community types
export interface Community {
  id: string;
  name: string;
  description: string;
  image?: string;
  moderators: string[];
  rules: string[];
  topics: string[];
  createdAt: number;
}

export interface CommunityTopic {
  id: string;
  name: string;
  description: string;
  communityId: string;
  postCount: number;
}

// Search types
export interface SearchResult {
  id: string;
  type: 'post' | 'user' | 'community' | 'hashtag';
  score: number;
  highlights?: string[];
}

export interface SearchResults {
  posts: NostrEvent[];
  users: AppUser[];
  communities: Community[];
  hashtags: string[];
  totalCount: number;
  hasMore: boolean;
}

// Discovery types
export interface DiscoveryStats {
  eventsFound: number;
  hintsUsed: boolean;
  relaysTried: number;
  successRate: number;
  averageLatency: number;
}

export interface DiscoveryEvent {
  id: string;
  kind: number;
  pubkey: string;
  content: string;
  createdAt: number;
  tags: string[][];
  relayHints: string[];
  score: number;
}

// Toast notification types
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

// Navigation types
export interface NavigationItem {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavigationItem[];
  separator?: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | null;
  };
}

export interface FormState<T = any> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    sans: string[];
    serif: string[];
    mono: string[];
  };
  spacing: {
    unit: number;
    scale: number;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

// Hook result types
export interface HookResult<T, E = Error> {
  data: T | undefined;
  isLoading: boolean;
  error: E | null;
  refetch: () => void;
  isFetching: boolean;
}

export interface MutationResult<T, V = any, E = Error> {
  data: T | undefined;
  error: E | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  mutate: (variables: V) => Promise<T>;
  mutateAsync: (variables: V) => Promise<T>;
  reset: () => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event handler types
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any, R = any> = (event: T) => Promise<R>;

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface LoadingStateProps extends BaseComponentProps {
  isLoading: boolean;
  error?: Error | string | null;
  retry?: () => void;
  skeleton?: React.ComponentType<BaseComponentProps>;
}

export interface WithChildrenProps {
  children: React.ReactNode;
}

// Error handling types
export interface AppError {
  category: 'network' | 'authentication' | 'validation' | 'relay' | 'publishing' | 'upload' | 'cache' | 'unknown';
  code: string;
  message: string;
  details?: any;
  userMessage: string;
  retryable: boolean;
  timestamp: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Performance monitoring types
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

// Feature flag types
export interface FeatureFlags {
  enableAdvancedMedia: boolean;
  enableRealtimeUpdates: boolean;
  enableOfflineMode: boolean;
  enableExperimentalFeatures: boolean;
  enableDebugMode: boolean;
}

// Localization types
export interface LocalizationConfig {
  locale: string;
  fallbackLocale: string;
  messages: Record<string, string>;
  formatters: {
    date: Intl.DateTimeFormat;
    number: Intl.NumberFormat;
    currency: Intl.NumberFormat;
  };
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  sampleRate: number;
  events: AnalyticsEvent[];
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  retryCount: number;
  lastMessage?: WebSocketMessage;
  error?: Error;
}

// Network types
export interface NetworkState {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | null;
  saveData: boolean;
  downlink: number;
  rtt: number;
}

// Storage types
export interface StorageConfig {
  type: 'local' | 'session' | 'memory';
  prefix?: string;
  version?: string;
  migration?: (oldData: any, version: string) => any;
}

export interface StorageItem<T = any> {
  key: string;
  value: T;
  expires?: number;
  version?: string;
}

// Validation types
export interface ValidationRule {
  name: string;
  validate: (value: any) => boolean | string;
  message: string;
}

export interface ValidationSchema<T = any> {
  [key: string]: ValidationRule;
}

// Utility function types
export type Predicate<T = any> = (value: T) => boolean;
export type Mapper<T = any, R = any> = (value: T) => R;
export type Reducer<T = any, A = any> = (state: T, action: A) => T;
export type Comparator<T = any> = (a: T, b: T) => number;

// React specific types
export interface ComponentWithRef<T, P = {}> 
  extends React.ForwardRefRenderFunction<T, P> {}

export interface ComponentWithChildrenProps<P = {}>
  extends React.PropsWithChildren<P> {}

// Export all types for easy importing
export type * from './common';
export type * from './events';
export type * from './media';
export type * from './forms';
export type * from './navigation';
export type * from './errors';
export type * from './performance';
export type * from './analytics';
export type * from './storage';
export type * from './validation';