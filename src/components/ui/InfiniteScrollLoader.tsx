import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { Ghost } from 'lucide-react';

interface InfiniteScrollLoaderProps {
  isLoading?: boolean;
  hasMore?: boolean;
  className?: string;
  loader?: React.ReactNode;
  emptyState?: React.ReactNode;
}

/**
 * Loading component for infinite scroll with empty state support
 */
export function InfiniteScrollLoader({
  isLoading = false,
  hasMore = false,
  className,
  loader,
  emptyState
}: InfiniteScrollLoaderProps) {
  // Show empty state when not loading and no more content
  if (!isLoading && !hasMore) {
    return (
      <div className={cn('py-8 text-center', className)}>
        {emptyState || (
          <div className="space-y-4">
            <Ghost className="h-12 w-12 text-lime-500/40 mx-auto" />
            <p className="text-lime-500/60">You've reached the end</p>
          </div>
        )}
      </div>
    );
  }

  // Show loading spinner when loading more content
  if (isLoading && hasMore) {
    return (
      <div className={cn('py-4', className)}>
        {loader || (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent" />
          </div>
        )}
      </div>
    );
  }

  // Hidden trigger element for intersection observer
  return (
    <div className={cn('h-1', className)}>
      {/* This element will be observed by the intersection observer */}
    </div>
  );
}

/**
 * Skeleton loader for infinite scroll content
 */
export function InfiniteScrollSkeleton({
  count = 3,
  className
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-lime-500/20 rounded-lg p-4 bg-black/40">
          <div className="flex items-center space-x-3 mb-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default InfiniteScrollLoader;