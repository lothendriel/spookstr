import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  Shield, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useRelayPerformanceMonitor } from '@/hooks/useRelayPerformanceMonitor';
import { useSmartRelayRouter } from '@/hooks/useSmartRelayRouter';
import { useAppContext } from '@/hooks/useAppContext';

interface RelayPerformanceDashboardProps {
  className?: string;
}

export function RelayPerformanceDashboard({ className }: RelayPerformanceDashboardProps) {
  const { getPerformanceSummary, updateRelayPerformance, performanceData } = useRelayPerformanceMonitor();
  const relayRouter = useSmartRelayRouter();
  const { config } = useAppContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const summary = getPerformanceSummary();
  const relayPerformance = relayRouter.getRelayPerformance();
  const feedRelays = relayRouter.getFeedRelays();
  const publishRelays = relayRouter.getPublishRelays();

  const handleUpdatePerformance = async () => {
    setIsUpdating(true);
    updateRelayPerformance();
    // Simulate update time
    setTimeout(() => setIsUpdating(false), 1000);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 200) return 'text-green-600';
    if (latency < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Relay Performance Dashboard
              </CardTitle>
              <CardDescription>
                Real-time performance metrics and optimization status
              </CardDescription>
            </div>
            <Button
              onClick={handleUpdatePerformance}
              disabled={isUpdating}
              variant="outline"
              size="sm"
            >
              {isUpdating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getPerformanceColor(summary.averageReliability)}`}>
                  {summary.averageReliability}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Reliability</div>
                <Progress value={summary.averageReliability} className="h-2 mt-2" />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getLatencyColor(summary.averageLatency)}`}>
                  {summary.averageLatency}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Latency</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.healthyRelays}</div>
                <div className="text-sm text-muted-foreground">Healthy Relays</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.totalRelays}</div>
                <div className="text-sm text-muted-foreground">Total Relays</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No performance data available yet</p>
              <p className="text-sm mt-1">Data will appear as you use the relays</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Routing Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Zap className="h-5 w-5" />
              Feed Optimization
            </CardTitle>
            <CardDescription>
              Fast relays used for main feed loading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Feed Relays</span>
                <Badge variant="outline">{feedRelays.length} relays</Badge>
              </div>
              <div className="space-y-2">
                {feedRelays.slice(0, 3).map((url) => {
                  const relay = relayPerformance.find(r => r.url === url);
                  return (
                    <div key={url} className="flex items-center justify-between text-sm">
                      <span className="font-mono truncate flex-1">
                        {new URL(url).hostname}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {relay && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(relay.score)}
                            </Badge>
                            {relay.latency && (
                              <span className={`text-xs ${getLatencyColor(relay.latency || 0)}`}>
                                {relay.latency}ms
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Optimized for speed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Shield className="h-5 w-5" />
              Publishing Reach
            </CardTitle>
            <CardDescription>
              Relays used for publishing your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Write Relays</span>
                <Badge variant="outline">{publishRelays.length} relays</Badge>
              </div>
              <div className="space-y-2">
                {publishRelays.slice(0, 3).map((url) => {
                  const relay = relayPerformance.find(r => r.url === url);
                  return (
                    <div key={url} className="flex items-center justify-between text-sm">
                      <span className="font-mono truncate flex-1">
                        {new URL(url).hostname}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {relay && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {relay.reliabilityScore || 50}%
                            </Badge>
                            {relay.latency && (
                              <span className={`text-xs ${getLatencyColor(relay.latency || 0)}`}>
                                {relay.latency}ms
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Maximum reach</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      {relayPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Detailed Performance Metrics
            </CardTitle>
            <CardDescription>
              Performance scores and routing decisions for all relays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relayPerformance.map((relay) => (
                <div key={relay.url} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{relay.name || new URL(relay.url).hostname}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{relay.url}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className={`text-sm font-semibold ${getPerformanceColor(relay.score)}`}>
                        {Math.round(relay.score)}
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    {relay.reliabilityScore && (
                      <div className="text-center">
                        <div className={`text-sm font-semibold ${getPerformanceColor(relay.reliabilityScore)}`}>
                          {relay.reliabilityScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Reliability</div>
                      </div>
                    )}
                    {relay.latency && (
                      <div className="text-center">
                        <div className={`text-sm font-semibold ${getLatencyColor(relay.latency)}`}>
                          {relay.latency}ms
                        </div>
                        <div className="text-xs text-muted-foreground">Latency</div>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {relay.priority || 'auto'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">💡 Performance Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300">
          <ul className="space-y-2">
            <li>• <strong>Primary relays</strong> handle your main feed - keep these fast and reliable</li>
            <li>• <strong>Discovery relays</strong> find new content - can be slower but should be comprehensive</li>
            <li>• <strong>Backup relays</strong> provide redundancy - only used when primary relays fail</li>
            <li>• Smart routing automatically uses the best relay for each type of query</li>
            <li>• Performance data improves over time as the system learns your relay patterns</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}