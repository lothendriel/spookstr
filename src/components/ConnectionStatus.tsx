import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRelayHealthSimple } from '@/hooks/useRelayHealthSimple';
import { useWallet } from '@/hooks/useWallet';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import {
  Wifi,
  WifiOff,
  Zap,
  ZapOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export function ConnectionStatus() {
  const { relayHealth, checkAllRelays, getBestRelay } = useRelayHealthSimple();
  const { hasNWC, webln, isWebLNEnabled, walletError, enableWebLN } = useWallet();
  const { config, presetRelays } = useAppContext();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const currentRelay = config.relayUrl;
  const relayStatus = relayHealth.get(currentRelay);
  const bestRelay = getBestRelay();

  // Ensure we have valid relay status data
  const safeRelayStatus = relayStatus || {
    isConnected: undefined,
    latency: undefined,
    lastChecked: null,
    error: null,
  };

  // Initialize relay health checking on component mount
  useEffect(() => {
    if (!hasInitialized && presetRelays.length > 0) {
      const initializeRelays = async () => {
        setIsChecking(true);
        try {
          const allRelays = [
            { url: currentRelay, name: 'Current' },
            ...presetRelays.slice(0, 3)
          ];

          await checkAllRelays(allRelays);
          setHasInitialized(true);
        } catch (error) {
          console.error('Failed to initialize relay health:', error);
        } finally {
          setIsChecking(false);
        }
      };

      initializeRelays();
    }
  }, [hasInitialized, currentRelay, presetRelays, checkAllRelays]);

  const handleRefreshConnections = async () => {
    setIsChecking(true);
    try {
      const allRelays = [
        { url: currentRelay, name: 'Current' },
        ...presetRelays.slice(0, 3)
      ];

      await checkAllRelays(allRelays);

      // Check WebLN status
      if (webln && !isWebLNEnabled) {
        await enableWebLN();
      }

      toast({
        title: 'Connections refreshed',
        description: 'Connection status has been updated.',
      });
    } catch (error) {
      console.error('Failed to refresh connections:', error);
      toast({
        title: 'Refresh failed',
        description: 'Could not check connection status.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getRelayStatusIcon = (isConnected?: boolean, latency?: number | null) => {
    if (isConnected === undefined || isConnected === null) return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    if (!isConnected) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (latency === null || latency === undefined) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (latency < 500) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (latency < 1000) return <CheckCircle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-red-500" />;
  };

  const getLatencyColor = (latency?: number | null) => {
    if (latency === undefined || latency === null) return 'text-gray-500';
    if (latency < 500) return 'text-green-500';
    if (latency < 1000) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Connection Status</span>
          </span>
          <Button
            onClick={handleRefreshConnections}
            variant="outline"
            size="sm"
            disabled={isChecking}
            className="border-lime-500/50 text-lime-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Nostr Relay Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lime-300 flex items-center">
            <Wifi className="h-4 w-4 mr-2" />
            Nostr Relay
          </h3>

          {/* Current Relay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getRelayStatusIcon(safeRelayStatus.isConnected, safeRelayStatus.latency)}
                <span className="text-sm text-lime-100 font-medium">
                  {currentRelay.replace('wss://', '').replace('ws://', '')}
                </span>
                {currentRelay === bestRelay && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                    Best
                  </Badge>
                )}
              </div>
              <div className="text-xs">
                {safeRelayStatus.latency !== null && safeRelayStatus.latency !== undefined && (
                  <span className={getLatencyColor(safeRelayStatus.latency)}>
                    {safeRelayStatus.latency}ms
                  </span>
                )}
              </div>
            </div>

            {safeRelayStatus.error && (
              <div className="text-xs text-red-400 flex items-center space-x-1">
                <XCircle className="h-3 w-3" />
                <span>{safeRelayStatus.error}</span>
              </div>
            )}
          </div>

          {/* Alternative Relays */}
          <div className="space-y-1">
            {presetRelays.slice(0, 2).map((relay) => {
              const status = relayHealth.get(relay.url);
              return (
                <div key={relay.url} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {getRelayStatusIcon(status?.isConnected, status?.latency)}
                    <span className="text-lime-500/80">
                      {relay.name}
                    </span>
                    {relay.url === bestRelay && relay.url !== currentRelay && (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                        Better Available
                      </Badge>
                    )}
                  </div>
                  {status?.latency !== null && status?.latency !== undefined && (
                    <span className={getLatencyColor(status.latency)}>
                      {status.latency}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lightning Wallet Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lime-300 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Lightning Wallet
          </h3>

          {/* NWC Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasNWC ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-lime-100">Nostr Wallet Connect</span>
            </div>
            <Badge variant={hasNWC ? "default" : "secondary"} className={hasNWC ? "bg-green-500/20 text-green-400" : ""}>
              {hasNWC ? "Connected" : "Not Connected"}
            </Badge>
          </div>

          {/* WebLN Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {webln && isWebLNEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : webln ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-lime-100">WebLN Extension</span>
            </div>
            <Badge
              variant={webln && isWebLNEnabled ? "default" : "secondary"}
              className={
                webln && isWebLNEnabled
                  ? "bg-green-500/20 text-green-400"
                  : webln
                  ? "bg-yellow-500/20 text-yellow-400"
                  : ""
              }
            >
              {webln && isWebLNEnabled ? "Enabled" : webln ? "Available" : "Not Available"}
            </Badge>
          </div>

          {/* Wallet Error */}
          {walletError && (
            <div className="text-xs text-red-400 flex items-center space-x-1 bg-red-500/10 p-2 rounded">
              <XCircle className="h-3 w-3" />
              <span>{walletError}</span>
            </div>
          )}
        </div>

        {/* Overall Status */}
        <div className="pt-2 border-t border-lime-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-lime-300">Overall Status</span>
            <Badge
              variant={
                (relayStatus?.isConnected && (hasNWC || (webln && isWebLNEnabled)))
                  ? "default"
                  : "secondary"
              }
              className={
                (relayStatus?.isConnected && (hasNWC || (webln && isWebLNEnabled)))
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }
            >
              {(relayStatus?.isConnected && (hasNWC || (webln && isWebLNEnabled)))
                ? "All Systems Go"
                : "Limited Functionality"
              }
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}