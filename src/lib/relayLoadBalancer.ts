/**
 * Relay Load Balancing System
 * 
 * Distributes requests across relay pools for optimal performance:
 * - Intelligent request routing
 * - Load distribution algorithms
 * - Connection pooling and management
 * - Automatic failover and recovery
 */

import { useState, useEffect } from 'react';
import { devLogger } from './devLogger';
import { relayHealthMonitor, type RelayHealthMetrics } from './relayHealth';
import { geoRelaySelector, type RelayLocationInfo } from './relayGeography';

const loadBalancerLogger = devLogger.scope('load-balancer');

export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'geographic' | 'hybrid';
  maxConnectionsPerRelay: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  failoverThreshold: number; // Health score below which relay is considered failed
}

export interface RelayConnection {
  url: string;
  websocket: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  activeRequests: number;
  totalRequests: number;
  lastUsed: number;
  connectionTime: number;
  errors: number;
  priority: number;
}

export interface LoadBalancingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  relayUtilization: Record<string, number>;
  failoverCount: number;
  currentAlgorithm: string;
}

export interface RequestContext {
  type: 'query' | 'publish' | 'subscription';
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryable: boolean;
  geographicPreference?: string;
}

const DEFAULT_CONFIG: LoadBalancerConfig = {
  algorithm: 'hybrid',
  maxConnectionsPerRelay: 10,
  connectionTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  healthCheckInterval: 30000, // 30 seconds
  failoverThreshold: 30, // Health score below 30 triggers failover
};

