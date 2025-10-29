import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useUserRelays, createRelayListEvent } from '@/hooks/useUserRelays';
import { useRelayHealth } from '@/hooks/useRelayHealth';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { RelayConfig, RelayMode, RelayPriority } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw, Save, Download, Star } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { RelayDiscoverySection } from '@/components/RelayDiscoverySection';
import { RelayPerformanceDashboard } from '@/components/RelayPerformanceDashboard';

// Official Spookstr relay
const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

export default function RelaySettings() {
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();
  const { data: nip65Relays, isLoading: isLoadingNip65 } = useUserRelays(user?.pubkey);
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

  // Local state for relay configuration
  const [localRelays, setLocalRelays] = useState<RelayConfig[]>([]);
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [newRelayMode, setNewRelayMode] = useState<RelayMode>('both');
  const [hasChanges, setHasChanges] = useState(false);

  // Search relays state
  const [localSearchRelays, setLocalSearchRelays] = useState<string[]>([]);
  const [newSearchRelay, setNewSearchRelay] = useState('');

  // Blossom servers state
  const [localBlossomServers, setLocalBlossomServers] = useState<string[]>([]);
  const [newBlossomServer, setNewBlossomServer] = useState('');

  // Initialize local state from config or NIP-65
  useEffect(() => {
    // Always initialize with defaults first
    const defaults: RelayConfig[] = [
      {
        url: 'wss://spookstr2.nostr1.com',
        mode: 'both',
        name: 'Spookstr2',
      },
      {
        url: 'wss://relay.primal.net',
        mode: 'both',
        name: 'Primal',
      },
      {
        url: 'wss://relay.nostr.band',
        mode: 'both',
        name: 'Nostr.Band',
      },
    ];

    if (config.relays && config.relays.length > 0) {
      setLocalRelays(config.relays);
    } else if (nip65Relays && nip65Relays.length > 0) {
      setLocalRelays(nip65Relays);
    } else {
      setLocalRelays(defaults);
    }

    // Initialize search relays
    if (config.searchRelays && config.searchRelays.length > 0) {
      setLocalSearchRelays(config.searchRelays);
    } else {
      setLocalSearchRelays(['wss://relay.nostr.band', 'wss://relay.nos.social']);
    }

    // Initialize Blossom servers
    if (config.blossomServers && config.blossomServers.length > 0) {
      setLocalBlossomServers(config.blossomServers);
    } else {
      setLocalBlossomServers(['https://blossom.primal.net', 'https://cdn.satellite.earth']);
    }
  }, [config.relays, config.searchRelays, config.blossomServers, nip65Relays]);

  // Always include Spookstr relay in health monitoring
  const relaysToMonitor: RelayConfig[] = [
    { url: SPOOKSTR_RELAY, mode: 'both', name: 'Spookstr2' },
    ...localRelays,
  ];

  // Monitor relay health (only checks once per relay)
  const healthStatus = useRelayHealth(relaysToMonitor);

  const normalizeRelayUrl = (url: string): string => {
    // Handle case where url might be an event object or non-string
    const urlString = typeof url === 'string' ? url : String(url);
    const trimmed = urlString.trim();
    if (!trimmed) return '';

    // If it already has a protocol, use it as-is
    if (trimmed.includes('://')) {
      return trimmed;
    }

    // Default to wss:// for relay URLs
    return `wss://${trimmed}`;
  };

  const isValidRelayUrl = (url: string): boolean => {
    try {
      // Handle case where url might be an event object or non-string
      const urlString = typeof url === 'string' ? url : String(url);
      const trimmed = urlString.trim();

      if (!trimmed) {
        return false;
      }

      // Allow common relay URL patterns
      const normalized = normalizeRelayUrl(trimmed);
      const urlObj = new URL(normalized);

      // Must be wss:// or ws:// protocol
      if (!['wss:', 'ws:'].includes(urlObj.protocol)) {
        return false;
      }

      // Must have a hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.log('[RelaySettings] URL validation failed for:', typeof url, url);
      return false;
    }
  };

  const handleAddRelay = (url?: string, mode?: RelayMode) => {
    const urlToAdd = url || newRelayUrl;
    const modeToUse = mode || newRelayMode;

    console.log('[handleAddRelay] Called with:', { url, mode, urlToAdd, modeToUse, typeof_url: typeof url });

    if (!isValidRelayUrl(urlToAdd)) {
      console.log('[handleAddRelay] Validation failed for:', urlToAdd);
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid WebSocket URL (e.g., wss://relay.example.com or relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUrl = normalizeRelayUrl(urlToAdd);

    // Check for duplicates
    if (localRelays.some((r) => r.url === normalizedUrl)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list',
        variant: 'destructive',
      });
      return;
    }

    setLocalRelays([
      ...localRelays,
      {
        url: normalizedUrl,
        mode: modeToUse,
      },
    ]);

    // Only clear form if using the manual form (no url parameter)
    if (!url) {
      setNewRelayUrl('');
      setNewRelayMode('both');
    }
    setHasChanges(true);

    toast({
      title: 'Relay added',
      description: `Added ${new URL(normalizedUrl).hostname} in ${modeToUse} mode`,
    });
  };

  const handleRemoveRelay = (url: string) => {
    setLocalRelays(localRelays.filter((r) => r.url !== url));
    setHasChanges(true);
  };

  const handleUpdateRelayMode = (url: string, mode: RelayMode) => {
    setLocalRelays(
      localRelays.map((r) => (r.url === url ? { ...r, mode } : r))
    );
    setHasChanges(true);
  };

  const handleUpdateRelayPriority = (url: string, priority: RelayPriority) => {
    setLocalRelays(
      localRelays.map((r) => (r.url === url ? { ...r, priority } : r))
    );
    setHasChanges(true);
  };

  const handleSaveLocal = () => {
    // Always ensure Spookstr relay is included
    const relaysToSave = [...localRelays];
    if (!relaysToSave.some(r => r.url === SPOOKSTR_RELAY)) {
      relaysToSave.unshift({
        url: SPOOKSTR_RELAY,
        mode: 'both',
        name: 'Spookstr2',
      });
    }

    updateConfig((current) => ({
      ...current,
      relays: relaysToSave,
      // Keep relayUrl for backward compatibility with first relay
      relayUrl: relaysToSave[0]?.url || current.relayUrl,
      searchRelays: localSearchRelays,
      blossomServers: localBlossomServers,
    }));

    setHasChanges(false);

    toast({
      title: 'Configuration saved',
      description: 'Your relay and server settings have been saved to this browser',
    });
  };

  const handlePublishToNostr = () => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to publish your relay list',
        variant: 'destructive',
      });
      return;
    }

    // Always ensure Spookstr relay is included in published list
    const relaysToPublish = [...localRelays];
    if (!relaysToPublish.some(r => r.url === SPOOKSTR_RELAY)) {
      relaysToPublish.unshift({
        url: SPOOKSTR_RELAY,
        mode: 'both',
        name: 'Spookstr2',
      });
    }

    const event = createRelayListEvent(relaysToPublish);

    publishEvent(event, {
      onSuccess: () => {
        toast({
          title: 'Relay list published',
          description: 'Your relay configuration has been published to Nostr (NIP-65)',
        });
      },
      onError: (error) => {
        toast({
          title: 'Failed to publish',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      },
    });
  };

  const handleLoadFromNostr = () => {
    if (!nip65Relays || nip65Relays.length === 0) {
      toast({
        title: 'No relay list found',
        description: 'You have not published a relay list to Nostr yet',
        variant: 'destructive',
      });
      return;
    }

    setLocalRelays(nip65Relays);
    setHasChanges(true);

    toast({
      title: 'Relay list loaded',
      description: `Loaded ${nip65Relays.length} relays from your Nostr profile`,
    });
  };

  const handleAddSearchRelay = () => {
    if (!isValidRelayUrl(newSearchRelay)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid WebSocket URL (e.g., wss://relay.example.com or relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUrl = normalizeRelayUrl(newSearchRelay);

    if (localSearchRelays.includes(normalizedUrl)) {
      toast({
        title: 'Relay already exists',
        description: 'This search relay is already in your list',
        variant: 'destructive',
      });
      return;
    }

    setLocalSearchRelays([...localSearchRelays, normalizedUrl]);
    setNewSearchRelay('');
    setHasChanges(true);
  };

  const handleRemoveSearchRelay = (url: string) => {
    setLocalSearchRelays(localSearchRelays.filter((r) => r !== url));
    setHasChanges(true);
  };

  const handleAddBlossomServer = () => {
    const trimmed = newBlossomServer.trim();
    if (!trimmed) {
      toast({
        title: 'Invalid server URL',
        description: 'Please enter a valid HTTPS URL',
        variant: 'destructive',
      });
      return;
    }

    let normalizedUrl = trimmed;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      normalizedUrl = `https://${trimmed}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      toast({
        title: 'Invalid server URL',
        description: 'Please enter a valid HTTPS URL',
        variant: 'destructive',
      });
      return;
    }

    if (localBlossomServers.includes(normalizedUrl)) {
      toast({
        title: 'Server already exists',
        description: 'This Blossom server is already in your list',
        variant: 'destructive',
      });
      return;
    }

    setLocalBlossomServers([...localBlossomServers, normalizedUrl]);
    setNewBlossomServer('');
    setHasChanges(true);
  };

  const handleRemoveBlossomServer = (url: string) => {
    setLocalBlossomServers(localBlossomServers.filter((s) => s !== url));
    setHasChanges(true);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Connecting</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Disconnected</Badge>;
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

  const getPriorityColor = (priority?: RelayPriority) => {
    switch (priority) {
      case 'primary':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'discovery':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'backup':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getPriorityDescription = (priority?: RelayPriority) => {
    switch (priority) {
      case 'primary':
        return 'Fast feed loading';
      case 'discovery':
        return 'Content discovery only';
      case 'backup':
        return 'Fallback connection';
      default:
        return 'Auto-assigned priority';
    }
  };

  const content = (
    <div className="container max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relay Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Nostr relay connections. Choose which relays to read from and write to.
        </p>
      </div>

      {/* Performance Dashboard */}
      <RelayPerformanceDashboard />

      {/* Relay Discovery Section - only show for logged in users */}
      {user && (
        <RelayDiscoverySection
          onAddRelay={handleAddRelay}
          onRemoveRelay={handleRemoveRelay}
          onChangeMode={handleUpdateRelayMode}
        />
      )}

      {/* NIP-65 Info */}
      {user && (
        <Alert className="border-lime-500/30 bg-lime-500/5">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Your relay list can be synced across all Nostr clients using NIP-65 (Inbox/Outbox Model).</p>
              {nip65Relays && nip65Relays.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    ✅ Found {nip65Relays.length} relays in your published relay list:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>
                      📤 <strong>Write:</strong> {nip65Relays.filter(r => r.mode === 'write' || r.mode === 'both').length} relays
                      <span className="text-muted-foreground ml-1">(where your posts are published)</span>
                    </li>
                    <li>
                      📥 <strong>Read:</strong> {nip65Relays.filter(r => r.mode === 'read' || r.mode === 'both').length} relays
                      <span className="text-muted-foreground ml-1">(where you receive mentions)</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm">
                  💡 Publish your relay list to help other Nostr clients find your content and send you notifications.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Spookstr Default Relay */}
      <Card className="border-lime-500/30 bg-lime-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lime-400">
            <Star className="h-5 w-5 fill-lime-400" />
            Spookstr Network Relay
          </CardTitle>
          <CardDescription>
            Official relay for the Spookstr paranormal community - always connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border border-lime-500/20 rounded-lg bg-background/50">
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusIcon(healthStatus[SPOOKSTR_RELAY]?.status)}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-mono text-sm font-medium">
                {SPOOKSTR_RELAY.replace(/^wss?:\/\//, '')}
              </div>
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(healthStatus[SPOOKSTR_RELAY]?.status)}
                {healthStatus[SPOOKSTR_RELAY]?.error && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {healthStatus[SPOOKSTR_RELAY].error}
                  </Badge>
                )}
                {healthStatus[SPOOKSTR_RELAY]?.latency && (
                  <Badge variant="outline" className="text-xs">
                    {healthStatus[SPOOKSTR_RELAY].latency}ms
                  </Badge>
                )}
                <Badge className="bg-lime-500 text-black">
                  Default
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Read & Write
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Relay */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Relay</CardTitle>
          <CardDescription>
            Enter a WebSocket URL (e.g., wss://relay.example.com)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="relay-url">Relay URL</Label>
              <Input
                id="relay-url"
                placeholder="wss://relay.example.com"
                value={newRelayUrl}
                onChange={(e) => setNewRelayUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddRelay();
                  }
                }}
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label htmlFor="relay-mode">Mode</Label>
              <Select value={newRelayMode} onValueChange={(value) => setNewRelayMode(value as RelayMode)}>
                <SelectTrigger id="relay-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Read & Write</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="write">Write Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddRelay} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Relay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relay List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Additional Relays ({localRelays.filter(r => r.url !== SPOOKSTR_RELAY).length})
          </CardTitle>
          <CardDescription>
            Add more relays to expand your reach across the Nostr network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localRelays.filter(r => r.url !== SPOOKSTR_RELAY).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No relays configured</p>
              <p className="text-sm mt-1">Add a relay to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localRelays.filter(r => r.url !== SPOOKSTR_RELAY).map((relay) => {
                const health = healthStatus[relay.url];
                return (
                  <div
                    key={relay.url}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(health?.status)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-mono text-sm truncate">
                        {relay.url.replace(/^wss?:\/\//, '')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(health?.status)}
                        {health?.error && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {health.error}
                          </Badge>
                        )}
                        {health?.latency && (
                          <Badge variant="outline" className="text-xs">
                            {health.latency}ms
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(relay.priority)}`}
                          title={getPriorityDescription(relay.priority)}
                        >
                          {relay.priority || 'auto'}
                        </Badge>
                      </div>
                    </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex gap-2 w-full">
                      <Select
                        value={relay.mode}
                        onValueChange={(value) => handleUpdateRelayMode(relay.url, value as RelayMode)}
                      >
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Read & Write</SelectItem>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Write Only</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={relay.priority || 'primary'}
                        onValueChange={(value) => handleUpdateRelayPriority(relay.url, value as RelayPriority)}
                      >
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="discovery">Discovery</SelectItem>
                          <SelectItem value="backup">Backup</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRelay(relay.url)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Relays Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Search Relays ({localSearchRelays.length})
          </CardTitle>
          <CardDescription>
            Specialized relays for content discovery, hashtags, and advanced search queries. These relays maintain indexes for faster searching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Search Relay */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search-relay-url">Search Relay URL</Label>
              <Input
                id="search-relay-url"
                placeholder="wss://relay.nostr.band"
                value={newSearchRelay}
                onChange={(e) => setNewSearchRelay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSearchRelay();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddSearchRelay} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Search Relay
              </Button>
            </div>
          </div>

          {/* Search Relay List */}
          {localSearchRelays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <p>No search relays configured</p>
              <p className="text-sm mt-1">Add a search relay for better content discovery</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localSearchRelays.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="font-mono text-sm truncate flex-1">
                    {url.replace(/^wss?:\/\//, '')}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSearchRelay(url)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blossom Servers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌸 Blossom Servers ({localBlossomServers.length})
          </CardTitle>
          <CardDescription>
            File hosting servers for uploading images, videos, and audio. Multiple servers provide redundancy and fallback options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Blossom Server */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="blossom-server-url">Blossom Server URL</Label>
              <Input
                id="blossom-server-url"
                placeholder="https://blossom.primal.net"
                value={newBlossomServer}
                onChange={(e) => setNewBlossomServer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBlossomServer();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddBlossomServer} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </div>

          {/* Blossom Server List */}
          {localBlossomServers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <p>No Blossom servers configured</p>
              <p className="text-sm mt-1">Add a server to enable file uploads</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localBlossomServers.map((url, index) => (
                <div
                  key={url}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs">
                      {index === 0 ? 'Primary' : `Fallback ${index}`}
                    </Badge>
                    <div className="font-mono text-sm truncate">
                      {url.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlossomServer(url)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Alert className="mt-4 border-blue-500/30 bg-blue-500/5">
            <AlertDescription className="text-sm">
              💡 Servers are tried in order. If the primary server fails, the uploader will automatically try the next server.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSaveLocal}
          disabled={!hasChanges}
          className="flex-1"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Locally
        </Button>

        {user && (
          <>
            <Button
              onClick={handleLoadFromNostr}
              variant="outline"
              disabled={isLoadingNip65 || !nip65Relays || nip65Relays.length === 0}
              className="flex-1"
              size="lg"
            >
              {isLoadingNip65 ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Load from Nostr
            </Button>

            <Button
              onClick={handlePublishToNostr}
              variant="outline"
              disabled={isPublishing || localRelays.length === 0}
              className="flex-1"
              size="lg"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Publish to Nostr
            </Button>
          </>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Configuration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-2">General Relay Modes</p>
            <div className="space-y-1">
              <p>
                <strong className="text-emerald-700">Read & Write:</strong> Use this relay for both fetching and publishing events.
              </p>
              <p>
                <strong className="text-blue-700">Read Only:</strong> Only fetch events from this relay. Useful for public indexers.
              </p>
              <p>
                <strong className="text-purple-700">Write Only:</strong> Only publish your events to this relay. Useful for personal relays.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-lime-500/20">
            <p className="font-semibold text-lime-400 mb-2">📥 Inbox/Outbox Model (NIP-65)</p>
            <p className="text-xs mb-2">
              Spookstr uses the inbox/outbox model for better content discovery:
            </p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li><strong>Write relays:</strong> Where you publish your content. Others query these to find your posts.</li>
              <li><strong>Read relays:</strong> Where you check for mentions and notifications. Others send there when tagging you.</li>
              <li><strong>Profile pages:</strong> Query the user's write relays to find their content.</li>
              <li><strong>Notifications:</strong> Query your read relays to find mentions of you.</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-lime-500/20">
            <p className="font-semibold text-green-600 mb-2">⚡ Smart Relay Priorities</p>
            <p className="text-xs mb-2">
              Spookstr automatically optimizes performance by routing different queries to appropriate relays:
            </p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li><strong className="text-green-700">Primary:</strong> Fast, reliable relays used for main feed loading (max 3 used).</li>
              <li><strong className="text-blue-700">Discovery:</strong> Used for profiles, interactions, and content discovery.</li>
              <li><strong className="text-gray-700">Backup:</strong> Fallback relays used only when primary relays fail.</li>
            </ul>
            <p className="text-xs mt-2 text-muted-foreground">
              💡 Feed performance is optimized by using only your fastest primary relays, while discovery uses all available relays for comprehensive coverage.
            </p>
          </div>

          <div className="pt-2 border-t border-lime-500/20">
            <p className="font-semibold text-foreground mb-2">🔍 Search Relays</p>
            <p className="text-xs">
              Search relays maintain specialized indexes for fast content discovery. They excel at hashtag searches,
              keyword queries, and finding historical content across the network. Using dedicated search relays improves
              performance and reduces load on your general relays.
            </p>
          </div>

          <div className="pt-2 border-t border-lime-500/20">
            <p className="font-semibold text-foreground mb-2">🌸 Blossom Servers</p>
            <p className="text-xs mb-2">
              Blossom servers store your uploaded files (images, videos, audio). Configure multiple servers for redundancy:
            </p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>The uploader tries servers in order until one succeeds</li>
              <li>Popular servers may have rate limits or size restrictions</li>
              <li>Some servers are free, others may require payment</li>
              <li>Consider self-hosting for full control and privacy</li>
            </ul>
          </div>

          <p className="pt-2 text-xs border-t border-lime-500/20">
            💡 Tip: Keep your relay list small (2-4 general relays) for best performance. Use 1-2 search relays and 2-3 Blossom servers for optimal redundancy.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SpookstrHeader />
      {content}
    </div>
  );
}
