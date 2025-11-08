/**
 * Offline Manager Component
 * Manages offline state, queued actions, and network connectivity
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Trash2,
  Send
} from 'lucide-react';
import { useOfflineState } from '@/lib/stateManagement';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface OfflineManagerProps {
  showBanner?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function OfflineManager({
  showBanner = true,
  showDetails = false,
  className
}: OfflineManagerProps) {
  const { isOnline, pendingCount, clearPending } = useOfflineState();
  const { toast } = useToast();
  const [lastStatusChange, setLastStatusChange] = useState<Date | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);

  useEffect(() => {
    setLastStatusChange(new Date());

    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Don't worry - your actions will be synced when you're back online.",
        variant: "default",
      });
    } else if (pendingCount > 0) {
      toast({
        title: "Back online!",
        description: `Syncing ${pendingCount} pending action${pendingCount > 1 ? 's' : ''}...`,
      });
    } else if (lastStatusChange) {
      toast({
        title: "Back online!",
        description: "All your data is up to date.",
      });
    }
  }, [isOnline]);

  const handleClearPending = () => {
    clearPending();
    toast({
      title: "Pending actions cleared",
      description: "All queued actions have been removed.",
    });
  };

  if (!showBanner && !showDetailsPanel) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Banner */}
      {showBanner && (
        <Alert 
          className={cn(
            'border transition-all duration-300',
            isOnline 
              ? 'border-lime-500/20 bg-lime-500/10' 
              : 'border-yellow-500/20 bg-yellow-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-lime-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-500" />
              )}
              
              <div>
                <AlertDescription className={cn(
                  'font-medium',
                  isOnline ? 'text-lime-300' : 'text-yellow-300'
                )}>
                  {isOnline ? 'Connected' : 'Offline Mode'}
                </AlertDescription>
                <p className={cn(
                  'text-xs mt-1',
                  isOnline ? 'text-lime-400/60' : 'text-yellow-400/60'
                )}>
                  {isOnline 
                    ? pendingCount > 0 
                      ? `Syncing ${pendingCount} pending action${pendingCount > 1 ? 's' : ''}...`
                      : 'All synced and up to date'
                    : 'Your actions will be saved and synced when you reconnect'
                  }
                </p>
              </div>
            </div>

            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}

            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                className="ml-2"
              >
                {showDetailsPanel ? 'Hide' : 'Show'} Details
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Details Panel */}
      {showDetailsPanel && (
        <Card className="border-lime-500/20 bg-black/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lime-400 flex items-center gap-2">
              <CloudOff className="h-5 w-5" />
              Offline Status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-lime-300">Connection Status</span>
                <Badge variant={isOnline ? "default" : "secondary"}>
                  {isOnline ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>

              {lastStatusChange && (
                <p className="text-xs text-lime-500/60">
                  Last change: {lastStatusChange.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Pending Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-lime-300">Pending Actions</span>
                <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                  {pendingCount} queued
                </Badge>
              </div>

              {pendingCount > 0 && (
                <Alert className="border-yellow-500/20 bg-yellow-500/10">
                  <Send className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-300">
                    {pendingCount} action{pendingCount > 1 ? 's' : ''} waiting to be synced.
                    {isOnline 
                      ? ' Syncing now...' 
                      : ' Will sync when connection is restored.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Actions */}
            {pendingCount > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPending}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Pending
                </Button>
                
                {isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                )}
              </div>
            )}

            {/* Offline Tips */}
            {!isOnline && (
              <Alert className="border-lime-500/20 bg-lime-500/10">
                <CloudOff className="h-4 w-4 text-lime-500" />
                <AlertDescription className="text-lime-300">
                  <p className="font-medium mb-2">While Offline:</p>
                  <ul className="text-xs space-y-1 text-lime-400/80">
                    <li>• You can browse cached content</li>
                    <li>• Posts and interactions will be queued</li>
                    <li>• Everything syncs automatically when reconnected</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Simple offline indicator for headers/navbars
 */
export function OfflineIndicatorBadge({ className }: { className?: string }) {
  const { isOnline, pendingCount } = useOfflineState();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant={isOnline ? "secondary" : "destructive"}
      className={cn('gap-1', className)}
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing {pendingCount}
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  );
}

/**
 * Minimal offline dot indicator
 */
export function OfflineDotIndicator({ className }: { className?: string }) {
  const { isOnline } = useOfflineState();

  if (isOnline) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
      <span className="text-xs text-yellow-400">Offline</span>
    </div>
  );
}

export default OfflineManager;