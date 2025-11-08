/**
 * Bundle Optimization Utilities
 * Helps analyze and optimize bundle size, implement code splitting, and lazy loading
 */

import { lazy, ComponentType, Suspense } from 'react';
import { Loading } from '@/components/ui/LoadingComponents';

// Dynamic import wrapper for lazy loading
export function lazyImport<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <Loading variant="spinner" size="lg" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Lazy loaded components
export const LazyComponents = {
  // Auth components
  LoginDialog: lazyImport(() => import('@/components/auth/LoginDialog')),
  SignupDialog: lazyImport(() => import('@/components/auth/SignupDialog')),
  
  // Community components
  CommunitiesPage: lazyImport(() => import('@/components/communities/CommunitiesPage')),
  CommunityView: lazyImport(() => import('@/components/communities/CommunityView')),
  
  // Calendar components
  CalendarDisplay: lazyImport(() => import('@/components/calendar/CalendarDisplay')),
  EventForm: lazyImport(() => import('@/components/calendar/EventForm')),
  
  // Map components
  ParanormalMap: lazyImport(() => import('@/components/paranormal-map/ParanormalMap')),
  LocationList: lazyImport(() => import('@/components/paranormal-map/LocationList')),
  
  // Marketplace components
  MarketplaceListing: lazyImport(() => import('@/components/MarketplaceListing')),
  
  // Long-form content
  LongFormContent: lazyImport(() => import('@/components/LongFormContent')),
  
  // Podcast components
  PodcastPlayerCard: lazyImport(() => import('@/components/PodcastPlayerCard')),
  PopOutPodcastPlayer: lazyImport(() => import('@/components/PopOutPodcastPlayer')),
  ParanormalPodcastsCarousel: lazyImport(() => import('@/components/ParanormalPodcastsCarousel')),
  
  // Chat components
  SimpleChat: lazyImport(() => import('@/components/SimpleChat')),
  EncryptedChat: lazyImport(() => import('@/components/chat/EncryptedChat')),
  
  // Profile management
  EditProfileForm: lazyImport(() => import('@/components/EditProfileForm')),
  
  // Management panels
  HiddenUsersManager: lazyImport(() => import('@/components/HiddenUsersManager')),
  HiddenHashtagsManager: lazyImport(() => import('@/components/HiddenHashtagsManager')),
  PersonalizedHashtagsManager: lazyImport(() => import('@/components/PersonalizedHashtagsManager')),
  CommunityManagement: lazyImport(() => import('@/components/CommunityManagement')),
  
  // Advanced features
  DeveloperTip: lazyImport(() => import('@/components/DeveloperTip')),
  IMDBPreview: lazyImport(() => import('@/components/IMDBPreview')),
  LinkPreview: lazyImport(() => import('@/components/LinkPreview')),
  LiveStreamEvent: lazyImport(() => import('@/components/LiveStreamEvent')),
  MediaDisplay: lazyImport(() => import('@/components/MediaDisplay')),
  QuotedEvent: lazyImport(() => import('@/components/QuotedEvent')),
  RedditParanormalFeed: lazyImport(() => import('@/components/RedditParanormalFeed')),
  
  // Specialized UI
  EventPreview: lazyImport(() => import('@/components/EventPreview')),
  SpookstrHeader: lazyImport(() => import('@/components/SpookstrHeader')),
  SpookstrProfileSync: lazyImport(() => import('@/components/SpookstrProfileSync')),
  NotificationBell: lazyImport(() => import('@/components/NotificationBell')),
  OfflineIndicator: lazyImport(() => import('@/components/OfflineIndicator')),
  RelayDiscoveryIndicator: lazyImport(() => import('@/components/RelayDiscoveryIndicator')),
  RelayDiscoveryPanel: lazyImport(() => import('@/components/RelayDiscoveryPanel')),
  RelayHintIndicator: lazyImport(() => import('@/components/RelayHintIndicator')),
  RelaySelector: lazyImport(() => import('@/components/RelaySelector')),
  
  // Create post components
  CreateParanormalPost: lazyImport(() => import('@/components/CreateParanormalPost')),
  CreateCommunityPost: lazyImport(() => import('@/components/CreateCommunityPost')),
  CreateCommunityDefinition: lazyImport(() => import('@/components/CreateCommunityDefinition')),
  CreatePostModal: lazyImport(() => import('@/components/CreatePostModal')),
  
  // Layout components
  DesktopLayout: lazyImport(() => import('@/components/DesktopLayout')),
  MobileLayout: lazyImport(() => import('@/components/MobileLayout')),
  
  // Comment and interaction components
  CommunityCommentForm: lazyImport(() => import('@/components/CommunityCommentForm')),
  CommentsSection: lazyImport(() => import('@/components/comments/CommentsSection')),
  ModerationPanel: lazyImport(() => import('@/components/ModerationPanel')),
  
  // Article view
  ArticleView: lazyImport(() => import('@/components/ArticleView')),
  
  // Post detail view
  PostDetailView: lazyImport(() => import('@/components/PostDetailView')),
};

