import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { performAggressiveCleanup, logMemoryUsage } from '@/lib/memoryUtils';

/**
 * Aggressive memory cleanup hook that helps prevent memory leaks
 * by periodically cleaning up unused resources and caches.
 */
export function useAggressiveMemoryCleanup() {
  const queryClient = useQueryClient();
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🧹 [Memory Cleanup] Starting aggressive memory cleanup...');

    const performCleanup = () => {
      logMemoryUsage('Before cleanup');

      try {
        // 1. Clean up React Query cache - remove old/unused queries
        const queryCache = queryClient.getQueryCache();
        const allQueries = queryCache.getAll();
        const now = Date.now();

        let removedCount = 0;
        allQueries.forEach(query => {
          const state = query.state;
          const age = now - state.dataUpdatedAt;

          // Remove queries older than 10 minutes that aren't currently active
          if (age > 600000 && !query.getObserversCount()) {
            queryCache.remove(query);
            removedCount++;
          }
        });

        if (removedCount > 0) {
          console.log('🧹 [Memory Cleanup] Removed', removedCount, 'old queries from cache');
        }

        // 2. Force garbage collection if available (Chrome DevTools only)
        if ((window as any).gc && !import.meta.env.PROD) {
          try {
            (window as any).gc();
            console.log('🧹 [Memory Cleanup] Forced garbage collection completed');
          } catch (e) {
            console.debug('[Memory Cleanup] Garbage collection not available');
          }
        }

        // 3. Clean up localStorage cache for user interactions
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('user-interaction-'));
        if (cacheKeys.length > 100) { // Only clean if we have too many
          const keysToRemove = cacheKeys.slice(0, cacheKeys.length - 50); // Keep only 50 most recent
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.log('🧹 [Memory Cleanup] Cleaned up', keysToRemove.length, 'old localStorage cache entries');
        }

        // 4. Clean up tracked resources using memory utilities
        performAggressiveCleanup();

        logMemoryUsage('After cleanup');

      } catch (error) {
        console.error('🧹 [Memory Cleanup] Error during cleanup:', error);
      }
    };

    // Run cleanup every 2 minutes
    cleanupIntervalRef.current = setInterval(performCleanup, 120000);

    // Also run cleanup when tab becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🧹 [Memory Cleanup] Tab became visible, running cleanup...');
        performCleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Run initial cleanup after 30 seconds
    const initialCleanupTimer = setTimeout(performCleanup, 30000);

    return () => {
      console.log('🧹 [Memory Cleanup] Stopping memory cleanup...');

      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(initialCleanupTimer);

      // Final cleanup on unmount
      performCleanup();
    };
  }, [queryClient]);
}

/**
 * Hook to monitor memory usage and trigger cleanup when needed
 */
export function useMemoryMonitorWithCleanup() {
  useEffect(() => {
    const checkMemoryAndCleanup = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = (usedMB / limitMB) * 100;

        console.log(`🧠 [Memory Monitor] Usage: ${usedMB}MB/${limitMB}MB (${usagePercent.toFixed(1)}%)`);

        // Trigger cleanup if memory usage is high
        if (usagePercent > 70) {
          console.warn(`🚨 [Memory Monitor] High memory usage detected: ${usagePercent.toFixed(1)}%`);

          // Trigger cleanup by dispatching a custom event
          window.dispatchEvent(new CustomEvent('memory-cleanup-needed'));
        }

        // Critical warning when memory usage is very high
        if (usagePercent > 85) {
          console.error(`🔥 [Memory Monitor] CRITICAL memory usage: ${usagePercent.toFixed(1)}%`);
          console.error(`🔥 [Memory Monitor] Consider refreshing the page or closing other tabs`);

          // More aggressive cleanup for critical memory usage
          window.dispatchEvent(new CustomEvent('aggressive-memory-cleanup-needed'));
        }
      }
    };

    // Check memory every minute
    const interval = setInterval(checkMemoryAndCleanup, 60000);

    // Initial check
    checkMemoryAndCleanup();

    return () => {
      clearInterval(interval);
    };
  }, []);
}