/**
 * Relay Health Monitoring System
 *
 * Monitors relay performance, availability, and quality metrics:
 * - Connection latency and stability
 * - Response time and success rates
 * - Event delivery reliability
 * - Error tracking and recovery
 */

import { useState, useEffect, useRef } from 'react';
import { devLogger } from './devLogger';

const relayLogger = devLogger.scope('relay-health');

export interface RelayHealthMetrics {
  url: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastChecked: number;

  // Connection metrics
  connectionTime: number; // ms to establish connection
  latency: number; // average response time
  uptime: number; // percentage (0-100)

  // Performance metrics
  successRate: number; // percentage (0-100)
  errorRate: number; // percentage (0-100)
  timeoutRate: number; // percentage (0-100)

  // Quality metrics
  eventDeliveryTime: number; // average time to deliver events
  duplicateRate: number; // percentage of duplicate events
  completenessScore: number; // how complete event responses are

  // Geographic and network info
  location?: {
    country: string;
    region: string;
    coordinates: [number, number]; // [lat, lng]
  };
  networkInfo?: {
    rtt: number; // round trip time
    bandwidth: number; // estimated bandwidth
    connectionType: string; // '4g', 'wifi', 'ethernet', etc.
  };

  // Historical data
  history: HealthSnapshot[];
  trends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    uptimeTrend: 'improving' | 'stable' | 'degrading';
    overallTrend: 'improving' | 'stable' | 'degrading';
  };

  // Error tracking
  errors: RelayError[];
  lastError?: RelayError;
  errorStreakCount: number;

  // Load balancing data
  currentLoad: number; // 0-100 estimated load
  capacity: number; // estimated max concurrent connections
  priority: number; // calculated priority score (0-100)
}

export interface HealthSnapshot {
  timestamp: number;
  latency: number;
  success: boolean;
  errorType?: string;
}

export interface RelayError {
  timestamp: number;
  type: 'connection' | 'timeout' | 'protocol' | 'authentication' | 'rate_limit';
  message: string;
  details?: any;
}

export interface HealthCheckOptions {
  timeout: number;
  maxRetries: number;
  checkInterval: number;
  historySizeLimit: number;
}

const DEFAULT_HEALTH_OPTIONS: HealthCheckOptions = {
  timeout: 3000, // 3 seconds - shorter timeout to fail faster
  maxRetries: 1, // Reduce retries to avoid spam
  checkInterval: 60000, // 60 seconds - less aggressive checking
  historySizeLimit: 50, // Keep last 50 snapshots
};

class RelayHealthMonitor {
  private metrics = new Map<string, RelayHealthMetrics>();
  private monitoringIntervals = new Map<string, number>();
  private options: HealthCheckOptions;
  private listeners: Array<(metrics: RelayHealthMetrics) => void> = [];
  private isMonitoring = false;

  constructor(options?: Partial<HealthCheckOptions>) {
    this.options = { ...DEFAULT_HEALTH_OPTIONS, ...options };
  }

  /**
   * Start monitoring a relay
   */
  async startMonitoring(relayUrl: string): Promise<void> {
    if (this.monitoringIntervals.has(relayUrl)) {
      relayLogger.debug(`Already monitoring ${relayUrl}`);
      return;
    }

    // Only log in development to avoid production spam
    if (import.meta.env.DEV) {
      relayLogger.info(`Starting health monitoring for ${relayUrl}`);
    }

    // Initialize metrics if not exists
    if (!this.metrics.has(relayUrl)) {
      this.metrics.set(relayUrl, this.createInitialMetrics(relayUrl));
    }

    // Perform initial health check (with delay to avoid connection spam)
    setTimeout(() => {
      this.performHealthCheck(relayUrl).catch(error => {
        if (import.meta.env.DEV) {
          relayLogger.debug(`Initial health check failed for ${relayUrl}`, error);
        }
      });
    }, Math.random() * 5000); // Random delay 0-5 seconds

    // Set up recurring health checks
    const interval = setInterval(() => {
      this.performHealthCheck(relayUrl).catch(error => {
        if (import.meta.env.DEV) {
          relayLogger.debug(`Health check failed for ${relayUrl}`, error);
        }
      });
    }, this.options.checkInterval);

    this.monitoringIntervals.set(relayUrl, interval);
    this.isMonitoring = true;
  }