// Dynamic hook loading for code splitting
export function createLazyHook<T extends (...args: any[]) => any>(
  importFunc: () => Promise<{ [key: string]: T }>,
  hookName: string
) {
  let hook: T | null = null;
  let promise: Promise<T> | null = null;

  return (...args: Parameters<T>): ReturnType<T> => {
    if (!hook) {
      if (!promise) {
        promise = importFunc().then(module => {
          hook = module[hookName];
          return hook!;
        });
      }
      throw promise;
    }
    return hook(...args);
  };
}

// Lazy loaded hooks
export const LazyHooks = {
  // Chat hooks
  useEncryptedChat: createLazyHook(
    () => import('@/hooks/useEncryptedChat'),
    'useEncryptedChat'
  ),
  
  // Map hooks
  useParanormalLocations: createLazyHook(
    () => import('@/hooks/useParanormalLocations'),
    'useParanormalLocations'
  ),
  
  // Podcast hooks
  usePodcastPlayer: createLazyHook(
    () => import('@/hooks/usePodcastPlayer'),
    'usePodcastPlayer'
  ),
  
  // Marketplace hooks
  useMarketplaceListings: createLazyHook(
    () => import('@/hooks/useMarketplaceListings'),
    'useMarketplaceListings'
  ),
  
  // Advanced features
  useIMDBLookup: createLazyHook(
    () => import('@/hooks/useIMDBLookup'),
    'useIMDBLookup'
  ),
  useLinkPreview: createLazyHook(
    () => import('@/hooks/useLinkPreview'),
    'useLinkPreview'
  ),
  useLiveStreamEvents: createLazyHook(
    () => import('@/hooks/useLiveStreamEvents'),
    'useLiveStreamEvents'
  ),
  useRedditParanormal: createLazyHook(
    () => import('@/hooks/useRedditParanormal'),
    'useRedditParanormal'
  ),
  
  // Profile management
  useProfileSync: createLazyHook(
    () => import('@/hooks/useProfileSync'),
    'useProfileSync'
  ),
  
  // Notification hooks
  useNotifications: createLazyHook(
    () => import('@/hooks/useNotifications'),
    'useNotifications'
  ),
  
  // Discovery hooks
  useRelayDiscovery: createLazyHook(
    () => import('@/hooks/useRelayDiscovery'),
    'useRelayDiscovery'
  ),
  usePostDetailDiscovery: createLazyHook(
    () => import('@/hooks/usePostDetailDiscovery'),
    'usePostDetailDiscovery'
  ),
};

// Bundle analysis utilities
export const BundleAnalyzer = {
  /**
   * Get estimated bundle size (client-side approximation)
   */
  getEstimatedSize: (): Promise<{
    js: number;
    css: number;
    images: number;
    total: number;
  }> => {
    return new Promise((resolve) => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const size = resources.reduce((acc, resource) => {
        const size = (resource as any).transferSize || 0;
        
        if (resource.name.includes('.js')) {
          acc.js += size;
        } else if (resource.name.includes('.css')) {
          acc.css += size;
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
          acc.images += size;
        }
        
        acc.total += size;
        return acc;
      }, { js: 0, css: 0, images: 0, total: 0 });
      
      resolve(size);
    });
  },

  /**
   * Analyze component usage patterns
   */
  analyzeComponentUsage: () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.startsWith('component-')) {
          console.log(`Component render: ${entry.name}`, {
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    return observer;
  },

  /**
   * Get memory usage statistics
   */
  getMemoryStats: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    }
    return null;
  }
};

