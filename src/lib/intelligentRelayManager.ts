/**
 * Intelligent Relay Manager
 *
 * Combines health monitoring, geographic selection, and load balancing
 * into a unified relay management system with automatic optimization.
 */

import { useState, useEffect } from 'react';
import { devLogger } from './devLogger';
import { relayHealthMonitor, type RelayHealthMetrics } from './relayHealth';
import { geoRelaySelector, type RelayLocationInfo, type GeographicLocation } from './relayGeography';
import { relayLoadBalancer, type LoadBalancingStats, type RequestContext } from './relayLoadBalancer';

const intelligentLogger = devLogger.scope('intelligent-relay');

export interface RelayStrategy {
  name: string;
  description: string;
  primary: string[]; // Primary relays for reads
  secondary: string[]; // Backup relays
  publish: string[]; // Publishing relays
  discovery: string[]; // Discovery relays (for finding new content)
}

export interface RelayOptimizationConfig {
  enableHealthMonitoring: boolean;
  enableGeographicOptimization: boolean;
  enableLoadBalancing: boolean;
  enableAutoFailover: boolean;
  enableAdaptiveStrategySelection: boolean;

  healthCheckInterval: number;
  strategyEvaluationInterval: number;
  performanceWindowSize: number; // Number of recent requests to consider

  maxPrimaryRelays: number;
  maxSecondaryRelays: number;
  maxPublishRelays: number;
  minRelaysPerPool: number;

  latencyThreshold: number; // ms - switch to better relays if improvement > threshold
  uptimeThreshold: number; // % - minimum uptime for primary relays
  diversityWeight: number; // 0-1 - how much to weight geographic diversity
}

export interface RelayPerformanceMetrics {
  strategy: string;
  totalRequests: number;
  averageLatency: number;
  successRate: number;
  lastOptimization: number;
  optimizationCount: number;

  relayMetrics: {
    [relayUrl: string]: {
      latency: number;
      uptime: number;
      requestCount: number;
      errorCount: number;
      lastUsed: number;
    };
  };
}

const DEFAULT_CONFIG: RelayOptimizationConfig = {
  enableHealthMonitoring: true,
  enableGeographicOptimization: true,
  enableLoadBalancing: true,
  enableAutoFailover: true,
  enableAdaptiveStrategySelection: true,

  healthCheckInterval: 30000, // 30 seconds
  strategyEvaluationInterval: 300000, // 5 minutes
  performanceWindowSize: 100,

  maxPrimaryRelays: 3,
  maxSecondaryRelays: 3,
  maxPublishRelays: 5,
  minRelaysPerPool: 2,

  latencyThreshold: 100, // 100ms
  uptimeThreshold: 95, // 95%
  diversityWeight: 0.3,
};

class IntelligentRelayManager {
  private config: RelayOptimizationConfig;
  private currentStrategy: RelayStrategy | null = null;
  private availableRelays: string[] = [];
  private userLocation: GeographicLocation | null = null;
  private performanceMetrics: RelayPerformanceMetrics | null = null;
  private listeners: Array<(strategy: RelayStrategy) => void> = [];

  private optimizationInterval: number | null = null;
  private isOptimizing = false;

  constructor(config?: Partial<RelayOptimizationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startOptimization();
  }

  /**
   * Initialize the intelligent relay manager with available relays
   */
  async initialize(relayUrls: string[]): Promise<void> {
    intelligentLogger.info('Initializing intelligent relay manager', {
      relayCount: relayUrls.length,
      config: this.config
    });

    this.availableRelays = [...relayUrls];

    // Don't start aggressive health monitoring immediately - only when dashboard is accessed
    // This prevents the WebSocket connection spam on app startup
    intelligentLogger.debug('Health monitoring will start when dashboard is accessed');

    // Get user location for geographic optimization (lightweight, no connections)
    if (this.config.enableGeographicOptimization) {
      try {
        this.userLocation = await geoRelaySelector.getUserLocation();
        intelligentLogger.info('Got user location for optimization', {
          country: this.userLocation?.country,
          region: this.userLocation?.region
        });
      } catch (error) {
        intelligentLogger.warn('Failed to get user location', error);
      }
    }

    // Perform initial strategy optimization without health data (uses defaults)
    await this.optimizeStrategy();

    intelligentLogger.info('Intelligent relay manager initialized', {
      strategy: this.currentStrategy?.name,
      primaryRelays: this.currentStrategy?.primary.length
    });
  }

