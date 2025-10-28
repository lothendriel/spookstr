import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useUserRelays, createRelayListEvent } from '@/hooks/useUserRelays';
import { useRelayHealth } from '@/hooks/useRelayHealth';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { RelayConfig, RelayMode } from '@/contexts/AppContext';
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
import { Trash2, Plus, Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpookstrHeader } from '@/components/SpookstrHeader';

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

  // Initialize local state from config or NIP-65
  useEffect(() => {
    if (config.relays && config.relays.length > 0) {
      setLocalRelays(config.relays);
    } else if (nip65Relays && nip65Relays.length > 0) {
      setLocalRelays(nip65Relays);
    } else {
      // Default relays for Spookstr - prioritize Spookstr relay
      setLocalRelays([
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
      ]);
    }
  }, [config.relays, config.relayUrl, nip65Relays]);

  // Monitor relay health (only checks once per relay)
  const healthStatus = useRelayHealth(localRelays);

  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.includes('://')) return trimmed;
    return `wss://${trimmed}`;
  };

  const isValidRelayUrl = (url: string): boolean => {
    try {
      const normalized = normalizeRelayUrl(url);
      if (!normalized) return false;
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddRelay = () => {
    if (!isValidRelayUrl(newRelayUrl)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid WebSocket URL',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUrl = normalizeRelayUrl(newRelayUrl);

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
        mode: newRelayMode,
      },
    ]);

    setNewRelayUrl('');
    setNewRelayMode('both');
    setHasChanges(true);
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

  const handleSaveLocal = () => {
    updateConfig((current) => ({
      ...current,
      relays: localRelays,
      // Keep relayUrl for backward compatibility with first relay
      relayUrl: localRelays[0]?.url || current.relayUrl,
    }));

    setHasChanges(false);

    toast({
      title: 'Relays saved locally',
      description: 'Your relay configuration has been saved to this browser',
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

    const event = createRelayListEvent(localRelays);

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

  const content = (
    <div className="container max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relay Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Nostr relay connections. Choose which relays to read from and write to.
        </p>
      </div>

      {/* NIP-65 Info */}
      {user && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Your relay list can be synced across all Nostr clients using NIP-65.
            {nip65Relays && nip65Relays.length > 0 && (
              <span className="block mt-2">
                Found {nip65Relays.length} relays in your published relay list.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

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
            Your Relays ({localRelays.length})
          </CardTitle>
          <CardDescription>
            Manage your relay connections and monitor their health status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localRelays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No relays configured</p>
              <p className="text-sm mt-1">Add a relay to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localRelays.map((relay) => {
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
                      </div>
                    </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={relay.mode}
                      onValueChange={(value) => handleUpdateRelayMode(relay.url, value as RelayMode)}
                    >
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">
                          <Badge variant="outline" className={getModeColor('both')}>
                            Read & Write
                          </Badge>
                        </SelectItem>
                        <SelectItem value="read">
                          <Badge variant="outline" className={getModeColor('read')}>
                            Read Only
                          </Badge>
                        </SelectItem>
                        <SelectItem value="write">
                          <Badge variant="outline" className={getModeColor('write')}>
                            Write Only
                          </Badge>
                        </SelectItem>
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
              );
              })}
            </div>
          )}
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
          <CardTitle className="text-lg">About Relay Modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-emerald-700">Read & Write:</strong> Use this relay for both fetching and publishing events.
          </p>
          <p>
            <strong className="text-blue-700">Read Only:</strong> Only fetch events from this relay. Useful for public indexers.
          </p>
          <p>
            <strong className="text-purple-700">Write Only:</strong> Only publish your events to this relay. Useful for personal relays.
          </p>
          <p className="pt-2 text-xs">
            Tip: Keep your relay list small (2-4 relays) for best performance and discoverability.
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