// Performance optimization utilities
export const PerformanceOptimizer = {
  /**
   * Create a debounced version of a function
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate = false
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  },

  /**
   * Create a throttled version of a function
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Memoize a function with cache size limit
   */
  memoize: <T extends (...args: any[]) => any>(
    func: T,
    cacheSize = 100
  ): T => {
    const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 second TTL
        return cached.value;
      }
      
      const result = func(...args);
      
      if (cache.size >= cacheSize) {
        // Remove oldest entry
        const oldestKey = Array.from(cache.keys())[0];
        cache.delete(oldestKey);
      }
      
      cache.set(key, { value: result, timestamp: Date.now() });
      return result;
    }) as T;
  },

  /**
   * Batch multiple DOM updates
   */
  batchDOMUpdates: (updates: Array<() => void>) => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  },

  /**
   * Preload critical resources
   */
  preloadResources: (resources: Array<string | { url: string; type: 'script' | 'style' | 'image' }>) => {
    resources.forEach(resource => {
      let url: string;
      let type: 'script' | 'style' | 'image';
      
      if (typeof resource === 'string') {
        url = resource;
        // Detect type from URL
        if (url.endsWith('.js')) type = 'script';
        else if (url.endsWith('.css')) type = 'style';
        else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) type = 'image';
        else type = 'script'; // default
      } else {
        url = resource.url;
        type = resource.type;
      }
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = type === 'image' ? 'image' : type === 'style' ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }
};

// Bundle optimization recommendations
export const BundleOptimization = {
  /**
   * Get optimization recommendations based on current bundle analysis
   */
  getRecommendations: async () => {
    const recommendations = [];
    const memoryStats = BundleAnalyzer.getMemoryStats();
    const size = await BundleAnalyzer.getEstimatedSize();
    
    // Memory-based recommendations
    if (memoryStats && memoryStats.percentage > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Memory usage is at ${memoryStats.percentage}%. Consider implementing component cleanup and memory optimization.`,
        action: 'Implement React.memo, useCallback, and useMemo where appropriate'
      });
    }
    
    // Size-based recommendations
    if (size.js > 1024 * 1024) { // 1MB
      recommendations.push({
        type: 'size',
        severity: 'medium',
        title: 'Large Bundle Size',
        description: `JavaScript bundle is ${(size.js / 1024 / 1024).toFixed(2)}MB. Consider code splitting.`,
        action: 'Implement dynamic imports and lazy loading for non-critical components'
      });
    }
    
    // Performance-based recommendations
    if (performance.timing.loadEventEnd - performance.timing.navigationStart > 3000) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        title: 'Slow Initial Load',
        description: 'Initial load time is over 3 seconds. Consider optimizing critical resources.',
        action: 'Preload critical resources and implement resource hints'
      });
    }
    
    return recommendations;
  },

  /**
   * Generate bundle optimization report
   */
  generateReport: async () => {
    const size = await BundleAnalyzer.getEstimatedSize();
    const memory = BundleAnalyzer.getMemoryStats();
    const recommendations = await this.getRecommendations();
    
    return {
      timestamp: new Date().toISOString(),
      bundleSize: {
        js: `${(size.js / 1024).toFixed(2)} KB`,
        css: `${(size.css / 1024).toFixed(2)} KB`,
        images: `${(size.images / 1024).toFixed(2)} KB`,
        total: `${(size.total / 1024 / 1024).toFixed(2)} MB`
      },
      memory: memory ? {
        used: `${memory.used} MB`,
        total: `${memory.total} MB`,
        percentage: `${memory.percentage}%`
      } : null,
      performance: {
        loadTime: `${performance.timing.loadEventEnd - performance.timing.navigationStart} ms`,
        domInteractive: `${performance.timing.domInteractive - performance.timing.navigationStart} ms`
      },
      recommendations
    };
  }
};

export default {
  LazyComponents,
  LazyHooks,
  BundleAnalyzer,
  PerformanceOptimizer,
  BundleOptimization
};