  /**
   * Stop monitoring a relay
   */
  stopMonitoring(relayUrl: string): void {
    const interval = this.monitoringIntervals.get(relayUrl);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(relayUrl);
      relayLogger.info(`Stopped monitoring ${relayUrl}`);
    }

    // Check if we should stop overall monitoring
    if (this.monitoringIntervals.size === 0) {
      this.isMonitoring = false;
    }
  }

  /**
   * Stop monitoring all relays
   */
  stopAllMonitoring(): void {
    for (const [relayUrl] of this.monitoringIntervals) {
      this.stopMonitoring(relayUrl);
    }
    this.isMonitoring = false;
    relayLogger.info('Stopped all relay monitoring');
  }

  /**
   * Perform health check on a specific relay
   */
  async performHealthCheck(relayUrl: string): Promise<RelayHealthMetrics> {
    const startTime = performance.now();
    const metrics = this.metrics.get(relayUrl);

    if (!metrics) {
      throw new Error(`No metrics found for relay: ${relayUrl}`);
    }

    try {
      relayLogger.debug(`Performing health check on ${relayUrl}`);

      // Test WebSocket connection
      const connectionResult = await this.testConnection(relayUrl);
      const connectionTime = performance.now() - startTime;

      // Test basic Nostr functionality
      const functionalityResult = await this.testNostrFunctionality(relayUrl);

      // Test event query performance
      const queryResult = await this.testQueryPerformance(relayUrl);

      // Update metrics based on test results
      this.updateMetrics(metrics, {
        connectionTime,
        connectionSuccess: connectionResult.success,
        functionalitySuccess: functionalityResult.success,
        queryLatency: queryResult.latency,
        eventCount: queryResult.eventCount,
        errors: [
          ...(connectionResult.error ? [connectionResult.error] : []),
          ...(functionalityResult.error ? [functionalityResult.error] : []),
          ...(queryResult.error ? [queryResult.error] : []),
        ]
      });

      // Calculate overall health status
      this.calculateHealthStatus(metrics);

      // Update trends
      this.updateTrends(metrics);

      // Notify listeners
      this.notifyListeners(metrics);

      relayLogger.debug(`Health check completed for ${relayUrl}`, {
        status: metrics.status,
        latency: metrics.latency,
        successRate: metrics.successRate
      });

      return metrics;

    } catch (error) {
      // Only log errors in development to avoid production console spam
      if (import.meta.env.DEV) {
        relayLogger.debug(`Health check failed for ${relayUrl}`, error);
      }

      this.recordError(metrics, {
        type: 'connection',
        message: error instanceof Error ? error.message : 'Connection failed',
        details: error
      });

      metrics.status = 'offline';
      metrics.lastChecked = Date.now();
      this.notifyListeners(metrics);

      return metrics;
    }
  }

  /**
   * Test WebSocket connection to relay
   */
  private async testConnection(relayUrl: string): Promise<{ success: boolean; error?: RelayError }> {
    return new Promise((resolve) => {
      let isResolved = false;
      const ws = new WebSocket(relayUrl);

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          try { ws.close(); } catch {}
          resolve({
            success: false,
            error: {
              timestamp: Date.now(),
              type: 'timeout',
              message: 'Connection timeout'
            }
          });
        }
      }, this.options.timeout);

      ws.onopen = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          resolve({ success: true });
        }
      };

      ws.onerror = (event) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          // Don't log routine connection failures to avoid console spam
          resolve({
            success: false,
            error: {
              timestamp: Date.now(),
              type: 'connection',
              message: 'Connection failed'
            }
          });
        }
      };

      ws.onclose = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            error: {
              timestamp: Date.now(),
              type: 'connection',
              message: 'Connection closed prematurely'
            }
          });
        }
      };
    });
  }

  /**
   * Test basic Nostr functionality
   */
  private async testNostrFunctionality(relayUrl: string): Promise<{ success: boolean; error?: RelayError }> {
    return new Promise((resolve) => {
      const ws = new WebSocket(relayUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          success: false,
          error: {
            timestamp: Date.now(),
            type: 'timeout',
            message: 'Functionality test timeout'
          }
        });
      }, this.options.timeout);

      let messageReceived = false;

      ws.onopen = () => {
        // Send a basic REQ message
        const reqMessage = JSON.stringify([
          "REQ",
          "health-check",
          { kinds: [1], limit: 1 }
        ]);
        ws.send(reqMessage);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (Array.isArray(message) && (message[0] === 'EVENT' || message[0] === 'EOSE')) {
            messageReceived = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ success: true });
          }
        } catch (error) {
          // Invalid message format
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: false,
            error: {
              timestamp: Date.now(),
              type: 'protocol',
              message: 'Invalid message format',
              details: error
            }
          });
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: {
            timestamp: Date.now(),
            type: 'connection',
            message: 'WebSocket error during functionality test',
            details: event
          }
        });
      };
    });
  }

  /**
   * Test query performance
   */
  private async testQueryPerformance(relayUrl: string): Promise<{
    success: boolean;
    latency: number;
    eventCount: number;
    error?: RelayError
  }> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const ws = new WebSocket(relayUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          success: false,
          latency: performance.now() - startTime,
          eventCount: 0,
          error: {
            timestamp: Date.now(),
            type: 'timeout',
            message: 'Query performance test timeout'
          }
        });
      }, this.options.timeout);

      let eventCount = 0;
      let firstEventTime = 0;

      ws.onopen = () => {
        // Send a test query
        const reqMessage = JSON.stringify([
          "REQ",
          "perf-test",
          { kinds: [1], limit: 10 }
        ]);
        ws.send(reqMessage);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (Array.isArray(message)) {
            if (message[0] === 'EVENT') {
              eventCount++;
              if (firstEventTime === 0) {
                firstEventTime = performance.now();
              }
            } else if (message[0] === 'EOSE') {
              // End of events - complete the test
              clearTimeout(timeout);
              ws.close();
              resolve({
                success: true,
                latency: firstEventTime > 0 ? firstEventTime - startTime : performance.now() - startTime,
                eventCount
              });
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: false,
            latency: performance.now() - startTime,
            eventCount,
            error: {
              timestamp: Date.now(),
              type: 'protocol',
              message: 'Invalid message during performance test',
              details: error
            }
          });
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          latency: performance.now() - startTime,
          eventCount,
          error: {
            timestamp: Date.now(),
            type: 'connection',
            message: 'WebSocket error during performance test',
            details: event
          }
        });
      };
    });
  }

  /**
   * Update metrics based on test results
   */
  private updateMetrics(metrics: RelayHealthMetrics, results: {
    connectionTime: number;
    connectionSuccess: boolean;
    functionalitySuccess: boolean;
    queryLatency: number;
    eventCount: number;
    errors: RelayError[];
  }): void {
    const now = Date.now();
    metrics.lastChecked = now;

    // Update connection and latency metrics
    metrics.connectionTime = this.calculateMovingAverage(
      metrics.connectionTime,
      results.connectionTime,
      0.3 // 30% weight for new sample
    );

    metrics.latency = this.calculateMovingAverage(
      metrics.latency,
      results.queryLatency,
      0.3
    );

    // Add to history
    const snapshot: HealthSnapshot = {
      timestamp: now,
      latency: results.queryLatency,
      success: results.connectionSuccess && results.functionalitySuccess,
      errorType: results.errors.length > 0 ? results.errors[0].type : undefined
    };

    metrics.history.push(snapshot);

    // Limit history size
    if (metrics.history.length > this.options.historySizeLimit) {
      metrics.history = metrics.history.slice(-this.options.historySizeLimit);
    }

    // Calculate success and error rates from recent history
    const recentHistory = metrics.history.slice(-20); // Last 20 checks
    const successCount = recentHistory.filter(h => h.success).length;
    metrics.successRate = (successCount / recentHistory.length) * 100;
    metrics.errorRate = 100 - metrics.successRate;

    // Update error tracking
    if (results.errors.length > 0) {
      metrics.errors.push(...results.errors);
      metrics.lastError = results.errors[results.errors.length - 1];
      metrics.errorStreakCount++;

      // Limit error history
      if (metrics.errors.length > 50) {
        metrics.errors = metrics.errors.slice(-50);
      }
    } else {
      metrics.errorStreakCount = 0;
    }

    // Calculate uptime from history
    metrics.uptime = metrics.successRate;

    // Update event delivery metrics
    if (results.eventCount > 0) {
      metrics.eventDeliveryTime = this.calculateMovingAverage(
        metrics.eventDeliveryTime,
        results.queryLatency / results.eventCount,
        0.3
      );
    }
  }

  /**
   * Calculate health status based on metrics
   */
  private calculateHealthStatus(metrics: RelayHealthMetrics): void {
    const { successRate, errorStreakCount, latency } = metrics;

    if (successRate >= 95 && errorStreakCount === 0 && latency < 1000) {
      metrics.status = 'healthy';
    } else if (successRate >= 80 && errorStreakCount < 3 && latency < 3000) {
      metrics.status = 'degraded';
    } else if (successRate >= 50 && errorStreakCount < 5) {
      metrics.status = 'unhealthy';
    } else {
      metrics.status = 'offline';
    }

    // Calculate priority score for load balancing
    let priority = 0;

    // Success rate contribution (40%)
    priority += (successRate / 100) * 40;

    // Latency contribution (30%) - lower latency is better
    const latencyScore = Math.max(0, (3000 - latency) / 3000);
    priority += latencyScore * 30;

    // Uptime contribution (20%)
    priority += (metrics.uptime / 100) * 20;

    // Error streak penalty (10%)
    const errorPenalty = Math.max(0, 10 - (errorStreakCount * 2));
    priority += errorPenalty;

    metrics.priority = Math.round(Math.max(0, Math.min(100, priority)));
  }

  /**
   * Update trend analysis
   */
  private updateTrends(metrics: RelayHealthMetrics): void {
    if (metrics.history.length < 10) return; // Need sufficient data

    const recent = metrics.history.slice(-10);
    const older = metrics.history.slice(-20, -10);

    if (older.length === 0) return;

    // Latency trend
    const recentAvgLatency = recent.reduce((sum, h) => sum + h.latency, 0) / recent.length;
    const olderAvgLatency = older.reduce((sum, h) => sum + h.latency, 0) / older.length;

    if (recentAvgLatency < olderAvgLatency * 0.9) {
      metrics.trends.latencyTrend = 'improving';
    } else if (recentAvgLatency > olderAvgLatency * 1.1) {
      metrics.trends.latencyTrend = 'degrading';
    } else {
      metrics.trends.latencyTrend = 'stable';
    }

    // Uptime trend
    const recentSuccessRate = (recent.filter(h => h.success).length / recent.length) * 100;
    const olderSuccessRate = (older.filter(h => h.success).length / older.length) * 100;

    if (recentSuccessRate > olderSuccessRate + 5) {
      metrics.trends.uptimeTrend = 'improving';
    } else if (recentSuccessRate < olderSuccessRate - 5) {
      metrics.trends.uptimeTrend = 'degrading';
    } else {
      metrics.trends.uptimeTrend = 'stable';
    }

    // Overall trend
    const improvingCount = Object.values(metrics.trends).filter(t => t === 'improving').length;
    const degradingCount = Object.values(metrics.trends).filter(t => t === 'degrading').length;

    if (improvingCount > degradingCount) {
      metrics.trends.overallTrend = 'improving';
    } else if (degradingCount > improvingCount) {
      metrics.trends.overallTrend = 'degrading';
    } else {
      metrics.trends.overallTrend = 'stable';
    }
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(currentAvg: number, newValue: number, weight: number): number {
    if (currentAvg === 0) return newValue;
    return currentAvg * (1 - weight) + newValue * weight;
  }

  /**
   * Record an error for a relay
   */
  private recordError(metrics: RelayHealthMetrics, error: RelayError): void {
    metrics.errors.push(error);
    metrics.lastError = error;
    metrics.errorStreakCount++;

    // Limit error history
    if (metrics.errors.length > 50) {
      metrics.errors = metrics.errors.slice(-50);
    }
  }

  /**
   * Create initial metrics for a new relay
   */
  private createInitialMetrics(relayUrl: string): RelayHealthMetrics {
    return {
      url: relayUrl,
      status: 'healthy',
      lastChecked: 0,
      connectionTime: 0,
      latency: 0,
      uptime: 100,
      successRate: 100,
      errorRate: 0,
      timeoutRate: 0,
      eventDeliveryTime: 0,
      duplicateRate: 0,
      completenessScore: 100,
      history: [],
      trends: {
        latencyTrend: 'stable',
        uptimeTrend: 'stable',
        overallTrend: 'stable'
      },
      errors: [],
      errorStreakCount: 0,
      currentLoad: 0,
      capacity: 100,
      priority: 100
    };
  }

  /**
   * Get metrics for a specific relay
   */
  getMetrics(relayUrl: string): RelayHealthMetrics | undefined {
    return this.metrics.get(relayUrl);
  }

  /**
   * Get metrics for all monitored relays
   */
  getAllMetrics(): RelayHealthMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get healthy relays sorted by priority
   */
  getHealthyRelays(): RelayHealthMetrics[] {
    return this.getAllMetrics()
      .filter(m => m.status === 'healthy' || m.status === 'degraded')
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Subscribe to health metric changes
   */
  onMetricsChange(listener: (metrics: RelayHealthMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of metric changes
   */
  private notifyListeners(metrics: RelayHealthMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        relayLogger.error('Error in health metrics listener', error);
      }
    });
  }

  /**
   * Get monitoring status
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get list of monitored relay URLs
   */
  getMonitoredRelays(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  /**
   * Clear all metrics and stop monitoring
   */
  reset(): void {
    this.stopAllMonitoring();
    this.metrics.clear();
    this.listeners = [];
    relayLogger.info('Relay health monitor reset');
  }
}

// Create singleton instance
export const relayHealthMonitor = new RelayHealthMonitor();

/**
 * React hook for relay health monitoring
 */
export function useRelayHealth(relayUrls?: string[]) {
  const [metrics, setMetrics] = useState<RelayHealthMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const initializedUrls = useRef<string>('');

  // Initialize metrics without starting monitoring
  useEffect(() => {
    if (!relayUrls || relayUrls.length === 0) return;

    // Create stable relay URLs array to prevent unnecessary re-initialization
    const sortedUrls = [...relayUrls].sort().join(',');

    // Only initialize if URLs have actually changed
    if (initializedUrls.current === sortedUrls) return;
    initializedUrls.current = sortedUrls;

    // Initialize empty metrics for all relays
    const initialMetrics = relayUrls.map(url => {
      // Check if we already have metrics for this relay
      const existingMetrics = relayHealthMonitor.getMetrics(url);
      if (existingMetrics) {
        return existingMetrics;
      }

      // Create new initial metrics
      return {
        url,
        status: 'offline' as const,
        lastChecked: 0,
        connectionTime: 0,
        latency: 0,
        uptime: 0,
        successRate: 0,
        errorRate: 0,
        timeoutRate: 0,
        eventDeliveryTime: 0,
        duplicateRate: 0,
        completenessScore: 0,
        history: [],
        trends: {
          latencyTrend: 'stable' as const,
          uptimeTrend: 'stable' as const,
          overallTrend: 'stable' as const
        },
        errors: [],
        errorStreakCount: 0,
        currentLoad: 0,
        capacity: 100,
        priority: 50
      };
    });

    setMetrics(initialMetrics);
    console.log('📊 [Health Monitor] Initialized metrics for', initialMetrics.length, 'relays');
  }, [relayUrls]);

  // Manual start monitoring function
  const startMonitoring = async () => {
    if (!relayUrls || relayUrls.length === 0 || isMonitoring) return;

    console.log('🔍 [Health Monitor] Starting monitoring for', relayUrls.length, 'relays');
    setIsMonitoring(true);

    // Subscribe to changes first
    const unsubscribe = relayHealthMonitor.onMetricsChange(() => {
      const updatedMetrics = relayHealthMonitor.getAllMetrics();
      console.log('📊 [Health Monitor] Metrics updated:', updatedMetrics.length, 'relays');
      setMetrics([...updatedMetrics]);
    });

    // Start monitoring with staggered delays to avoid overwhelming
    for (let i = 0; i < relayUrls.length; i++) {
      const url = relayUrls[i];
      setTimeout(async () => {
        try {
          console.log(`🔍 [Health Monitor] Starting monitoring for ${url}`);
          await relayHealthMonitor.startMonitoring(url);
          console.log(`✅ [Health Monitor] Monitoring started for ${url}`);
        } catch (error) {
          console.warn(`❌ [Health Monitor] Failed to start monitoring ${url}:`, error);
        }
      }, i * 2000); // 2 second delay between each relay
    }

    return unsubscribe;
  };

  return {
    metrics,
    healthyRelays: metrics.filter(m => m.status === 'healthy' || m.status === 'degraded'),
    unhealthyRelays: metrics.filter(m => m.status === 'unhealthy' || m.status === 'offline'),
    monitor: relayHealthMonitor,
    startMonitoring,
    isMonitoring
  };
}