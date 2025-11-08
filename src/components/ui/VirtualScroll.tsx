/**
 * Virtual Scrolling Component
 * Efficiently renders large lists by only rendering visible items
 * Significantly improves performance for feeds, comments, and other scrollable content
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loading } from './LoadingComponents';
import { EmptyState } from './ErrorBoundary';
import { InfiniteScrollProps } from '@/types/components';

interface VirtualItem {
  index: number;
  size: number;
  offset: number;
  data?: any;
}

interface VirtualScrollProps {
  items: any[];
  itemHeight?: number | ((index: number, item: any) => number);
  renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  height?: number;
  className?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  estimatedItemHeight?: number;
  bufferSize?: number;
  threshold?: number;
}

export function VirtualScroll({
  items,
  itemHeight = 60,
  renderItem,
  overscan = 5,
  height = 400,
  className,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  emptyState,
  loadingState,
  estimatedItemHeight = 60,
  bufferSize = 10,
  threshold = 0.8
}: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(height);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate item sizes
  const itemSizes = useMemo(() => {
    return items.map((item, index) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index, item);
      }
      return itemHeight;
    });
  }, [items, itemHeight]);

  // Calculate total height of all items
  const totalHeight = useMemo(() => {
    return itemSizes.reduce((sum, size) => sum + size, 0);
  }, [itemSizes]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let start = 0;
    let offset = 0;
    
    // Find start index based on scroll position
    for (let i = 0; i < itemSizes.length; i++) {
      if (offset + itemSizes[i] > scrollTop) {
        start = i;
        break;
      }
      offset += itemSizes[i];
    }

    // Find end index
    let end = start;
    let currentHeight = 0;
    for (let i = start; i < itemSizes.length; i++) {
      currentHeight += itemSizes[i];
      if (currentHeight > containerHeight + overscan * estimatedItemHeight) {
        end = i + 1;
        break;
      }
      end = i + 1;
    }

    // Add overscan
    start = Math.max(0, start - overscan);
    end = Math.min(itemSizes.length, end + overscan);

    return { start, end, offset };
  }, [scrollTop, itemSizes, containerHeight, overscan, estimatedItemHeight]);

  // Generate visible items
  const visibleItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let offset = visibleRange.offset;

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        size: itemSizes[i],
        offset,
        data: items[i]
      });
      offset += itemSizes[i];
    }

    return items;
  }, [visibleRange, itemSizes, items]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollElementRef.current) {
      const newScrollTop = scrollElementRef.current.scrollTop;
      setScrollTop(newScrollTop);

      // Infinite scroll detection
      if (hasMore && onLoadMore && !isLoading) {
        const { scrollHeight, clientHeight } = scrollElementRef.current;
        const scrollPercentage = (newScrollTop + clientHeight) / scrollHeight;
        
        if (scrollPercentage >= threshold) {
          onLoadMore();
        }
      }
    }
  }, [hasMore, onLoadMore, isLoading, threshold]);

  // Update container height
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.height !== containerHeight) {
        setContainerHeight(rect.height);
      }
    }
  }, [containerHeight]);

  // Add scroll listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {emptyState || (
          <EmptyState
            title="No items"
            description="There are no items to display."
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)} style={{ height }}>
      <div
        ref={scrollElementRef}
        className="h-full overflow-auto scrollbar-thin scrollbar-track-lime-500/20 scrollbar-thumb-lime-500/40 hover:scrollbar-thumb-lime-500/60"
      >
        {/* Total height container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          {visibleItems.map((item) => {
            const style: React.CSSProperties = {
              position: 'absolute',
              top: item.offset,
              left: 0,
              right: 0,
              height: item.size,
            };

            return (
              <div key={item.index} style={style}>
                {renderItem(item.data, item.index, style)}
              </div>
            );
          })}
        </div>

        {/* Loading indicator for infinite scroll */}
        {isLoading && hasMore && (
          <div className="py-4 flex justify-center">
            {loadingState || <Loading variant="spinner" size="md" />}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for virtual scrolling with automatic resizing
 */
export function useVirtualScroll({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: any[];
  itemHeight: number | ((index: number, item: any) => number);
  containerHeight: number;
  overscan?: number;
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [itemSizes, setItemSizes] = useState<number[]>([]);

  useEffect(() => {
    const sizes = items.map((item, index) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index, item);
      }
      return itemHeight;
    });
    setItemSizes(sizes);
  }, [items, itemHeight]);

  const scrollToIndex = useCallback((index: number) => {
    const offset = itemSizes.slice(0, index).reduce((sum, size) => sum + size, 0);
    return offset;
  }, [itemSizes]);

  return {
    itemSizes,
    visibleRange,
    scrollToIndex,
    totalHeight: itemSizes.reduce((sum, size) => sum + size, 0)
  };
}

/**
 * Virtual list for dynamic item heights
 */
interface DynamicVirtualScrollProps extends Omit<VirtualScrollProps, 'itemHeight'> {
  estimatedItemHeight: number;
  getItemHeight?: (index: number, item: any) => number;
  onItemResize?: (index: number, height: number) => void;
}

export function DynamicVirtualScroll({
  items,
  estimatedItemHeight,
  getItemHeight,
  onItemResize,
  ...props
}: DynamicVirtualScrollProps) {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [observedItems, setObservedItems] = useState<Set<number>>(new Set());

  // Measure item heights
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    
    if (!itemHeights.has(index) || itemHeights.get(index) !== height) {
      const newHeights = new Map(itemHeights);
      newHeights.set(index, height);
      setItemHeights(newHeights);
      onItemResize?.(index, height);
    }
  }, [itemHeights, onItemResize]);

  // Intersection Observer for measuring visible items
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting && !observedItems.has(index)) {
            const element = entry.target as HTMLElement;
            measureItem(index, element);
            setObservedItems(prev => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => observer.disconnect();
  }, [measureItem, observedItems]);

  const getItemHeightCalculated = useCallback((index: number, item: any) => {
    if (getItemHeight) {
      return getItemHeight(index, item);
    }
    if (itemHeights.has(index)) {
      return itemHeights.get(index)!;
    }
    return estimatedItemHeight;
  }, [getItemHeight, itemHeights, estimatedItemHeight]);

  return (
    <VirtualScroll
      {...props}
      items={items}
      itemHeight={getItemHeightCalculated}
      estimatedItemHeight={estimatedItemHeight}
    />
  );
}

/**
 * Infinite scroll wrapper for any content
 */
export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  children,
  threshold = 0.8,
  className,
  loader = <Loading variant="spinner" size="md" />
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
  loader?: React.ReactNode;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerRef.current && loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            onLoadMore();
          }
        },
        { threshold }
      );

      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div className={cn('space-y-4', className)}>
      {children}
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-1">
        {/* Hidden element for intersection observer */}
      </div>

      {/* Loading indicator */}
      {isLoading && hasMore && (
        <div className="py-4 flex justify-center">
          {loader}
        </div>
      )}
    </div>
  );
}

export default VirtualScroll;