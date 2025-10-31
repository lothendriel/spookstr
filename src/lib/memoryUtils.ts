/**
 * Memory utility functions for optimizing performance and preventing memory leaks
 */

// Track active event listeners for cleanup
const activeEventListeners = new Map<string, {
  element: Element | Window;
  event: string;
  handler: EventListener;
  options?: AddEventListenerOptions;
}>();

// Track active WebSocket connections for cleanup
const activeWebSockets = new Set<WebSocket>();

// Track active AbortControllers for cleanup
const activeAbortControllers = new Set<AbortController>();

/**
 * Add an event listener with tracking for cleanup
 */
export function addTrackedEventListener(
  element: Element | Window,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void {
  const key = `${element.constructor.name}-${event}-${handler.name || 'anonymous'}`;

  element.addEventListener(event, handler, options);
  activeEventListeners.set(key, { element, event, handler, options });

  if (import.meta.env.DEV) {
    console.log(`🎯 [Memory Utils] Tracked event listener: ${key}`);
  }
}

/**
 * Remove a tracked event listener
 */
export function removeTrackedEventListener(
  element: Element | Window,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void {
  const key = `${element.constructor.name}-${event}-${handler.name || 'anonymous'}`;

  element.removeEventListener(event, handler, options);
  activeEventListeners.delete(key);

  if (import.meta.env.DEV) {
    console.log(`🎯 [Memory Utils] Removed event listener: ${key}`);
  }
}

/**
 * Create a WebSocket with tracking for cleanup
 */
export function createTrackedWebSocket(url: string, protocols?: string | string[]): WebSocket {
  const ws = new WebSocket(url, protocols);
  activeWebSockets.add(ws);

  if (import.meta.env.DEV) {
    console.log(`🔌 [Memory Utils] Created WebSocket: ${url}`);
  }

  // Auto-remove from tracking when closed
  ws.addEventListener('close', () => {
    activeWebSockets.delete(ws);
    if (import.meta.env.DEV) {
      console.log(`🔌 [Memory Utils] WebSocket closed: ${url}`);
    }
  });

  return ws;
}

/**
 * Create an AbortController with tracking for cleanup
 */
export function createTrackedAbortController(): AbortController {
  const controller = new AbortController();
  activeAbortControllers.add(controller);

  if (import.meta.env.DEV) {
    console.log(`🛑 [Memory Utils] Created AbortController`);
  }

  // Auto-remove from tracking when aborted
  controller.signal.addEventListener('abort', () => {
    activeAbortControllers.delete(controller);
    if (import.meta.env.DEV) {
      console.log(`🛑 [Memory Utils] AbortController aborted`);
    }
  });

  return controller;
}

/**
 * Aggressive cleanup of all tracked resources
 */
export function performAggressiveCleanup(): void {
  if (import.meta.env.DEV) {
    console.log('🧹 [Memory Utils] Starting aggressive cleanup...');
  }

  let cleanupCount = 0;

  // 1. Clean up event listeners
  const listenerCount = activeEventListeners.size;
  for (const [key, { element, event, handler, options }] of activeEventListeners.entries()) {
    try {
      element.removeEventListener(event, handler, options);
      cleanupCount++;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`🧹 [Memory Utils] Failed to remove event listener ${key}:`, error);
      }
    }
  }
  activeEventListeners.clear();
  if (import.meta.env.DEV) {
    console.log(`🧹 [Memory Utils] Cleaned up ${listenerCount} event listeners`);
  }

  // 2. Clean up WebSockets
  const wsCount = activeWebSockets.size;
  for (const ws of activeWebSockets) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Memory cleanup');
        cleanupCount++;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('🧹 [Memory Utils] Failed to close WebSocket:', error);
      }
    }
  }
  activeWebSockets.clear();
  if (import.meta.env.DEV) {
    console.log(`🧹 [Memory Utils] Cleaned up ${wsCount} WebSockets`);
  }

  // 3. Clean up AbortControllers
  const controllerCount = activeAbortControllers.size;
  for (const controller of activeAbortControllers) {
    try {
      if (!controller.signal.aborted) {
        controller.abort();
        cleanupCount++;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('🧹 [Memory Utils] Failed to abort controller:', error);
      }
    }
  }
  activeAbortControllers.clear();
  if (import.meta.env.DEV) {
    console.log(`🧹 [Memory Utils] Cleaned up ${controllerCount} AbortControllers`);
  }

  if (import.meta.env.DEV) {
    console.log(`🧹 [Memory Utils] Aggressive cleanup completed. Total resources cleaned: ${cleanupCount}`);
  }
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(): {
  used: number;
  total: number;
  limit: number;
  usagePercent: number;
} | null {
  if (!('memory' in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  const used = memory.usedJSHeapSize;
  const total = memory.totalJSHeapSize;
  const limit = memory.jsHeapSizeLimit;
  const usagePercent = (used / limit) * 100;

  return {
    used: Math.round(used / 1024 / 1024),
    total: Math.round(total / 1024 / 1024),
    limit: Math.round(limit / 1024 / 1024),
    usagePercent: Math.round(usagePercent * 100) / 100,
  };
}

/**
 * Log current memory usage
 */
export function logMemoryUsage(context: string = ''): void {
  const stats = getMemoryStats();
  if (!stats) {
    if (import.meta.env.DEV) {
      console.log(`🧠 [Memory Utils] ${context} Memory API not available`);
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.log(`🧠 [Memory Utils] ${context} Usage: ${stats.used}MB/${stats.limit}MB (${stats.usagePercent}%)`);
  }

  if (stats.usagePercent > 80) {
    if (import.meta.env.DEV) {
    console.warn(`🚨 [Memory Utils] ${context} High memory usage: ${stats.usagePercent}%`);
  }
  }

  if (stats.usagePercent > 90) {
    if (import.meta.env.DEV) {
    console.error(`🔥 [Memory Utils] ${context} CRITICAL memory usage: ${stats.usagePercent}%`);
  }
  }
}

/**
 * Cleanup function that can be attached to window for external access
 */
if (typeof window !== 'undefined') {
  (window as any).performAggressiveCleanup = performAggressiveCleanup;
  (window as any).logMemoryUsage = logMemoryUsage;
  (window as any).getMemoryStats = getMemoryStats;
}