  /**
   * Start health monitoring (called when dashboard is accessed)
   */
  async startHealthMonitoring(): Promise<void> {
    if (!this.config.enableHealthMonitoring) return;

    intelligentLogger.info('Starting health monitoring for dashboard');

    for (const url of this.availableRelays) {
      try {
        await relayHealthMonitor.startMonitoring(url);
      } catch (error) {
        intelligentLogger.debug(`Failed to start monitoring ${url}`, error);
      }
    }
  }

  /**
   * Get the current optimal relay strategy
   */
  getCurrentStrategy(): RelayStrategy | null {
    return this.currentStrategy;
  }

  /**
   * Select the best relay for a specific request type
   */
  async selectRelay(
    requestType: 'read' | 'write' | 'discovery' = 'read',
    context?: RequestContext
  ): Promise<string | null> {
    if (!this.currentStrategy) {
      intelligentLogger.warn('No strategy available, using first available relay');
      return this.availableRelays[0] || null;
    }

    let candidateRelays: string[];

    switch (requestType) {
      case 'read':
        candidateRelays = [...this.currentStrategy.primary, ...this.currentStrategy.secondary];
        break;
      case 'write':
        candidateRelays = this.currentStrategy.publish;
        break;
      case 'discovery':
        candidateRelays = this.currentStrategy.discovery;
        break;
    }

    if (candidateRelays.length === 0) {
      intelligentLogger.warn(`No relays available for ${requestType} requests`);
      return this.availableRelays[0] || null;
    }

    // Use load balancer if enabled
    if (this.config.enableLoadBalancing) {
      const poolName = `${requestType}-pool`;

      // Ensure pool exists
      if (!relayLoadBalancer.getRelayPools()[poolName]) {
        relayLoadBalancer.addRelayPool(poolName, candidateRelays);
      }

      return await relayLoadBalancer.selectRelay(poolName, context);
    }

    // Simple selection from candidates
    return this.selectFromCandidates(candidateRelays, context);
  }

  /**
   * Execute a request with intelligent relay selection and failover
   */
  async executeRequest<T>(
    requestFn: (relayUrl: string) => Promise<T>,
    requestType: 'read' | 'write' | 'discovery' = 'read',
    context?: RequestContext
  ): Promise<T> {
    const startTime = performance.now();

    try {
      if (this.config.enableLoadBalancing && this.currentStrategy) {
        const poolName = `${requestType}-pool`;
        return await relayLoadBalancer.executeRequest(poolName, requestFn, context);
      } else {
        // Manual execution with failover
        return await this.executeWithFailover(requestFn, requestType, context);
      }
    } finally {
      // Update performance metrics
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics(requestType, duration, true);
    }
  }

  /**
   * Execute request with manual failover
   */
  private async executeWithFailover<T>(
    requestFn: (relayUrl: string) => Promise<T>,
    requestType: 'read' | 'write' | 'discovery',
    context?: RequestContext
  ): Promise<T> {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const relayUrl = await this.selectRelay(requestType, context);
      if (!relayUrl) {
        throw new Error(`No relays available for ${requestType} requests`);
      }

      try {
        return await requestFn(relayUrl);
      } catch (error) {
        lastError = error as Error;
        intelligentLogger.warn(`Request failed on ${relayUrl} (attempt ${attempt + 1})`, error);

        // Update error metrics
        this.updatePerformanceMetrics(requestType, 0, false);

        // Don't retry for non-retryable requests
        if (context && !context.retryable) {
          break;
        }
      }
    }

