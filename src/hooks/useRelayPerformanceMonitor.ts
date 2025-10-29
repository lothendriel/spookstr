import { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from './useAppContext';
import { useLocalStorage } from './useLocalStorage';
import type { RelayConfig } from '@/contexts/AppContext';

interface RelayPerformanceMetrics {
  url: string;
  successfulConnections: number;
  failedConnections: number;
  totalLatency: number;
  measurements: number;
  lastUpdated: number;
  reliabilityScore: number; // 0-100
  averageLatency: number;
}

interface PerformanceData {
  [url: string]: RelayPerformanceMetrics;
}

/**
 * Hook for monitoring and tracking relay performance metrics
 */
export function useRelayPerformanceMonitor() {
  const { config, updateConfig } = useAppContext();
  const [performanceData, setPerformanceData] = useLocalStorage<PerformanceData>('relay-performance', {});
  const metricsRef = useRef<PerformanceData>(performanceData);

  // Update ref when data changes
  useEffect(() => {
    metricsRef.current = performanceData;
  }, [performanceData]);

  // Record a successful connection with latency
  const recordConnection = useCallback((url: string, latency: number, success: boolean) => {
    setPerformanceData(current => {
      const existing = current[url] || {
        url,
        successfulConnections: 0,
        failedConnections: 0,
        totalLatency: 0,
        measurements: 0,
        lastUpdated: Date.now(),
        reliabilityScore: 50,
        averageLatency: 0,
      };

      const updated = {
        ...existing,
        successfulConnections: success ? existing.successfulConnections + 1 : existing.successfulConnections,
        failedConnections: success ? existing.failedConnections : existing.failedConnections + 1,
        totalLatency: success ? existing.totalLatency + latency : existing.totalLatency,
        measurements: success ? existing.measurements + 1 : existing.measurements,
        lastUpdated: Date.now(),
      };

      // Calculate reliability score (0-100)
      const totalAttempts = updated.successfulConnections + updated.failedConnections;
      updated.reliabilityScore = totalAttempts > 0 
        ? Math.round((updated.successfulConnections / totalAttempts) * 100)
        : 50;

      // Calculate average latency
      updated.averageLatency = updated.measurements > 0
        ? Math.round(updated.totalLatency / updated.measurements)
        : 0;

      return {
        ...current,
        [url]: updated,
      };
    });
  }, [setPerformanceData]);

  // Get performance metrics for a relay
  const getPerformanceMetrics = useCallback((url: string): RelayPerformanceMetrics | null => {
    return metricsRef.current[url] || null;
  }, []);

  // Update relay configurations with performance data
  const updateRelayPerformance = useCallback(() => {
    if (!config.relays) return;

    const updatedRelays = config.relays.map(relay => {
      const metrics = metricsRef.current[relay.url];
      if (metrics) {
        return {
          ...relay,
          reliabilityScore: metrics.reliabilityScore,
          latency: metrics.averageLatency,
        };
      }
      return relay;
    });

    // Auto-assign priorities based on performance
    const sortedByPerformance = updatedRelays
      .filter(r => r.mode === 'read' || r.mode === 'both')
      .sort((a, b) => {
        const aScore = (a.reliabilityScore || 50) - ((a.latency || 1000) / 10);
        const bScore = (b.reliabilityScore || 50) - ((b.latency || 1000) / 10);
        return bScore - aScore;
      });

    // Assign priorities automatically if not set
    const relaysWithAutoPriority = updatedRelays.map(relay => {
      if (relay.priority) return relay; // Don't override manual priority

      const index = sortedByPerformance.findIndex(r => r.url === relay.url);
      if (index === -1) return { ...relay, priority: 'backup' as const };

      if (index < 2) return { ...relay, priority: 'primary' as const };
      if (index < 5) return { ...relay, priority: 'discovery' as const };
      return { ...relay, priority: 'backup' as const };
    });

    updateConfig(current => ({
      ...current,
      relays: relaysWithAutoPriority,
    }));
  }, [config.relays, updateConfig]);

  // Periodically update relay performance (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(updateRelayPerformance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateRelayPerformance]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const metrics = Object.values(metricsRef.current);
    if (metrics.length === 0) return null;

    const totalReliability = metrics.reduce((sum, m) => sum + m.reliabilityScore, 0);
    const totalLatency = metrics.reduce((sum, m) => sum + m.averageLatency, 0);
    const validLatencyCount = metrics.filter(m => m.averageLatency > 0).length;

    return {
      averageReliability: Math.round(totalReliability / metrics.length),
      averageLatency: validLatencyCount > 0 ? Math.round(totalLatency / validLatencyCount) : 0,
      totalRelays: metrics.length,
      healthyRelays: metrics.filter(m => m.reliabilityScore >= 80).length,
    };
  }, []);

  return {
    recordConnection,
    getPerformanceMetrics,
    updateRelayPerformance,
    getPerformanceSummary,
    performanceData: metricsRef.current,
  };
}