/**
 * Performance Monitoring Component
 * Monitors component performance, renders, and provides optimization insights
 * Includes React Profiler integration and performance metrics
 */

import { Profiler, ProfilerOnRenderCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Download,
  Eye,
  Timer,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenderInfo {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  timestamp: number;
}

interface PerformanceMetrics {
  totalRenders: number;
  totalDuration: number;
  averageDuration: number;
  worstRender: RenderInfo | null;
  recentRenders: RenderInfo[];
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface PerformanceMonitorProps {
  children: React.ReactNode;
  enabled?: boolean;
  maxHistory?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showInProduction?: boolean;
  trackMemory?: boolean;
  slowRenderThreshold?: number;
}

export function PerformanceMonitor({
  children,
  enabled = process.env.NODE_ENV === 'development',
  maxHistory = 50,
  onMetricsUpdate,
  showInProduction = false,
  trackMemory = true,
  slowRenderThreshold = 16 // 60fps = 16.67ms per frame
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalRenders: 0,
    totalDuration: 0,
    averageDuration: 0,
    worstRender: null,
    recentRenders: []
  });
  const intervalRef = useRef<NodeJS.Timeout>();

  // Memory monitoring
  const updateMemoryUsage = useCallback(() => {
    if (!trackMemory || typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    if (memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
        }
      }));
    }
  }, [trackMemory]);

  // Start memory monitoring
  useEffect(() => {
    if (enabled && trackMemory) {
      updateMemoryUsage();
      intervalRef.current = setInterval(updateMemoryUsage, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, trackMemory, updateMemoryUsage]);

  // Profiler callback
  const handleRender: ProfilerOnRenderCallback = useCallback((
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    if (!enabled) return;

    const renderInfo: RenderInfo = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp: Date.now()
    };

    setMetrics(prev => {
      const newRecentRenders = [renderInfo, ...prev.recentRenders].slice(0, maxHistory);
      const newTotalDuration = prev.totalDuration + actualDuration;
      const newTotalRenders = prev.totalRenders + 1;
      const newAverageDuration = newTotalDuration / newTotalRenders;
      
      const newWorstRender = !prev.worstRender || actualDuration > prev.worstRender.actualDuration 
        ? renderInfo 
        : prev.worstRender;

      const newMetrics: PerformanceMetrics = {
        totalRenders: newTotalRenders,
        totalDuration: newTotalDuration,
        averageDuration: newAverageDuration,
        worstRender: newWorstRender,
        recentRenders: newRecentRenders,
        memoryUsage: prev.memoryUsage
      };

      onMetricsUpdate?.(newMetrics);
      return newMetrics;
    });
  }, [enabled, maxHistory, onMetricsUpdate]);

  // Export performance data
  const exportData = () => {
    const data = {
      metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset metrics
  const resetMetrics = () => {
    setMetrics({
      totalRenders: 0,
      totalDuration: 0,
      averageDuration: 0,
      worstRender: null,
      recentRenders: [],
      memoryUsage: metrics.memoryUsage
    });
  };

  if (!enabled && !showInProduction) {
    return <>{children}</>;
  }

  const isSlowRender = metrics.averageDuration > slowRenderThreshold;
  const memoryWarning = metrics.memoryUsage?.percentage && metrics.memoryUsage.percentage > 80;

  return (
    <>
      <Profiler id="PerformanceMonitor" onRender={handleRender}>
        {children}
      </Profiler>

      {/* Performance Monitor Panel */}
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <Card className="border-lime-500/20 bg-black/90 backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lime-400 text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Monitor
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Performance Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-lime-500" />
                    <span className="text-sm text-lime-300">Total Renders</span>
                  </div>
                  <div className="text-2xl font-bold text-lime-400">
                    {metrics.totalRenders}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-lime-500" />
                    <span className="text-sm text-lime-300">Avg Duration</span>
                  </div>
                  <div className="text-2xl font-bold text-lime-400">
                    {metrics.averageDuration.toFixed(2)}ms
                  </div>
                </div>
              </div>

              {/* Performance Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-lime-300">Performance Status</span>
                  <Badge variant={isSlowRender ? "destructive" : "default"}>
                    {isSlowRender ? (
                      <>
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Slow
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Good
                      </>
                    )}
                  </Badge>
                </div>
                
                {isSlowRender && (
                  <Alert className="border-yellow-500/20 bg-yellow-500/10">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-300">
                      Average render time ({metrics.averageDuration.toFixed(2)}ms) exceeds the 60fps threshold ({slowRenderThreshold}ms)
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Memory Usage */}
              {metrics.memoryUsage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-lime-300">Memory Usage</span>
                    <Badge variant={memoryWarning ? "destructive" : "default"}>
                      {metrics.memoryUsage.percentage}%
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-lime-500/20 rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        memoryWarning ? "bg-red-500" : "bg-lime-500"
                      )}
                      style={{ width: `${metrics.memoryUsage.percentage}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-lime-500/60">
                    {metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB
                  </div>
                  
                  {memoryWarning && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <Activity className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-300">
                        Memory usage is high ({metrics.memoryUsage.percentage}%). Consider optimizing component renders.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Worst Render */}
              {metrics.worstRender && (
                <div className="space-y-2">
                  <span className="text-sm text-lime-300">Worst Render</span>
                  <div className="text-sm text-lime-400">
                    {metrics.worstRender.actualDuration.toFixed(2)}ms 
                    <span className="text-lime-500/60 ml-2">
                      ({metrics.worstRender.phase})
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetMetrics}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg border-lime-500/30 bg-black/80 backdrop-blur-sm hover:bg-lime-500/10"
      >
        <Activity className="h-5 w-5 text-lime-500" />
      </Button>
    </>
  );
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const handleMetricsUpdate = useCallback((newMetrics: PerformanceMetrics) => {
    setMetrics(newMetrics);
  }, []);

  return { metrics, handleMetricsUpdate };
}

/**
 * Component performance wrapper
 */
interface PerformanceWrapperProps {
  children: React.ReactNode;
  componentName: string;
  logRenders?: boolean;
  logSlowRenders?: boolean;
  slowRenderThreshold?: number;
}

export function PerformanceWrapper({
  children,
  componentName,
  logRenders = false,
  logSlowRenders = true,
  slowRenderThreshold = 16
}: PerformanceWrapperProps) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  const handleRender: ProfilerOnRenderCallback = useCallback((
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    renderCount.current += 1;
    lastRenderTime.current = actualDuration;

    if (logRenders) {
      console.log(`[${componentName}] Render #${renderCount.current}: ${actualDuration.toFixed(2)}ms (${phase})`);
    }

    if (logSlowRenders && actualDuration > slowRenderThreshold) {
      console.warn(`[${componentName}] Slow render detected: ${actualDuration.toFixed(2)}ms (threshold: ${slowRenderThreshold}ms)`, {
        phase,
        baseDuration,
        renderCount: renderCount.current
      });
    }
  }, [componentName, logRenders, logSlowRenders, slowRenderThreshold]);

  return (
    <Profiler id={componentName} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

/**
 * Performance utilities
 */
export const PerformanceUtils = {
  /**
   * Debounce function for performance optimization
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function for performance optimization
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
   * Memoize expensive computations
   */
  memoize: <T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T => {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  /**
   * Measure function execution time
   */
  measure: <T extends (...args: any[]) => any>(
    name: string,
    func: T
  ): T => {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const start = performance.now();
      const result = func(...args);
      const end = performance.now();
      
      console.log(`[${name}] Execution time: ${(end - start).toFixed(2)}ms`);
      return result;
    }) as T;
  }
};

export default PerformanceMonitor;