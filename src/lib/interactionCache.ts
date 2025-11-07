/**
 * Utility functions for managing user interaction cache
 */

export interface UserInteractionCache {
  liked: boolean;
  reposted: boolean;
  zapped: boolean;
  timestamp: number;
}

const CACHE_PREFIX = 'user-interaction-';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Clean up old cache entries to prevent localStorage bloat
 */
export function cleanupInteractionCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            // Remove if timestamp is missing or too old
            if (!parsed.timestamp || (now - parsed.timestamp) > CACHE_TTL) {
              localStorage.removeItem(key);
              console.log(`[Cache Cleanup] Removed old cache entry: ${key}`);
            }
          }
        } catch (error) {
          // Remove invalid cache entries
          localStorage.removeItem(key);
          console.warn(`[Cache Cleanup] Removed invalid cache entry: ${key}`, error);
        }
      }
    });
  } catch (error) {
    console.error('[Cache Cleanup] Failed to clean up interaction cache:', error);
  }
}

/**
 * Get cached user interactions for a specific event
 */
export function getCachedInteractions(userPubkey: string, eventId: string): UserInteractionCache | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${userPubkey}-${eventId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const parsed = JSON.parse(cached);
    
    // Validate cache structure and check if it's not expired
    if (!parsed.timestamp || (Date.now() - parsed.timestamp) > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to get cached interactions:', error);
    return null;
  }
}

/**
 * Set cached user interactions for a specific event
 */
export function setCachedInteractions(
  userPubkey: string, 
  eventId: string, 
  interactions: Partial<UserInteractionCache>
): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${userPubkey}-${eventId}`;
    const existing = getCachedInteractions(userPubkey, eventId) || {
      liked: false,
      reposted: false,
      zapped: false,
      timestamp: Date.now()
    };
    
    const updated: UserInteractionCache = {
      ...existing,
      ...interactions,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to set cached interactions:', error);
  }
}

/**
 * Clear all interaction cache (useful for logout/testing)
 */
export function clearAllInteractionCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache] Cleared all interaction cache entries');
  } catch (error) {
    console.error('Failed to clear interaction cache:', error);
  }
}