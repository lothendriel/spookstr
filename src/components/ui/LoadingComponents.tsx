/**
 * Standardized loading components for consistent UI patterns
 * These components provide unified loading states across the application
 */

import { cn } from '@/lib/utils';
import { Loader2, RotateCw, Hash, User, FileText } from 'lucide-react';
import { LoadingProps, SkeletonProps } from '@/types/components';

/**
 * Main loading component with multiple variants
 */
export function Loading({ 
  variant = 'spinner', 
  size = 'md', 
  className,
  showText = false,
  text = 'Loading...',
  count = 1
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const renderSpinner = () => (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      {[...Array(3)].map((_, i) => (
        <div 
          key={i}
          className={cn(
            'rounded-full bg-lime-500 animate-bounce',
            sizeClasses[size],
            i === 0 && 'animation-delay-0',
            i === 1 && 'animation-delay-150',
            i === 2 && 'animation-delay-300'
          )}
        />
      ))}
    </div>
  );

  const renderBars = () => (
    <div className={cn('flex space-x-1 items-end', className)}>
      {[...Array(4)].map((_, i) => (
        <div 
          key={i}
          className={cn(
            'bg-lime-500 animate-pulse',
            sizeClasses[size],
            {
              'h-2': size === 'sm',
              'h-4': size === 'md', 
              'h-6': size === 'lg'
            }
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            width: size === 'sm' ? '4px' : size === 'md' ? '6px' : '8px'
          }}
        />
      ))}
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'bars':
        return renderBars();
      case 'skeleton':
        return <Skeleton count={count} variant="custom" size={size} className={className} />;
      default:
        return renderSpinner();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderContent()}
      {showText && (
        <span className={cn('text-lime-500/60', textSizes[size])}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Skeleton component with multiple variants
 */
export function Skeleton({ 
  lines = 1, 
  width = 'full', 
  height, 
  variant = 'text',
  size = 'md',
  className 
}: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'avatar':
        return 'rounded-full';
      case 'button':
        return 'rounded-md';
      case 'card':
        return 'rounded-lg';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getSizeClasses = () => {
    if (variant === 'avatar') {
      switch (size) {
        case 'sm': return 'h-8 w-8';
        case 'md': return 'h-10 w-10';
        case 'lg': return 'h-12 w-12';
        default: return 'h-10 w-10';
      }
    }

    if (variant === 'button') {
      switch (size) {
        case 'sm': return 'h-8';
        case 'md': return 'h-10';
        case 'lg': return 'h-12';
        default: return 'h-10';
      }
    }

    // For text and custom variants
    if (height) {
      return `h-${height}`;
    }

    switch (size) {
      case 'sm': return 'h-3';
      case 'md': return 'h-4';
      case 'lg': return 'h-5';
      default: return 'h-4';
    }
  };

  const getWidthClass = () => {
    if (typeof width === 'number') {
      return `w-${width}`;
    }
    return width === 'full' ? 'w-full' : width;
  };

  const renderSkeletonLine = (index: number) => {
    const isLastLine = index === lines - 1;
    const lineWidth = isLastLine && lines > 1 ? '3/4' : width;
    
    return (
      <div
        key={index}
        className={cn(
          'bg-lime-500/20 animate-pulse',
          getVariantClasses(),
          getSizeClasses(),
          typeof lineWidth === 'number' ? `w-${lineWidth}` : lineWidth === 'full' ? 'w-full' : `w-${lineWidth}`
        )}
      />
    );
  };

  if (lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => renderSkeletonLine(i))}
      </div>
    );
  }

  return (
    <div className={cn('bg-lime-500/20 animate-pulse', getVariantClasses(), getSizeClasses(), getWidthClass(), className)} />
  );
}

/**
 * Post skeleton for consistent post loading states
 */
export function PostSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-lime-500/20 bg-black/40 backdrop-blur-sm', className)}>
      <div className="p-4 space-y-3">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3">
          <Skeleton variant="avatar" size="md" />
          <div className="space-y-2 flex-1">
            <Skeleton width="24" height="4" />
            <Skeleton width="16" height="3" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-2">
          <Skeleton width="full" />
          <Skeleton width="4/5" />
          <Skeleton width="3/5" />
        </div>
        
        {/* Actions skeleton */}
        <div className="flex items-center space-x-4 pt-3 border-t border-lime-500/20">
          <Skeleton variant="button" size="sm" />
          <Skeleton variant="button" size="sm" />
          <Skeleton variant="button" size="sm" />
          <Skeleton variant="button" size="sm" />
        </div>
      </div>
    </div>
  );
}

/**
 * Feed skeleton for loading multiple posts
 */
export function FeedSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Profile skeleton for user profile loading
 */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-lime-500/20 bg-black/40 backdrop-blur-sm rounded-lg p-6', className)}>
      <div className="flex flex-col items-center space-y-4">
        <Skeleton variant="avatar" size="lg" />
        <div className="text-center space-y-2 w-full">
          <Skeleton width="32" height="6" className="mx-auto" />
          <Skeleton width="24" height="4" className="mx-auto" />
          <Skeleton width="20" height="3" className="mx-auto" />
        </div>
        <div className="w-full space-y-2">
          <Skeleton width="full" height="4" />
          <Skeleton width="4/5" height="4" />
          <Skeleton width="3/5" height="4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Comment skeleton for comment sections
 */
export function CommentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-lime-500/20 bg-black/40 backdrop-blur-sm rounded-lg p-4', className)}>
      <div className="flex space-x-3">
        <Skeleton variant="avatar" size="sm" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton width="20" height="4" />
            <Skeleton width="16" height="3" />
          </div>
          <Skeleton width="full" height="4" />
          <Skeleton width="3/4" height="4" />
          <div className="flex items-center space-x-4 pt-2">
            <Skeleton variant="button" size="sm" />
            <Skeleton variant="button" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized loading components for different contexts
 */
export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Loading variant="spinner" size={size} className={className} />
  );
}

export function LoadingDots({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Loading variant="dots" size={size} className={className} />
  );
}

export function LoadingBars({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Loading variant="bars" size={size} className={className} />
  );
}

/**
 * Loading overlay for blocking operations
 */
export function LoadingOverlay({ 
  isVisible, 
  text = 'Loading...',
  className 
}: { 
  isVisible: boolean; 
  text?: string; 
  className?: string; 
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <span className="text-lime-400 text-lg font-medium">{text}</span>
      </div>
    </div>
  );
}

/**
 * Inline loading component for button states
 */
export function InlineLoading({ className }: { className?: string }) {
  return (
    <LoadingSpinner size="sm" className={cn('inline-block mr-2', className)} />
  );
}

// Export all loading components
export {
  Loading as default,
  Skeleton,
  PostSkeleton,
  FeedSkeleton,
  ProfileSkeleton,
  CommentSkeleton,
  LoadingSpinner,
  LoadingDots,
  LoadingBars,
  LoadingOverlay,
  InlineLoading
};