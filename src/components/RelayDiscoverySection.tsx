import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  Plus,
  Users,
  Globe,
  TrendingUp,
  Eye,
  Zap
} from 'lucide-react';
import { useRelayDiscovery, type DiscoveredRelay } from '@/hooks/useRelayDiscovery';
import { RelayNetworkMap } from './RelayNetworkMap';
import { RelayPerformanceInsights } from './RelayPerformanceInsights';
import type { RelayMode } from '@/contexts/AppContext';

interface RelayDiscoverySectionProps {
  onAddRelay: (url: string, mode: RelayMode) => void;
  onRemoveRelay: (url: string) => void;
  onChangeMode: (url: string, mode: RelayMode) => void;
  className?: string;
}

export function RelayDiscoverySection({ 
  onAddRelay, 
  onRemoveRelay, 
  onChangeMode,
  className 
}: RelayDiscoverySectionProps) {
  const { discoveredRelays, insights, isLoading } = useRelayDiscovery();
  const [selectedTab, setSelectedTab] = useState('overview');

  const handleAddRelay = (relay: DiscoveredRelay) => {
    onAddRelay(relay.url, relay.suggestedMode);
  };

  const getHealthIcon = (status?: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHealthBadge = (status?: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Connecting</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>;
    }
  };

  const getModeColor = (mode: RelayMode) => {
    switch (mode) {
      case 'read':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'write':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'both':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Discovering Network Relays
          </CardTitle>
          <CardDescription>
            Analyzing your social graph to find optimal relay connections...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Analyzing your network...</p>
                <p className="text-xs text-muted-foreground">
                  This may take a few moments to query relay lists from your contacts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || discoveredRelays.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Relay Discovery
          </CardTitle>
          <CardDescription>
            No relay discovery data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to discover relays from your network. This could be because:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>You're not following anyone yet</li>
                <li>Your contacts haven't published relay lists (NIP-65)</li>
                <li>The relay discovery service is temporarily unavailable</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const topRelays = discoveredRelays
    .filter(r => !r.isAlreadyAdded && r.score > 0)
    .slice(0, 10);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with quick stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Relay Discovery
          </CardTitle>
          <CardDescription>
            Intelligent relay recommendations based on your social graph and network analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.totalDiscovered}</div>
              <div className="text-sm text-muted-foreground">Relays Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{insights.contentCoverage.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{insights.publishingReach.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Reach</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{topRelays.length}</div>
              <div className="text-sm text-muted-foreground">Suggestions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Network Map
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>
                  Top recommendations to improve your network coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.suggestedActions.slice(0, 3).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {action.type === 'add_relay' && 'Add '}{new URL(action.relay).hostname}
                        </p>
                        <p className="text-xs text-muted-foreground">{action.reason}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {action.impact}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (action.type === 'add_relay') {
                            const relay = discoveredRelays.find(r => r.url === action.relay);
                            if (relay) handleAddRelay(relay);
                          }
                        }}
                      >
                        {action.type === 'add_relay' ? 'Add' : 'Fix'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Network Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Health</CardTitle>
                <CardDescription>
                  Current status of your relay network performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Content Discovery</span>
                    <span className="font-medium">{insights.contentCoverage.toFixed(0)}%</span>
                  </div>
                  <Progress value={insights.contentCoverage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Publishing Reach</span>
                    <span className="font-medium">{insights.publishingReach.toFixed(0)}%</span>
                  </div>
                  <Progress value={insights.publishingReach} className="h-2" />
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {insights.missingContacts} contacts with unknown relay preferences
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Suggested Relays ({topRelays.length})
              </CardTitle>
              <CardDescription>
                Relays ranked by potential value to your network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topRelays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No relay suggestions available</p>
                  <p className="text-sm mt-1">Your current configuration appears optimal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topRelays.map((relay) => (
                    <div
                      key={relay.url}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getHealthIcon(relay.health?.status)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium text-sm">
                          {relay.name || new URL(relay.url).hostname}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          {relay.url}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getHealthBadge(relay.health?.status)}
                          {relay.health?.latency && (
                            <Badge variant="outline" className="text-xs">
                              {relay.health.latency}ms
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Score: {relay.score.toFixed(0)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{relay.contactCount}</span>
                          <span className="text-muted-foreground">contacts</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Badge variant="outline" className={getModeColor(relay.suggestedMode)}>
                            {relay.suggestedMode}
                          </Badge>
                          <Button
                            onClick={() => handleAddRelay(relay)}
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <RelayNetworkMap
            insights={insights}
            onAddRelay={handleAddRelay}
            onRemoveRelay={onRemoveRelay}
          />
        </TabsContent>

        <TabsContent value="insights">
          <RelayPerformanceInsights
            insights={insights}
            onAddRelay={handleAddRelay}
            onRemoveRelay={onRemoveRelay}
            onChangeMode={onChangeMode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}