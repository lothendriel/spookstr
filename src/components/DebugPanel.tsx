import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bug,
  Database,
  Network,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { nip19 } from 'nostr-tools';

// Authorized npubs that can access the debug panel
const AUTHORIZED_NPUBS = [
  'npub1q92nwwk8ndllkr6cdslxswt0n6pdgmm6lecpd4rwm89ydw37r0kslptxrw'
];

interface DebugInfo {
  user: any;
  config: any;
  queryCache: any;
  localStorage: any;
  performance: any;
  relayStats: any;
}

/**
 * Debug Panel component for development-time debugging and inspection.
 * Provides real-time information about app state, caches, and performance.
 * Only available for authorized npubs or in development mode.
 */
export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  // Convert user pubkey to npub for comparison
  const userNpub = user ? nip19.npubEncode(user.pubkey) : null;

  // Check if current user is authorized to see the debug panel
  const isAuthorizedUser = userNpub && AUTHORIZED_NPUBS.includes(userNpub);
  const isDevelopmentMode = !import.meta.env.PROD;

  // Don't render in production unless user is authorized
  if (import.meta.env.PROD && !isAuthorizedUser) return null;

  // Don't show the toggle button if user is not authorized in production
  const shouldShowToggleButton = isDevelopmentMode || isAuthorizedUser;

  // Collect debug information
  const collectDebugInfo = () => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    // Get localStorage info
    const localStorageInfo = {
      keys: Object.keys(localStorage),
      totalSize: Object.keys(localStorage).reduce((total, key) => {
        try {
          return total + (localStorage.getItem(key)?.length || 0);
        } catch {
          return total;
        }
      }, 0)
    };

    // Get performance info
    const performanceInfo = {
      memory: 'memory' in performance ? (performance as any).memory : null,
      timing: performance.timing ? {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
      } : null,
      navigation: performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null
    };

    // Get query cache stats
    const cacheStats = {
      totalQueries: queries.length,
      freshQueries: queries.filter(q => q.state.status === 'success' && !q.isStale()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      queryTypes: queries.reduce((acc, q) => {
        const key = q.queryKey[0] as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    setDebugInfo({
      user: user ? {
        pubkey: user.pubkey?.slice(0, 8) + '...',
        npub: userNpub?.slice(0, 16) + '...',
        isAuthorized: isAuthorizedUser,
        signer: user.signer?.constructor?.name || 'Unknown',
        loginType: user.constructor?.name || 'Unknown'
      } : null,
      config: {
        theme: config.theme,
        relayUrl: config.relayUrl,
        relayCount: config.relays?.length || 0,
        spookstrOnlyMode: config.spookstrOnlyMode,
        searchRelays: config.searchRelays?.length || 0,
        blossomServers: config.blossomServers?.length || 0
      },
      queryCache: cacheStats,
      localStorage: localStorageInfo,
      performance: performanceInfo,
      relayStats: {
        // This would be populated by relay connection status
        connected: 'N/A',
        errors: 'N/A'
      }
    });
  };

  // Auto-collect debug info when visible
  useEffect(() => {
    if (isVisible) {
      collectDebugInfo();
      const interval = setInterval(collectDebugInfo, 5000); // Reduced frequency from 2s to 5s
      return () => {
        clearInterval(interval);
        setDebugInfo(null); // Clear debug info when hidden
      };
    }
  }, [isVisible, user, config]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Clear specific cache types
  const clearQueryCache = () => {
    queryClient.clear();
    collectDebugInfo();
    console.log('🗑️ [Debug Panel] Query cache cleared');
  };

  const clearLocalStorage = () => {
    if (confirm('Clear all localStorage? This will log you out and reset all settings.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isVisible) {
    // Only show the toggle button for authorized users or in development
    if (!shouldShowToggleButton) return null;

    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm border-dashed"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
          {isAuthorizedUser && <Badge variant="secondary" className="ml-2 text-xs">ADMIN</Badge>}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none">
      <Card className="w-full max-w-4xl max-h-[80vh] pointer-events-auto bg-background/95 backdrop-blur-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Panel
              <Badge variant={isAuthorizedUser ? "default" : "secondary"}>
                {isAuthorizedUser ? "ADMIN" : "DEV"}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={collectDebugInfo}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="outline"
                size="sm"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">

              {/* User Info */}
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 hover:bg-muted rounded"
                  onClick={() => toggleSection('user')}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">User Info</span>
                    <Badge variant={debugInfo?.user ? "default" : "secondary"}>
                      {debugInfo?.user ? "Logged In" : "Guest"}
                    </Badge>
                  </div>
                  {expandedSections.has('user') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2 bg-card border rounded">
                  <pre className="text-xs p-3 rounded overflow-auto text-foreground bg-slate-900 dark:bg-slate-950 border">
                    {JSON.stringify(debugInfo?.user || "Not logged in", null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* App Config */}
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 hover:bg-muted rounded"
                  onClick={() => toggleSection('config')}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">App Configuration</span>
                  </div>
                  {expandedSections.has('config') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2 bg-card border rounded">
                  <pre className="text-xs p-3 rounded overflow-auto text-foreground bg-slate-900 dark:bg-slate-950 border">
                    {JSON.stringify(debugInfo?.config, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Query Cache */}
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 hover:bg-muted rounded"
                  onClick={() => toggleSection('cache')}
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Query Cache</span>
                    <Badge variant="outline">
                      {debugInfo?.queryCache?.totalQueries || 0} queries
                    </Badge>
                  </div>
                  {expandedSections.has('cache') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2 space-y-3 bg-card border rounded">
                  <div className="flex gap-2">
                    <Button onClick={clearQueryCache} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded overflow-auto text-foreground bg-slate-900 dark:bg-slate-950 border">
                    {JSON.stringify(debugInfo?.queryCache, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Local Storage */}
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 hover:bg-muted rounded"
                  onClick={() => toggleSection('storage')}
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Local Storage</span>
                    <Badge variant="outline">
                      {debugInfo?.localStorage?.keys?.length || 0} keys
                    </Badge>
                    <Badge variant="outline">
                      {Math.round((debugInfo?.localStorage?.totalSize || 0) / 1024)}KB
                    </Badge>
                  </div>
                  {expandedSections.has('storage') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2 space-y-3 bg-card border rounded">
                  <div className="flex gap-2">
                    <Button onClick={clearLocalStorage} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Storage
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Storage Keys:</div>
                    <div className="flex flex-wrap gap-1">
                      {debugInfo?.localStorage?.keys?.map((key: string) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Performance */}
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 hover:bg-muted rounded"
                  onClick={() => toggleSection('performance')}
                >
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    <span className="font-medium">Performance</span>
                  </div>
                  {expandedSections.has('performance') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2 bg-card border rounded">
                  <pre className="text-xs p-3 rounded overflow-auto text-foreground bg-slate-900 dark:bg-slate-950 border">
                    {JSON.stringify(debugInfo?.performance, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}