    throw lastError || new Error('All relay attempts failed');
  }

  /**
   * Optimize relay strategy based on current performance and conditions
   */
  async optimizeStrategy(): Promise<void> {
    if (this.isOptimizing || this.availableRelays.length === 0) {
      return;
    }

    this.isOptimizing = true;
    intelligentLogger.info('Starting strategy optimization');

    try {
      // Get health metrics for all relays
      const healthMetrics = this.config.enableHealthMonitoring ?
        relayHealthMonitor.getAllMetrics() : [];

      // Get geographic information
      const geographicInfo = this.config.enableGeographicOptimization ?
        await this.getGeographicRelayInfo() : [];

      // Generate optimized strategy
      const newStrategy = await this.generateOptimalStrategy(healthMetrics, geographicInfo);

      // Evaluate if new strategy is better than current
      if (this.shouldAdoptNewStrategy(newStrategy)) {
        this.adoptStrategy(newStrategy);
        intelligentLogger.info('Adopted new relay strategy', {
          strategy: newStrategy.name,
          primaryCount: newStrategy.primary.length,
          publishCount: newStrategy.publish.length
        });
      } else {
        intelligentLogger.debug('Current strategy remains optimal');
      }

    } catch (error) {
      intelligentLogger.error('Strategy optimization failed', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Generate optimal strategy based on current metrics
   */
  private async generateOptimalStrategy(
    healthMetrics: RelayHealthMetrics[],
    geographicInfo: RelayLocationInfo[]
  ): Promise<RelayStrategy> {
    const healthyRelays = healthMetrics
      .filter(m => m.uptime >= this.config.uptimeThreshold)
      .sort((a, b) => b.priority - a.priority);

    const relayScores = new Map<string, number>();

    // Calculate composite scores for each relay
    for (const url of this.availableRelays) {
      let score = 50; // Base score

      // Health score contribution (40%)
      const health = healthMetrics.find(m => m.url === url);
      if (health) {
        score += (health.priority / 100) * 40;
      }

      // Geographic score contribution (30%)
      const geoInfo = geographicInfo.find(g => g.url === url);
      if (geoInfo && geoInfo.distanceFromUser !== undefined) {
        const maxDistance = 20000; // 20,000 km
        const distanceScore = Math.max(0, (maxDistance - geoInfo.distanceFromUser) / maxDistance);
        score += distanceScore * 30;
      } else {
        score += 15; // Default geographic score
      }

      // Performance history contribution (20%)
      if (this.performanceMetrics?.relayMetrics[url]) {
        const metrics = this.performanceMetrics.relayMetrics[url];
        const latencyScore = Math.max(0, (3000 - metrics.latency) / 3000);
        const uptimeScore = metrics.requestCount > 0 ?
          (metrics.requestCount - metrics.errorCount) / metrics.requestCount : 0.5;
        score += (latencyScore * 0.6 + uptimeScore * 0.4) * 20;
      }

      // Diversity bonus (10%)
      if (geoInfo && this.shouldIncludeForDiversity(geoInfo, geographicInfo)) {
        score += 10;
      }

      relayScores.set(url, score);
    }

    // Sort relays by score
    const sortedRelays = this.availableRelays
      .map(url => ({ url, score: relayScores.get(url) || 0 }))
      .sort((a, b) => b.score - a.score);

    // Select relays for different purposes
    const primary = sortedRelays
      .slice(0, this.config.maxPrimaryRelays)
      .map(r => r.url);

    const secondary = sortedRelays
      .slice(this.config.maxPrimaryRelays, this.config.maxPrimaryRelays + this.config.maxSecondaryRelays)
      .map(r => r.url);

    const publish = sortedRelays
      .slice(0, this.config.maxPublishRelays)
      .map(r => r.url);

    const discovery = this.selectDiscoveryRelays(sortedRelays.map(r => r.url));

    const strategyName = this.generateStrategyName(primary, geographicInfo);

    return {
      name: strategyName,
      description: `Optimized strategy with ${primary.length} primary relays`,
      primary,
      secondary,
      publish,
      discovery
    };
  }

  /**
   * Select relays for discovery purposes (prefer diverse, well-connected relays)
   */
  private selectDiscoveryRelays(sortedRelays: string[]): string[] {
    // For discovery, we want geographic diversity to find different content
    const discoveryRelays: string[] = [];
    const usedRegions = new Set<string>();

    for (const url of sortedRelays) {
      if (discoveryRelays.length >= 4) break; // Max 4 discovery relays

      const geoInfo = geoRelaySelector.getRelayLocationInfo(url);
      const region = geoInfo?.location.region || 'Unknown';

      if (!usedRegions.has(region) || discoveryRelays.length < 2) {
        discoveryRelays.push(url);
        usedRegions.add(region);
      }
    }

    return discoveryRelays;
  }

  /**
   * Check if relay should be included for geographic diversity
   */
  private shouldIncludeForDiversity(
    relayInfo: RelayLocationInfo,
    allGeoInfo: RelayLocationInfo[]
  ): boolean {
    // Simple diversity check - prefer relays from different regions
    const existingRegions = allGeoInfo
      .slice(0, this.config.maxPrimaryRelays)
      .map(info => info.location.region);

    return !existingRegions.includes(relayInfo.location.region);
  }

  /**
   * Generate strategy name based on composition
   */
  private generateStrategyName(primaryRelays: string[], geoInfo: RelayLocationInfo[]): string {
    const regions = new Set<string>();

    for (const url of primaryRelays) {
      const info = geoInfo.find(g => g.url === url);
      if (info?.location.region) {
        regions.add(info.location.region);
      }
    }

    const regionList = Array.from(regions).join('+');
    return regionList || 'Mixed';
  }

  /**
   * Determine if new strategy should be adopted
   */
  private shouldAdoptNewStrategy(newStrategy: RelayStrategy): boolean {
    if (!this.currentStrategy) {
      return true; // Always adopt first strategy
    }

    // Don't change too frequently
    const timeSinceLastChange = Date.now() - (this.performanceMetrics?.lastOptimization || 0);
    if (timeSinceLastChange < this.config.strategyEvaluationInterval) {
      return false;
    }

    // Check if new strategy offers significant improvement
    const currentPrimary = new Set(this.currentStrategy.primary);
    const newPrimary = new Set(newStrategy.primary);
    const overlap = [...currentPrimary].filter(url => newPrimary.has(url)).length;
    const changeRatio = 1 - (overlap / Math.max(currentPrimary.size, newPrimary.size));

    // Only change if significant difference and current performance is poor
    if (changeRatio > 0.5 && this.performanceMetrics) {
      const currentLatency = this.performanceMetrics.averageLatency;
      const currentSuccess = this.performanceMetrics.successRate;

      return currentLatency > 2000 || currentSuccess < 90; // Poor performance thresholds
    }

    return false;
  }

  /**
   * Adopt a new relay strategy
   */
  private adoptStrategy(strategy: RelayStrategy): void {
    const oldStrategy = this.currentStrategy;
    this.currentStrategy = strategy;

    // Update load balancer pools if enabled
    if (this.config.enableLoadBalancing) {
      relayLoadBalancer.addRelayPool('read-pool', [...strategy.primary, ...strategy.secondary]);
      relayLoadBalancer.addRelayPool('write-pool', strategy.publish);
      relayLoadBalancer.addRelayPool('discovery-pool', strategy.discovery);
    }

    // Update performance metrics
    if (this.performanceMetrics) {
      this.performanceMetrics.strategy = strategy.name;
      this.performanceMetrics.lastOptimization = Date.now();
      this.performanceMetrics.optimizationCount++;
    } else {
      this.performanceMetrics = {
        strategy: strategy.name,
        totalRequests: 0,
        averageLatency: 0,
        successRate: 100,
        lastOptimization: Date.now(),
        optimizationCount: 1,
        relayMetrics: {}
      };
    }

    // Notify listeners
    this.notifyListeners(strategy);

    intelligentLogger.info('Strategy adopted', {
      old: oldStrategy?.name,
      new: strategy.name,
      primaryChanged: !oldStrategy ||
        JSON.stringify(oldStrategy.primary) !== JSON.stringify(strategy.primary)
    });
  }

  /**
   * Get geographic information for available relays
   */
  private async getGeographicRelayInfo(): Promise<RelayLocationInfo[]> {
    const geoInfo: RelayLocationInfo[] = [];

    for (const url of this.availableRelays) {
      const info = geoRelaySelector.getRelayLocationInfo(url);
      if (info) {
        geoInfo.push(info);
      }
    }

    // Get optimal relays to calculate distances
    if (geoInfo.length > 0) {
      try {
        const optimal = await geoRelaySelector.selectOptimalRelays(
          this.availableRelays,
          this.availableRelays.length
        );
        return optimal;
      } catch (error) {
        intelligentLogger.debug('Geographic optimization failed', error);
      }
    }

    return geoInfo;
  }

  /**
   * Simple relay selection from candidates
   */
  private selectFromCandidates(
    candidates: string[],
    context?: RequestContext
  ): string {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Prefer relays with better health if available
    if (this.config.enableHealthMonitoring) {
      const healthyCandidate = candidates.find(url => {
        const health = relayHealthMonitor.getMetrics(url);
        return health && health.status === 'healthy';
      });

      if (healthyCandidate) {
        return healthyCandidate;
      }
    }

    // Round-robin fallback
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    requestType: string,
    duration: number,
    success: boolean
  ): void {
    if (!this.performanceMetrics) return;

    this.performanceMetrics.totalRequests++;

    if (success) {
      const total = this.performanceMetrics.totalRequests;
      this.performanceMetrics.averageLatency =
        (this.performanceMetrics.averageLatency * (total - 1) + duration) / total;

      const successCount = Math.round(this.performanceMetrics.successRate * (total - 1) / 100) + 1;
      this.performanceMetrics.successRate = (successCount / total) * 100;
    } else {
      const successCount = Math.round(this.performanceMetrics.successRate * (this.performanceMetrics.totalRequests - 1) / 100);
      this.performanceMetrics.successRate = (successCount / this.performanceMetrics.totalRequests) * 100;
    }
  }

  /**
   * Start automatic optimization
   */
  private startOptimization(): void {
    if (this.optimizationInterval) return;

    this.optimizationInterval = setInterval(() => {
      if (this.config.enableAdaptiveStrategySelection) {
        this.optimizeStrategy();
      }
    }, this.config.strategyEvaluationInterval);

    intelligentLogger.info('Started automatic optimization', {
      interval: this.config.strategyEvaluationInterval
    });
  }

  /**
   * Stop automatic optimization
   */
  private stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      intelligentLogger.info('Stopped automatic optimization');
    }
  }

  /**
   * Subscribe to strategy changes
   */
  onStrategyChange(listener: (strategy: RelayStrategy) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of strategy changes
   */
  private notifyListeners(strategy: RelayStrategy): void {
    this.listeners.forEach(listener => {
      try {
        listener(strategy);
      } catch (error) {
        intelligentLogger.error('Error in strategy listener', error);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): RelayPerformanceMetrics | null {
    return this.performanceMetrics;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RelayOptimizationConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // Restart optimization if interval changed
    if (this.config.strategyEvaluationInterval !== oldConfig.strategyEvaluationInterval) {
      this.stopOptimization();
      this.startOptimization();
    }

    intelligentLogger.info('Updated configuration', this.config);
  }

  /**
   * Force immediate strategy optimization
   */
  async forceOptimization(): Promise<void> {
    await this.optimizeStrategy();
  }

  /**
   * Shutdown the intelligent relay manager
   */
  shutdown(): void {
    this.stopOptimization();
    this.listeners = [];

    if (this.config.enableHealthMonitoring) {
      relayHealthMonitor.reset();
    }

    if (this.config.enableLoadBalancing) {
      relayLoadBalancer.shutdown();
    }

    intelligentLogger.info('Intelligent relay manager shutdown');
  }
}

// Create singleton instance
export const intelligentRelayManager = new IntelligentRelayManager();

/**
 * React hook for intelligent relay management
 */
export function useIntelligentRelay(relayUrls?: string[]) {
  const [strategy, setStrategy] = useState<RelayStrategy | null>(null);
  const [metrics, setMetrics] = useState<RelayPerformanceMetrics | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!relayUrls || relayUrls.length === 0) return;

    const initialize = async () => {
      try {
        await intelligentRelayManager.initialize(relayUrls);
        setStrategy(intelligentRelayManager.getCurrentStrategy());
        setMetrics(intelligentRelayManager.getPerformanceMetrics());
        setIsInitialized(true);
      } catch (error) {
        intelligentLogger.error('Failed to initialize intelligent relay manager', error);
      }
    };

    initialize();

    // Subscribe to strategy changes
    const unsubscribe = intelligentRelayManager.onStrategyChange((newStrategy) => {
      setStrategy(newStrategy);
      setMetrics(intelligentRelayManager.getPerformanceMetrics());
    });

    return () => {
      unsubscribe();
    };
  }, [relayUrls]);

  return {
    strategy,
    metrics,
    isInitialized,
    selectRelay: intelligentRelayManager.selectRelay.bind(intelligentRelayManager),
    executeRequest: intelligentRelayManager.executeRequest.bind(intelligentRelayManager),
    forceOptimization: intelligentRelayManager.forceOptimization.bind(intelligentRelayManager),
    manager: intelligentRelayManager
  };
}