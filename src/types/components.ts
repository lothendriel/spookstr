/**
 * Standardized component prop interfaces for Spookstr
 * This file defines consistent patterns for all component props
 */

import { NostrEvent } from '@nostrify/nostrify';
import { ReactNode } from 'react';

// Base interfaces for common patterns
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface LoadingStateProps extends BaseComponentProps {
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
}

// Event-related component props
export interface EventDisplayProps extends BaseComponentProps {
  event: NostrEvent;
  onClick?: (event: NostrEvent) => void;
  showActions?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  isCompact?: boolean;
}

export interface AuthorDisplayProps extends BaseComponentProps {
  pubkey: string;
  metadata?: {
    name?: string;
    display_name?: string;
    picture?: string;
    nip05?: string;
    lud16?: string;
    lud06?: string;
    about?: string;
  };
  showAvatar?: boolean;
  showName?: boolean;
  showNip05?: boolean;
  showTime?: boolean;
  timestamp?: number;
  onAvatarClick?: (pubkey: string) => void;
  onNameClick?: (pubkey: string) => void;
}

// Interaction-related component props
export interface InteractionProps extends BaseComponentProps {
  eventId: string;
  targetPubkey: string;
  currentUserPubkey?: string;
  onInteraction?: (type: 'like' | 'repost' | 'zap' | 'comment', data: any) => void;
  disabled?: boolean;
  showCounts?: boolean;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface LikeButtonProps extends InteractionProps {
  isLiked?: boolean;
  likeCount?: number;
  onLike?: () => void;
}

export interface RepostButtonProps extends InteractionProps {
  isReposted?: boolean;
  repostCount?: number;
  onRepost?: (spookstrOnly?: boolean) => void;
  onQuote?: () => void;
}

export interface ZapButtonProps extends InteractionProps {
  zapCount?: number;
  totalSats?: number;
  hasLightningAddress?: boolean;
  onZap?: (amount: number) => void;
  isLoading?: boolean;
}

export interface CommentButtonProps extends InteractionProps {
  commentCount?: number;
  onComment?: () => void;
}

// Dialog and modal props
export interface DialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
}

export interface QuoteDialogProps extends DialogProps {
  targetEvent: NostrEvent;
  onQuote: (content: string, spookstrOnly: boolean) => void;
  isSubmitting?: boolean;
  spookstrOnly?: boolean;
  onSpookstrOnlyChange?: (checked: boolean) => void;
}

// Feed and list props
export interface FeedProps extends BaseComponentProps {
  posts: NostrEvent[];
  postsToShow?: number;
  onPostClick?: (post: NostrEvent) => void;
  isLoading?: boolean;
  isError?: boolean;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  errorState?: ReactNode;
}

export interface InfiniteScrollProps extends BaseComponentProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
  children: ReactNode;
}

// Form and input props
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  error?: string | null;
  resetOnSubmit?: boolean;
}

export interface InputProps extends BaseComponentProps {
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
}

// Error boundary props
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

// Loading component props
export interface LoadingProps extends BaseComponentProps {
  variant?: 'skeleton' | 'spinner' | 'dots' | 'bars';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
  showText?: boolean;
  text?: string;
}

export interface SkeletonProps extends BaseComponentProps {
  lines?: number;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'avatar' | 'button' | 'card' | 'custom';
}

// Card and layout props
export interface CardProps extends BaseComponentProps {
  isHoverable?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  borderVariant?: 'default' | 'subtle' | 'strong' | 'none';
}

// Navigation props
export interface NavigationProps extends BaseComponentProps {
  items: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    isActive?: boolean;
    isDisabled?: boolean;
  }>;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'tabs' | 'pills' | 'underline';
}

// Export utility types for common patterns
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Common event handlers
export type EventHandler<T = any> = (data: T) => void;
export type AsyncEventHandler<T = any, R = any> = (data: T) => Promise<R>;

// Component size variants
export type ComponentSize = 'sm' | 'md' | 'lg';
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';

// Color variants for consistent theming
export type ColorVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Interaction states
export type InteractionState = 'default' | 'hover' | 'active' | 'disabled' | 'selected';

// Common component configurations
export const COMPONENT_DEFAULTS = {
  sizes: {
    sm: 'small',
    md: 'medium', 
    lg: 'large'
  },
  variants: {
    default: 'default',
    primary: 'primary',
    secondary: 'secondary',
    ghost: 'ghost',
    destructive: 'destructive'
  },
  loading: {
    skeleton: 'skeleton',
    spinner: 'spinner',
    dots: 'dots',
    bars: 'bars'
  }
} as const;