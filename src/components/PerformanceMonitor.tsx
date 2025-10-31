import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
}

interface PerformanceEntry extends globalThis.PerformanceEntry {
  renderTime?: number;
  loadTime?: number;
  size?: number;
  hadRecentInput?: boolean;
  value?: number;
  processingStart?: number;
  startTime: number;
}

/**
 * Performance Monitor component that tracks Web Vitals and other performance metrics.
 * Only active in development mode to avoid performance impact in production.
 */
export function PerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetrics>({});
  const observersRef = useRef<PerformanceObserver[]>([]);

  useEffect(() => {
    // Only run in development mode
    if (import.meta.env.PROD) {
      console.log('🚀 [Performance Monitor] Disabled in production mode');
      return;
    }

    console.log('🚀 [Performance Monitor] Starting performance tracking...');

    // Function to safely send metrics to console
    const reportMetric = (name: string, value: number, unit = 'ms') => {
      const rounded = Math.round(value * 100) / 100;
      console.log(`📊 [Performance] ${name}: ${rounded}${unit}`);

      // Store in ref for potential future use
      const key = name.toLowerCase().replace(/\s+/g, '') as keyof PerformanceMetrics;
      metricsRef.current[key] = rounded;
    };

    // Track Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEntry[];
          const lastEntry = entries[entries.length - 1];
          if (lastEntry?.renderTime || lastEntry?.loadTime) {
            const lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
            reportMetric('Largest Contentful Paint (LCP)', lcp);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observersRef.current.push(lcpObserver);
      } catch (e) {
        console.debug('[Performance Monitor] LCP observer not supported');
      }

      // Track Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEntry[];
          for (const entry of entries) {
            if (!entry.hadRecentInput && entry.value) {
              clsValue += entry.value;
            }
          }
          reportMetric('Cumulative Layout Shift (CLS)', clsValue, '');
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observersRef.current.push(clsObserver);
      } catch (e) {
        console.debug('[Performance Monitor] CLS observer not supported');
      }

      // Track First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEntry[];
          for (const entry of entries) {
            const fid = entry.processingStart ? entry.processingStart - entry.startTime : 0;
            reportMetric('First Input Delay (FID)', fid);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observersRef.current.push(fidObserver);
      } catch (e) {
        console.debug('[Performance Monitor] FID observer not supported');
      }

      // Track Navigation Timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            const navigationEntry = entry as PerformanceNavigationTiming;

            // Time to First Byte
            const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
            reportMetric('Time to First Byte (TTFB)', ttfb);

            // DOM Content Loaded
            const dcl = navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart;
            reportMetric('DOM Content Loaded', dcl);

            // Load Complete
            const loadComplete = navigationEntry.loadEventEnd - navigationEntry.loadEventStart;
            reportMetric('Load Complete', loadComplete);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        observersRef.current.push(navigationObserver);
      } catch (e) {
        console.debug('[Performance Monitor] Navigation observer not supported');
      }

      // Track Resource Loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const largeResources = entries.filter(entry => {
            const resourceEntry = entry as PerformanceResourceTiming;
            return resourceEntry.transferSize > 1000000; // > 1MB resources
          });

          if (largeResources.length > 0) {
            console.log('📦 [Performance] Large resources detected:',
              largeResources.map(entry => ({
                name: entry.name.split('/').pop(),
                size: Math.round(((entry as PerformanceResourceTiming).transferSize || 0) / 1024) + 'KB',
                duration: Math.round(entry.duration) + 'ms'
              }))
            );
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        observersRef.current.push(resourceObserver);
      } catch (e) {
        console.debug('[Performance Monitor] Resource observer not supported');
      }
    }

    // Track Memory Usage (if available)
    const trackMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('🧠 [Performance] Memory Usage:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
    };

    // Track memory immediately and then every 30 seconds
    trackMemory();
    const memoryInterval = setInterval(trackMemory, 30000);

    // Track React Query Cache Performance
    const trackQueryCache = () => {
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
      const cacheSize = cacheKeys.reduce((total, key) => {
        try {
          return total + (localStorage.getItem(key)?.length || 0);
        } catch {
          return total;
        }
      }, 0);

      if (cacheSize > 0) {
        console.log('💾 [Performance] Cache Stats:', {
          keys: cacheKeys.length,
          size: Math.round(cacheSize / 1024) + 'KB'
        });
      }
    };

    // Initial cache tracking
    setTimeout(trackQueryCache, 5000);

    // Cleanup function
    return () => {
      console.log('🛑 [Performance Monitor] Cleaning up performance tracking...');

      // Disconnect all observers with aggressive cleanup
      observersRef.current.forEach(observer => {
        try {
          observer.disconnect();
          // @ts-ignore - some browsers may have this method
          if ('takeRecords' in observer) {
            (observer as any).takeRecords();
          }
        } catch (e) {
          console.debug('[Performance Monitor] Error disconnecting observer:', e);
        }
      });

      // Clear intervals
      clearInterval(memoryInterval);

      // Log final metrics summary
      const finalMetrics = metricsRef.current;
      if (Object.keys(finalMetrics).length > 0) {
        console.log('📈 [Performance Monitor] Final Metrics Summary:', finalMetrics);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to manually track custom performance metrics
 */
export function usePerformanceMetric(name: string) {
  const startTime = useRef<number>(0);

  const start = () => {
    startTime.current = performance.now();
  };

  const end = (additionalData?: Record<string, any>) => {
    if (import.meta.env.DEV && startTime.current > 0) {
      const duration = performance.now() - startTime.current;
      console.log(`⏱️ [Performance] ${name}: ${Math.round(duration * 100) / 100}ms`, additionalData || '');
      startTime.current = 0;
      return duration;
    }
    return 0;
  };

  return { start, end };
}

/**
 * Higher-order component to measure component render performance
 */
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  if (!import.meta.env.DEV) {
    return Component;
  }

  const WrappedComponent = (props: T) => {
    const { start, end } = usePerformanceMetric(`${componentName || Component.name} Render`);

    useEffect(() => {
      start();
      return () => {
        end();
      };
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.name})`;
  return WrappedComponent;
}