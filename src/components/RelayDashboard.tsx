/**
 * Relay Dashboard Component
 *
 * Provides a comprehensive view of the intelligent relay system:
 * - Health monitoring visualization
 * - Geographic distribution map
 * - Load balancing statistics
 * - Performance metrics and trends
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Activity,
  Globe,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Network
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRelayHealth as useAdvancedRelayHealth } from '@/lib/relayHealth';
import { useGeographicRelay } from '@/lib/relayGeography';
import { useRelayLoadBalancer } from '@/lib/relayLoadBalancer';
import { useIntelligentRelay } from '@/lib/intelligentRelayManager';

interface RelayDashboardProps {
  relayUrls: string[];
  className?: string;
}

export function RelayDashboard({ relayUrls, className }: RelayDashboardProps) {
  const { metrics: healthMetrics, startMonitoring, isMonitoring } = useAdvancedRelayHealth(relayUrls);
  const { optimalRelays, userLocation, selector: geoSelector } = useGeographicRelay(relayUrls);
  const { stats: loadBalancerStats, connections, loadBalancer } = useRelayLoadBalancer();
  const { strategy, metrics: intelligentMetrics, forceOptimization, manager } = useIntelligentRelay(relayUrls);

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Manually start health monitoring when user clicks a button
  const handleStartMonitoring = async () => {
    if (!isMonitoring && startMonitoring) {
      try {
        console.log('🔍 Starting relay health monitoring...');
        await startMonitoring();
      } catch (error) {
        console.error('Failed to start health monitoring:', error);
      }
    }
  };

  const handleForceOptimization = async () => {
    setIsOptimizing(true);
    try {
      await forceOptimization();
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'degraded':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'unhealthy':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'offline':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'degrading':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  if (!relayUrls || relayUrls.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No relays configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Current Strategy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Current Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {strategy?.name || 'Initializing...'}
            </div>
            <div className="text-xs text-muted-foreground">
              {strategy ? `${strategy.primary.length} primary relays` : 'Setting up...'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceOptimization}
              disabled={isOptimizing}
              className="mt-2 w-full"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isOptimizing && "animate-spin")} />
              Optimize
            </Button>
          </CardContent>
        </Card>

        {/* Health Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">
                {healthMetrics.filter(m => m.status === 'healthy').length}
              </div>
              <div className="text-sm text-muted-foreground">
                / {healthMetrics.length} {isMonitoring ? 'healthy' : 'relays'}
              </div>
            </div>

            {!isMonitoring ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartMonitoring}
                className="mt-2 w-full"
              >
                <Activity className="h-3 w-3 mr-1" />
                Start Health Monitoring
              </Button>
            ) : (
              <div className="flex gap-1 mt-2">
                {healthMetrics.map((metric, i) => (
                  <TooltipProvider key={metric.url}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "h-2 w-full rounded",
                          metric.status === 'healthy' ? 'bg-green-500' :
                          metric.status === 'degraded' ? 'bg-yellow-500' :
                          metric.status === 'unhealthy' ? 'bg-orange-500' :
                          'bg-red-500'
                        )} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-medium">{new URL(metric.url).hostname}</div>
                          <div>Status: {metric.status}</div>
                          <div>Latency: {Math.round(metric.latency)}ms</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Geographic Spread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(optimalRelays.map(r => r.location.region)).size}
            </div>
            <div className="text-xs text-muted-foreground">regions covered</div>
            {userLocation && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {userLocation.country} ({userLocation.region})
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(loadBalancerStats.averageResponseTime)}ms
            </div>
            <div className="text-xs text-muted-foreground">avg response time</div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-green-600">
                {loadBalancerStats.successfulRequests} success
              </span>
              <span className="text-red-600">
                {loadBalancerStats.failedRequests} failed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Dashboard */}
      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="load-balancing">Load Balancing</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
        </TabsList>

        {/* Health Monitoring Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4">
            {healthMetrics.map((metric) => (
              <Card key={metric.url}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(metric.status)}
                      {new URL(metric.url).hostname}
                    </CardTitle>
                    <Badge variant="outline" className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

                    <div>
                      <div className="text-muted-foreground">Latency</div>
                      <div className="font-medium flex items-center gap-1">
                        {Math.round(metric.latency)}ms
                        {getTrendIcon(metric.trends.latencyTrend)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Uptime</div>
                      <div className="font-medium flex items-center gap-1">
                        {Math.round(metric.uptime)}%
                        {getTrendIcon(metric.trends.uptimeTrend)}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Success Rate</div>
                      <div className="font-medium">
                        {Math.round(metric.successRate)}%
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Priority</div>
                      <div className="font-medium">
                        {metric.priority}/100
                      </div>
                    </div>
                  </div>

                  {metric.history.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        Recent Performance
                      </div>
                      <div className="flex gap-1 h-8 items-end">
                        {metric.history.slice(-20).map((snapshot, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-2 rounded-t",
                                    snapshot.success ? "bg-green-500" : "bg-red-500"
                                  )}
                                  style={{
                                    height: `${Math.max(4, (snapshot.latency / 3000) * 32)}px`
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <div>Latency: {Math.round(snapshot.latency)}ms</div>
                                  <div>Status: {snapshot.success ? 'Success' : 'Failed'}</div>
                                  <div>Time: {new Date(snapshot.timestamp).toLocaleTimeString()}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )}

                  {metric.lastError && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium text-red-900">
                        Last Error
                      </div>
                      <div className="text-xs text-red-700 mt-1">
                        {metric.lastError.message}
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {new Date(metric.lastError.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-4">
          <div className="grid gap-4">
            {optimalRelays.map((relay) => (
              <Card key={relay.url}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {new URL(relay.url).hostname}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

                    <div>
                      <div className="text-muted-foreground">Location</div>
                      <div className="font-medium">
                        {relay.location.city}, {relay.location.country}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Region</div>
                      <div className="font-medium">
                        {relay.location.region}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Distance</div>
                      <div className="font-medium">
                        {relay.distanceFromUser ?
                          `${Math.round(relay.distanceFromUser)} km` :
                          'Unknown'
                        }
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Est. Latency</div>
                      <div className="font-medium">
                        {relay.estimatedLatency ?
                          `${relay.estimatedLatency}ms` :
                          'Unknown'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {relay.regions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Load Balancing Tab */}
        <TabsContent value="load-balancing" className="space-y-4">
          <div className="grid gap-4">

            {/* Stats Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Load Balancer Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  <div>
                    <div className="text-2xl font-bold">{loadBalancerStats.totalRequests}</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {loadBalancerStats.successfulRequests}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {loadBalancerStats.failedRequests}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold">{loadBalancerStats.failoverCount}</div>
                    <div className="text-sm text-muted-foreground">Failovers</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Algorithm</div>
                  <Badge variant="outline">{loadBalancerStats.currentAlgorithm}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {connections.map((conn) => (
                    <div key={conn.url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          conn.status === 'connected' ? 'bg-green-500' :
                          conn.status === 'connecting' ? 'bg-yellow-500' :
                          'bg-red-500'
                        )} />
                        <div>
                          <div className="font-medium">{new URL(conn.url).hostname}</div>
                          <div className="text-sm text-muted-foreground">{conn.status}</div>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="font-medium">{conn.activeRequests} active</div>
                        <div className="text-muted-foreground">{conn.totalRequests} total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Request Distribution */}
            {Object.keys(loadBalancerStats.relayUtilization).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(loadBalancerStats.relayUtilization).map(([url, count]) => {
                      const percentage = (count / loadBalancerStats.totalRequests) * 100;
                      return (
                        <div key={url}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{new URL(url).hostname}</span>
                            <span>{count} ({Math.round(percentage)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-4">
          {strategy ? (
            <div className="grid gap-4">

              {/* Strategy Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {strategy.name} Strategy
                    {intelligentMetrics && (
                      <Badge variant="outline">
                        {intelligentMetrics.optimizationCount} optimizations
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{strategy.description}</p>

                  {intelligentMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold">{intelligentMetrics.totalRequests}</div>
                        <div className="text-sm text-muted-foreground">Total Requests</div>
                      </div>

                      <div>
                        <div className="text-2xl font-bold">
                          {Math.round(intelligentMetrics.averageLatency)}ms
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Latency</div>
                      </div>

                      <div>
                        <div className="text-2xl font-bold">
                          {Math.round(intelligentMetrics.successRate)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Last optimization: {intelligentMetrics ?
                      new Date(intelligentMetrics.lastOptimization).toLocaleString() :
                      'Never'
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Relay Assignments */}
              <div className="grid gap-4">

                {/* Primary Relays */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Primary Relays (Read)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {strategy.primary.map((url) => (
                        <div key={url} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="font-medium">{new URL(url).hostname}</span>
                          <Badge variant="secondary">Primary</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Secondary Relays */}
                {strategy.secondary.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Secondary Relays (Backup)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {strategy.secondary.map((url) => (
                          <div key={url} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                            <span>{new URL(url).hostname}</span>
                            <Badge variant="secondary">Secondary</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Publish Relays */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Publish Relays (Write)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {strategy.publish.map((url) => (
                        <div key={url} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span>{new URL(url).hostname}</span>
                          <Badge variant="secondary">Publish</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Discovery Relays */}
                {strategy.discovery.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Discovery Relays</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {strategy.discovery.map((url) => (
                          <div key={url} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                            <span>{new URL(url).hostname}</span>
                            <Badge variant="secondary">Discovery</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Optimizing relay strategy...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}