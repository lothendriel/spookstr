import { useEffect } from 'react';

/**
 * Memory monitoring hook that tracks and alerts on memory usage.
 * Logs warnings when memory usage exceeds 80% of the JavaScript heap limit.
 * Checks memory usage every 30 seconds when the tab is visible.
 */
export function useMemoryMonitor() {
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        
        const usagePercent = (usedMB / limitMB) * 100;
        
        // Log memory stats at regular intervals
        console.log(`🧠 [Memory Monitor] Usage: ${usedMB}MB/${limitMB}MB (${usagePercent.toFixed(1)}%)`);
        
        // Warn when memory usage is high
        if (usagePercent > 80) {
          console.warn(`🚨 [Memory Monitor] High memory usage detected: ${usedMB}MB/${limitMB}MB (${usagePercent.toFixed(1)}%)`);
          console.warn('🚨 [Memory Monitor] Consider refreshing the page or closing unused tabs to free up memory.');
        }
        
        // Critical warning when memory usage is very high
        if (usagePercent > 90) {
          console.error(`🔥 [Memory Monitor] CRITICAL memory usage: ${usedMB}MB/${limitMB}MB (${usagePercent.toFixed(1)}%)`);
          console.error('🔥 [Memory Monitor] Memory leak likely detected. Refresh the page immediately.');
        }
        
        // Log garbage collection opportunity
        if (usagePercent > 70 && memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
          console.log(`🗑️ [Memory Monitor] High heap fragmentation detected (${usedMB}MB used, ${totalMB}MB total allocated)`);
          console.log('🗑️ [Memory Monitor] Browser may need to perform garbage collection soon.');
        }
      } else {
        // Fallback for browsers that don't support memory API
        console.debug('[Memory Monitor] Memory API not available in this browser');
      }
    };

    // Check memory immediately when hook mounts
    checkMemory();

    // Set up interval to check memory every 30 seconds
    const interval = setInterval(() => {
      // Only check memory if the tab is visible to avoid unnecessary checks
      if (!document.hidden) {
        checkMemory();
      }
    }, 30000); // Check every 30 seconds

    // Cleanup interval when component unmounts
    return () => {
      clearInterval(interval);
      console.log('[Memory Monitor] Memory monitoring stopped');
    };
  }, []); // Empty dependency array means this runs once when component mounts
}

/**
 * Hook to monitor memory usage for a specific component or operation.
 * Takes a component name and logs memory usage around component lifecycle.
 */
export function useComponentMemoryMonitor(componentName: string) {
  useEffect(() => {
    if (!('memory' in performance)) return;

    const startMemory = (performance as any).memory.usedJSHeapSize;
    console.log(`📊 [Memory Monitor] ${componentName} mounted. Initial memory: ${Math.round(startMemory / 1024 / 1024)}MB`);

    return () => {
      const endMemory = (performance as any).memory.usedJSHeapSize;
      const memoryDiff = endMemory - startMemory;
      console.log(`📊 [Memory Monitor] ${componentName} unmounted. Memory change: ${Math.round(memoryDiff / 1024)}KB (${memoryDiff > 0 ? '+' : ''}${Math.round(memoryDiff / 1024 / 1024 * 100) / 100}MB)`);
    };
  }, [componentName]);
}

/**
 * Hook to track memory usage during expensive operations.
 * Returns start and stop functions to measure memory changes.
 */
export function useOperationMemoryTracker() {
  if (!('memory' in performance)) {
    return {
      start: () => {},
      stop: () => 0
    };
  }

  let startMemory = 0;

  const start = (operationName?: string) => {
    startMemory = (performance as any).memory.usedJSHeapSize;
    if (operationName) {
      console.log(`🔍 [Memory Tracker] Starting ${operationName}. Memory: ${Math.round(startMemory / 1024 / 1024)}MB`);
    }
  };

  const stop = (operationName?: string) => {
    const endMemory = (performance as any).memory.usedJSHeapSize;
    const memoryDiff = endMemory - startMemory;
    
    if (operationName) {
      console.log(`🔍 [Memory Tracker] Finished ${operationName}. Memory change: ${Math.round(memoryDiff / 1024)}KB (${memoryDiff > 0 ? '+' : ''}${Math.round(memoryDiff / 1024 / 1024 * 100) / 100}MB)`);
    }
    
    return memoryDiff;
  };

  return { start, stop };
}