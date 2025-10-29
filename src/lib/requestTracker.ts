/**
 * Request Tracker for Load Balancing Statistics
 * 
 * Tracks Nostr requests going through the intelligent routing system
 * to provide accurate load balancing statistics and connection monitoring.
 */

import { useState, useEffect } from 'react';
import { devLogger } from './devLogger';

const trackerLogger = devLogger.scope('request-tracker');

export interface RequestStats {
  relayUrl: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastUsed: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface GlobalRequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  relayUtilization: Record<string, number>;
  failoverCount: number;
  currentAlgorithm: string;
}

class NostrRequestTracker {
  private relayStats = new Map<string, RequestStats>();
  private globalStats: GlobalRequestStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    relayUtilization: {},
    failoverCount: 0,
    currentAlgorithm: 'intelligent'
  };
  private listeners: Array<(stats: GlobalRequestStats) => void> = [];

  /**
   * Track a request being sent to a relay
   */
  trackRequest(relayUrl: string, requestType: 'query' | 'publish' = 'query'): string {
    const requestId = crypto.randomUUID();
    const now = Date.now();

    // Update relay stats
    if (!this.relayStats.has(relayUrl)) {
      this.relayStats.set(relayUrl, {
        relayUrl,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        lastUsed: now,
        connectionStatus: 'connecting'
      });
    }

    const relayStats = this.relayStats.get(relayUrl)!;
    relayStats.totalRequests++;
    relayStats.lastUsed = now;
    relayStats.connectionStatus = 'connected';

    // Update global stats
    this.globalStats.totalRequests++;
    this.globalStats.relayUtilization[relayUrl] = (this.globalStats.relayUtilization[relayUrl] || 0) + 1;

    trackerLogger.debug(`Request tracked: ${requestType} to ${new URL(relayUrl).hostname}`, {
      requestId,
      totalRequests: relayStats.totalRequests
    });

    return requestId;
  }

  /**
   * Track a successful request completion
   */
  trackSuccess(relayUrl: string, requestId: string, latency: number): void {
    const relayStats = this.relayStats.get(relayUrl);
    if (!relayStats) return;

    relayStats.successfulRequests++;
    
    // Update average latency
    const totalSuccessful = relayStats.successfulRequests;
    relayStats.averageLatency = 
      (relayStats.averageLatency * (totalSuccessful - 1) + latency) / totalSuccessful;

    // Update global stats
    this.globalStats.successfulRequests++;
    const totalGlobalSuccessful = this.globalStats.successfulRequests;
    this.globalStats.averageResponseTime = 
      (this.globalStats.averageResponseTime * (totalGlobalSuccessful - 1) + latency) / totalGlobalSuccessful;

    trackerLogger.debug(`Request success: ${new URL(relayUrl).hostname}`, {
      requestId,
      latency: Math.round(latency),
      successRate: Math.round((relayStats.successfulRequests / relayStats.totalRequests) * 100)
    });

    this.notifyListeners();
  }

  /**
   * Track a failed request
   */
  trackFailure(relayUrl: string, requestId: string, error?: any): void {
    const relayStats = this.relayStats.get(relayUrl);
    if (!relayStats) return;

    relayStats.failedRequests++;
    relayStats.connectionStatus = 'error';

    // Update global stats
    this.globalStats.failedRequests++;

    trackerLogger.warn(`Request failed: ${new URL(relayUrl).hostname}`, {
      requestId,
      error: error?.message || 'Unknown error',
      errorRate: Math.round((relayStats.failedRequests / relayStats.totalRequests) * 100)
    });

    this.notifyListeners();
  }

  /**
   * Track a failover event
   */
  trackFailover(fromRelay: string, toRelay: string, reason: string): void {
    this.globalStats.failoverCount++;

    trackerLogger.info(`Failover: ${new URL(fromRelay).hostname} → ${new URL(toRelay).hostname}`, {
      reason,
      totalFailovers: this.globalStats.failoverCount
    });

    this.notifyListeners();
  }

  /**
   * Get statistics for a specific relay
   */
  getRelayStats(relayUrl: string): RequestStats | undefined {
    return this.relayStats.get(relayUrl);
  }

  /**
   * Get statistics for all relays
   */
  getAllRelayStats(): RequestStats[] {
    return Array.from(this.relayStats.values());
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): GlobalRequestStats {
    return { ...this.globalStats };
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.relayStats.clear();
    this.globalStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      relayUtilization: {},
      failoverCount: 0,
      currentAlgorithm: 'intelligent'
    };

    trackerLogger.info('Request statistics reset');
    this.notifyListeners();
  }

  /**
   * Subscribe to statistics updates
   */
  onStatsChange(listener: (stats: GlobalRequestStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of statistics changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getGlobalStats());
      } catch (error) {
        trackerLogger.error('Error in stats listener', error);
      }
    });
  }

  /**
   * Update connection status for a relay
   */
  updateConnectionStatus(relayUrl: string, status: 'connected' | 'connecting' | 'disconnected' | 'error'): void {
    const relayStats = this.relayStats.get(relayUrl);
    if (relayStats) {
      relayStats.connectionStatus = status;
      trackerLogger.debug(`Connection status updated: ${new URL(relayUrl).hostname} → ${status}`);
    }
  }
}

// Create singleton instance
export const requestTracker = new NostrRequestTracker();

/**
 * React hook for request tracking statistics
 */
export function useRequestTracker() {
  const [globalStats, setGlobalStats] = useState<GlobalRequestStats>(requestTracker.getGlobalStats());
  const [relayStats, setRelayStats] = useState<RequestStats[]>([]);

  useEffect(() => {
    // Subscribe to stats changes
    const unsubscribe = requestTracker.onStatsChange(setGlobalStats);
    
    // Update relay stats periodically
    const updateRelayStats = () => {
      setRelayStats([...requestTracker.getAllRelayStats()]);
    };
    
    updateRelayStats();
    const interval = setInterval(updateRelayStats, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    globalStats,
    relayStats,
    tracker: requestTracker
  };
}