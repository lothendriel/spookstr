import { useState, useEffect } from 'react';
import { useRelayDiscovery, type DiscoveredRelay } from '@/hooks/useRelayDiscovery';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  Search,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  TrendingUp,
  Clock,
  Wifi,
  WifiOff,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RelayMode } from '@/contexts/AppContext';

interface RelayDiscoveryPanelProps {
  className?: string;
}

export function RelayDiscoveryPanel({ className }: RelayDiscoveryPanelProps) {
  const { user } = useCurrentUser();
  const { updateConfig } = useAppContext();
  const { toast } = useToast();
  const {
    discoveryState,
    discoverRelays,
    isDiscovering,
    connectTemporarily,
    isConnecting,
    clearCache,
  } = useRelayDiscovery();

  const [isFromCache, setIsFromCache] = useState(false);

  // Check if results are from cache on mount
  useEffect(() => {
    if (discoveryState.discoveredRelays.length > 0 && !isDiscovering) {
      setIsFromCache(true);
    }
  }, [discoveryState.discoveredRelays.length, isDiscovering]);

  const [selectedRelays, setSelectedRelays] = useState<Set<string>>(new Set());
  const [showConnectivityTest, setShowConnectivityTest] = useState(false);

  const handleDiscover = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to discover relays',
        variant: 'destructive',
      });
      return;
    }

    setIsFromCache(false);

    try {
      await discoverRelays();
      toast({
        title: 'Discovery complete',
        description: `Found ${discoveryState.stats.totalDiscovered} potential relays`,
      });
    } catch (error) {
      toast({
        title: 'Discovery failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to discover relays',
        variant: 'destructive',
      });
      return;
    }

    clearCache();
    setIsFromCache(false);

    try {
      await discoverRelays();
      toast({
        title: 'Discovery refreshed',
        description: `Found ${discoveryState.stats.totalDiscovered} potential relays`,
      });
    } catch (error) {
      toast({
        title: 'Discovery failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleAddRelay = (relay: DiscoveredRelay, mode: RelayMode = 'both') => {
    updateConfig(current => ({
      ...current,
      relays: [
        ...(current.relays || []),
        {
          url: relay.url,
          mode,
          name: relay.name || relay.url.replace(/^wss?:\/\//, ''),
        },
      ],
    }));

    toast({
      title: 'Relay added',
      description: `Added ${relay.url.replace(/^wss?:\/\//, '')} to your relay list`,
    });
  };

  const handleConnectTemporarily = async () => {
    const relaysToConnect = Array.from(selectedRelays);
    if (relaysToConnect.length === 0) {
      toast({
        title: 'No relays selected',
        description: 'Select relays to connect to temporarily',
        variant: 'destructive',
      });
      return;
    }

    try {
      const events = await connectTemporarily(relaysToConnect);
      toast({
        title: 'Temporary connection successful',
        description: `Connected to ${relaysToConnect.length} relays and found ${events.length} additional events`,
      });
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getSourceIcon = (source: DiscoveredRelay['source']) => {
    switch (source) {
      case 'nip02-contact':
        return <Users className="h-4 w-4" />;
      case 'nip65-outbox':
        return <TrendingUp className="h-4 w-4" />;
      case 'event-hint':
        return <Zap className="h-4 w-4" />;
      case 'recent-note':
        return <Clock className="h-4 w-4" />;
      case 'mutual-contact':
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: DiscoveredRelay['source']) => {
    switch (source) {
      case 'nip02-contact':
        return 'Contact Relay';
      case 'nip65-outbox':
        return 'Outbox Model';
      case 'event-hint':
        return 'Event Hint';
      case 'recent-note':
        return 'Recent Note';
      case 'mutual-contact':
        return 'Mutual Contact';
      default:
        return 'Unknown';
    }
  };

  const getSourceColor = (source: DiscoveredRelay['source']) => {
    switch (source) {
      case 'nip02-contact':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'nip65-outbox':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'event-hint':
        return 'bg-lime-50 text-lime-700 border-lime-200';
      case 'recent-note':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mutual-contact':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (!user) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-4">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Relay Discovery</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Log in to discover relevant relays based on your network and activity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-lime-400" />
            Smart Relay Discovery
            {isFromCache && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Cached
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Automatically discover relevant relays based on your contacts, recent activity, and the broader Nostr network.
            This helps you find content you might be missing and connect to relays used by your social circle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={discoveryState.discoveredRelays.length > 0 ? handleRefresh : handleDiscover}
              disabled={isDiscovering}
              className="flex-1"
              size="lg"
            >
              {isDiscovering ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : discoveryState.discoveredRelays.length > 0 ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isDiscovering ? 'Discovering...' :
               discoveryState.discoveredRelays.length > 0 ? 'Refresh Results' : 'Start Discovery'}
            </Button>

            {discoveryState.discoveredRelays.length > 0 && (
              <Button
                onClick={handleRefresh}
                disabled={isDiscovering}
                variant="outline"
                className="flex-1 sm:flex-initial"
                size="lg"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear & Rediscover
              </Button>
            )}

            {selectedRelays.size > 0 && (
              <Button
                onClick={handleConnectTemporarily}
                disabled={isConnecting}
                variant="outline"
                className="flex-1 sm:flex-initial"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview ({selectedRelays.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discovery Progress */}
      {isDiscovering && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Discovering relays...</div>
                  <div className="text-sm text-muted-foreground">
                    Analyzing your network and activity patterns
                  </div>
                </div>
                <div className="text-right text-sm font-mono">
                  {Math.round(discoveryState.stats.discoveryProgress)}%
                </div>
              </div>

              <Progress value={discoveryState.stats.discoveryProgress} className="h-2" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{discoveryState.stats.contactsAnalyzed}</div>
                  <div className="text-muted-foreground">Contacts</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{discoveryState.stats.eventsScanned}</div>
                  <div className="text-muted-foreground">Events</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{discoveryState.stats.hintsFound}</div>
                  <div className="text-muted-foreground">Hints</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{discoveryState.stats.totalDiscovered}</div>
                  <div className="text-muted-foreground">Found</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {discoveryState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Discovery failed: {discoveryState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {discoveryState.discoveredRelays.length > 0 && (
        <Tabs defaultValue="relays" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="relays" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Discovered Relays ({discoveryState.discoveredRelays.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="relays" className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-lime-400">{discoveryState.stats.totalDiscovered}</div>
                    <div className="text-xs text-muted-foreground">Total Found</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{discoveryState.stats.reachableCount}</div>
                    <div className="text-xs text-muted-foreground">Reachable</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">{discoveryState.stats.unreachableCount}</div>
                    <div className="text-xs text-muted-foreground">Unreachable</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{selectedRelays.size}</div>
                    <div className="text-xs text-muted-foreground">Selected</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relay List */}
            <div className="space-y-3">
              {discoveryState.discoveredRelays.map((relay) => (
                <Card key={relay.url} className="border transition-colors hover:border-lime-500/30">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Checkbox and Status */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRelays.has(relay.url)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedRelays);
                            if (e.target.checked) {
                              newSelected.add(relay.url);
                            } else {
                              newSelected.delete(relay.url);
                            }
                            setSelectedRelays(newSelected);
                          }}
                          className="h-4 w-4 text-lime-600 focus:ring-lime-500 border-gray-300 rounded"
                        />

                        {relay.isReachable === true ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : relay.isReachable === false ? (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Relay Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-mono text-sm font-medium truncate">
                          {relay.name || relay.url.replace(/^wss?:\/\//, '')}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={getSourceColor(relay.source)}>
                            {getSourceIcon(relay.source)}
                            <span className="ml-1">{getSourceLabel(relay.source)}</span>
                          </Badge>

                          {relay.contactCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {relay.contactCount} contact{relay.contactCount === 1 ? '' : 's'}
                            </Badge>
                          )}

                          {relay.latency && (
                            <Badge variant="outline" className="text-xs">
                              {relay.latency}ms
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-xs">
                            Score: {relay.score}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddRelay(relay, 'both')}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Additional Details */}
                    {(relay.mutualContacts?.length || relay.lastSeen) && (
                      <div className="mt-3 pt-3 border-t border-muted text-xs text-muted-foreground">
                        {relay.mutualContacts && relay.mutualContacts.length > 0 && (
                          <div>
                            Used by {relay.mutualContacts.length} of your contacts
                          </div>
                        )}
                        {relay.lastSeen && (
                          <div>
                            Last seen: {new Date(relay.lastSeen).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedRelays.size > 0 && (
              <Card className="border-lime-500/30 bg-lime-500/5">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {selectedRelays.size} relay{selectedRelays.size === 1 ? '' : 's'} selected
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Preview content or add to your configuration
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleConnectTemporarily}
                        disabled={isConnecting}
                        variant="outline"
                      >
                        {isConnecting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        Preview Content
                      </Button>

                      <Button
                        onClick={() => {
                          selectedRelays.forEach(url => {
                            const relay = discoveryState.discoveredRelays.find(r => r.url === url);
                            if (relay) handleAddRelay(relay);
                          });
                          setSelectedRelays(new Set());
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Discovery Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['nip65-outbox', 'event-hint', 'nip02-contact', 'recent-note'].map(source => {
                      const count = discoveryState.discoveredRelays.filter(r => r.source === source).length;
                      const percentage = discoveryState.discoveredRelays.length > 0
                        ? Math.round((count / discoveryState.discoveredRelays.length) * 100)
                        : 0;

                      return (
                        <div key={source} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(source as any)}
                            <span className="text-sm">{getSourceLabel(source as any)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{count}</div>
                            <div className="text-xs text-muted-foreground">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Contacts analyzed:</span>
                      <span className="font-medium">{discoveryState.stats.contactsAnalyzed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Events scanned:</span>
                      <span className="font-medium">{discoveryState.stats.eventsScanned}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Relay hints found:</span>
                      <span className="font-medium">{discoveryState.stats.hintsFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connectivity tested:</span>
                      <span className="font-medium">
                        {discoveryState.stats.reachableCount + discoveryState.stats.unreachableCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="border-blue-500/30 bg-blue-500/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">How Discovery Works</p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Analyzes your contacts' relay preferences (NIP-65)</li>
                    <li>Extracts relay hints from recent events and interactions</li>
                    <li>Tests discovered relays for connectivity and performance</li>
                    <li>Ranks relays by relevance, usage, and reliability</li>
                    <li>Suggests high-quality relays used by your network</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!isDiscovering && !discoveryState.error && discoveryState.discoveredRelays.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <Search className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No relays discovered yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Start Discovery" to find relays relevant to your network
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Discovery results will be cached and persist across tab switches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}