class RelayLoadBalancer {
  private config: LoadBalancerConfig;
  private connections = new Map<string, RelayConnection>();
  private relayPools = new Map<string, string[]>(); // Pool name -> relay URLs
  private currentIndex = 0; // For round-robin
  private stats: LoadBalancingStats;
  private listeners: Array<(stats: LoadBalancingStats) => void> = [];
  private healthCheckInterval: number | null = null;

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      relayUtilization: {},
      failoverCount: 0,
      currentAlgorithm: this.config.algorithm
    };

    this.startHealthChecking();
  }

  /**
   * Add a relay pool for load balancing
   */
  addRelayPool(poolName: string, relayUrls: string[]): void {
    this.relayPools.set(poolName, relayUrls);
    
    // Initialize connections for new relays
    for (const url of relayUrls) {
      if (!this.connections.has(url)) {
        this.connections.set(url, {
          url,
          websocket: null,
          status: 'disconnected',
          activeRequests: 0,
          totalRequests: 0,
          lastUsed: 0,
          connectionTime: 0,
          errors: 0,
          priority: 100
        });
      }
    }

    loadBalancerLogger.info(`Added relay pool: ${poolName}`, {
      relays: relayUrls.length,
      urls: relayUrls
    });
  }

  /**
   * Remove a relay pool
   */
  removeRelayPool(poolName: string): void {
    const relayUrls = this.relayPools.get(poolName);
    if (relayUrls) {
      // Close connections for relays not used by other pools
      const allOtherUrls = new Set<string>();
      for (const [name, urls] of this.relayPools) {
        if (name !== poolName) {
          urls.forEach(url => allOtherUrls.add(url));
        }
      }

      for (const url of relayUrls) {
        if (!allOtherUrls.has(url)) {
          this.closeConnection(url);
          this.connections.delete(url);
        }
      }

      this.relayPools.delete(poolName);
      loadBalancerLogger.info(`Removed relay pool: ${poolName}`);
    }
  }

  /**
   * Select the best relay for a request
   */
  async selectRelay(
    poolName: string,
    context: RequestContext = { type: 'query', priority: 'normal', retryable: true }
  ): Promise<string | null> {
    const relayUrls = this.relayPools.get(poolName);
    if (!relayUrls || relayUrls.length === 0) {
      loadBalancerLogger.warn(`No relays available in pool: ${poolName}`);
      return null;
    }

    // Filter to only healthy relays
    const healthyRelays = relayUrls.filter(url => {
      const connection = this.connections.get(url);
      if (!connection) return false;

      // Check health metrics if available
      const health = relayHealthMonitor.getMetrics(url);
      if (health && health.priority < this.config.failoverThreshold) {
        return false;
      }

      return connection.status === 'connected' || connection.status === 'disconnected';
    });

    if (healthyRelays.length === 0) {
      loadBalancerLogger.warn(`No healthy relays in pool: ${poolName}`);
      return relayUrls[0]; // Fallback to any relay
    }

    // Select relay based on algorithm
    const selectedRelay = await this.selectByAlgorithm(healthyRelays, context);
    
    if (selectedRelay) {
      this.stats.totalRequests++;
      const connection = this.connections.get(selectedRelay);
      if (connection) {
        connection.totalRequests++;
        connection.lastUsed = Date.now();
      }
    }

    return selectedRelay;
  }

  /**
   * Select relay using the configured algorithm
   */
  private async selectByAlgorithm(
    relayUrls: string[],
    context: RequestContext
  ): Promise<string | null> {
    switch (this.config.algorithm) {
      case 'round_robin':
        return this.selectRoundRobin(relayUrls);
      
      case 'weighted_round_robin':
        return this.selectWeightedRoundRobin(relayUrls);
      
      case 'least_connections':
        return this.selectLeastConnections(relayUrls);
      
      case 'geographic':
        return await this.selectGeographic(relayUrls, context);
      
      case 'hybrid':
        return await this.selectHybrid(relayUrls, context);
      
      default:
        return this.selectRoundRobin(relayUrls);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(relayUrls: string[]): string {
    const relay = relayUrls[this.currentIndex % relayUrls.length];
    this.currentIndex = (this.currentIndex + 1) % relayUrls.length;
    return relay;
  }

  /**
   * Weighted round-robin based on relay health/performance
   */
  private selectWeightedRoundRobin(relayUrls: string[]): string {
    const weights = relayUrls.map(url => {
      const health = relayHealthMonitor.getMetrics(url);
      return health ? health.priority : 50; // Default weight
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      return this.selectRoundRobin(relayUrls);
    }

    let random = Math.random() * totalWeight;
    for (let i = 0; i < relayUrls.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return relayUrls[i];
      }
    }

    return relayUrls[0]; // Fallback
  }

  /**
   * Select relay with least connections
   */
  private selectLeastConnections(relayUrls: string[]): string {
    let bestRelay = relayUrls[0];
    let minConnections = Infinity;

    for (const url of relayUrls) {
      const connection = this.connections.get(url);
      if (connection && connection.activeRequests < minConnections) {
        minConnections = connection.activeRequests;
        bestRelay = url;
      }
    }

    return bestRelay;
  }

  /**
   * Geographic selection based on user location
   */
  private async selectGeographic(
    relayUrls: string[],
    context: RequestContext
  ): Promise<string> {
    try {
      const optimalRelays = await geoRelaySelector.selectOptimalRelays(relayUrls, 1);
      if (optimalRelays.length > 0) {
        return optimalRelays[0].url;
      }
    } catch (error) {
      loadBalancerLogger.debug('Geographic selection failed, using fallback', error);
    }

    return this.selectRoundRobin(relayUrls);
  }

  /**
   * Hybrid selection combining multiple factors
   */
  private async selectHybrid(
    relayUrls: string[],
    context: RequestContext
  ): Promise<string> {
    const scores = await Promise.all(
      relayUrls.map(async url => {
        let score = 0;
        const connection = this.connections.get(url);
        const health = relayHealthMonitor.getMetrics(url);

        // Health score (40% weight)
        if (health) {
          score += (health.priority / 100) * 40;
        } else {
          score += 20; // Default for unknown health
        }

        // Connection load (30% weight)
        if (connection) {
          const loadFactor = connection.activeRequests / this.config.maxConnectionsPerRelay;
          score += (1 - loadFactor) * 30;
        }

        // Geographic score (20% weight)
        try {
          const geoInfo = geoRelaySelector.getRelayLocationInfo(url);
          if (geoInfo && geoInfo.distanceFromUser !== undefined) {
            const maxDistance = 20000; // 20,000 km max
            const distanceScore = Math.max(0, (maxDistance - geoInfo.distanceFromUser) / maxDistance);
            score += distanceScore * 20;
          } else {
            score += 10; // Default geographic score
          }
        } catch {
          score += 10;
        }

        // Recent usage penalty (10% weight) - avoid overusing same relay
        if (connection && connection.lastUsed > 0) {
          const timeSinceUsed = Date.now() - connection.lastUsed;
          const usagePenalty = Math.min(10, timeSinceUsed / 60000); // Max 10 points for 1+ minute
          score += usagePenalty;
        } else {
          score += 10;
        }

        return { url, score };
      })
    );

    // Sort by score (highest first) and return best
    scores.sort((a, b) => b.score - a.score);
    return scores[0].url;
  }

  /**
   * Execute a request with load balancing and failover
   */
  async executeRequest<T>(
    poolName: string,
    requestFn: (relayUrl: string) => Promise<T>,
    context?: RequestContext
  ): Promise<T> {
    const startTime = performance.now();
    const ctx = context || { type: 'query', priority: 'normal', retryable: true };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      const relayUrl = await this.selectRelay(poolName, ctx);
      if (!relayUrl) {
        throw new Error(`No relays available in pool: ${poolName}`);
      }

      const connection = this.connections.get(relayUrl);
      if (!connection) {
        continue;
      }

      try {
        // Track active request
        connection.activeRequests++;
        
        // Execute request
        const result = await requestFn(relayUrl);
        
        // Update stats on success
        const responseTime = performance.now() - startTime;
        this.updateSuccessStats(relayUrl, responseTime);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Update error stats
        connection.errors++;
        this.updateErrorStats(relayUrl);
        
        loadBalancerLogger.warn(`Request failed on ${relayUrl} (attempt ${attempt + 1})`, error);
        
        // Don't retry non-retryable requests
        if (!ctx.retryable) {
          break;
        }
        
        // Wait before retry
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }

      } finally {
        // Always decrement active requests
        connection.activeRequests = Math.max(0, connection.activeRequests - 1);
      }
    }

    // All attempts failed
    this.stats.failedRequests++;
    throw lastError || new Error('All relay attempts failed');
  }

  /**
   * Update success statistics
   */
  private updateSuccessStats(relayUrl: string, responseTime: number): void {
    this.stats.successfulRequests++;
    
    // Update average response time
    const totalResponses = this.stats.successfulRequests;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
    
    // Update relay utilization
    if (!this.stats.relayUtilization[relayUrl]) {
      this.stats.relayUtilization[relayUrl] = 0;
    }
    this.stats.relayUtilization[relayUrl]++;
    
    this.notifyListeners();
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(relayUrl: string): void {
    // Check if this relay should trigger failover
    const health = relayHealthMonitor.getMetrics(relayUrl);
    if (health && health.priority < this.config.failoverThreshold) {
      this.stats.failoverCount++;
      loadBalancerLogger.warn(`Relay ${relayUrl} triggered failover`, {
        healthScore: health.priority,
        threshold: this.config.failoverThreshold
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Close connection to a relay
   */
  private closeConnection(relayUrl: string): void {
    const connection = this.connections.get(relayUrl);
    if (connection && connection.websocket) {
      connection.websocket.close();
      connection.websocket = null;
      connection.status = 'disconnected';
      loadBalancerLogger.debug(`Closed connection to ${relayUrl}`);
    }
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    loadBalancerLogger.info('Started health checking', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(async url => {
      try {
        await relayHealthMonitor.performHealthCheck(url);
      } catch (error) {
        loadBalancerLogger.debug(`Health check failed for ${url}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Stop health checking
   */
  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      loadBalancerLogger.info('Stopped health checking');
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current load balancing statistics
   */
  getStats(): LoadBalancingStats {
    return { ...this.stats };
  }

  /**
   * Get connection information for all relays
   */
  getConnections(): RelayConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active relay pools
   */
  getRelayPools(): Record<string, string[]> {
    return Object.fromEntries(this.relayPools);
  }

  /**
   * Update load balancer configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    const oldInterval = this.config.healthCheckInterval;
    this.config = { ...this.config, ...config };
    
    // Restart health checking if interval changed
    if (this.config.healthCheckInterval !== oldInterval) {
      this.stopHealthChecking();
      this.startHealthChecking();
    }

    this.stats.currentAlgorithm = this.config.algorithm;
    this.notifyListeners();
    
    loadBalancerLogger.info('Updated load balancer configuration', this.config);
  }

  /**
   * Subscribe to statistics updates
   */
  onStatsChange(listener: (stats: LoadBalancingStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of stats changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getStats());
      } catch (error) {
        loadBalancerLogger.error('Error in stats listener', error);
      }
    });
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      relayUtilization: {},
      failoverCount: 0,
      currentAlgorithm: this.config.algorithm
    };
    
    // Reset connection stats
    for (const connection of this.connections.values()) {
      connection.totalRequests = 0;
      connection.errors = 0;
    }
    
    this.notifyListeners();
    loadBalancerLogger.info('Reset load balancer statistics');
  }

  /**
   * Shutdown load balancer
   */
  shutdown(): void {
    this.stopHealthChecking();
    
    // Close all connections
    for (const [url] of this.connections) {
      this.closeConnection(url);
    }
    
    this.connections.clear();
    this.relayPools.clear();
    this.listeners = [];
    
    loadBalancerLogger.info('Load balancer shutdown complete');
  }
}

// Create singleton instance
export const relayLoadBalancer = new RelayLoadBalancer();

/**
 * React hook for relay load balancing
 */
export function useRelayLoadBalancer(poolName?: string) {
  const [stats, setStats] = useState<LoadBalancingStats>(relayLoadBalancer.getStats());
  const [connections, setConnections] = useState<RelayConnection[]>([]);

  useEffect(() => {
    // Subscribe to stats changes
    const unsubscribe = relayLoadBalancer.onStatsChange(setStats);
    
    // Update connections periodically
    const updateConnections = () => {
      setConnections([...relayLoadBalancer.getConnections()]);
    };
    
    updateConnections();
    const interval = setInterval(updateConnections, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    stats,
    connections,
    pools: relayLoadBalancer.getRelayPools(),
    selectRelay: poolName ? 
      (context?: RequestContext) => relayLoadBalancer.selectRelay(poolName, context) :
      relayLoadBalancer.selectRelay.bind(relayLoadBalancer),
    executeRequest: poolName ?
      <T>(requestFn: (relayUrl: string) => Promise<T>, context?: RequestContext) => 
        relayLoadBalancer.executeRequest(poolName, requestFn, context) :
      relayLoadBalancer.executeRequest.bind(relayLoadBalancer),
    loadBalancer: relayLoadBalancer
  };
}