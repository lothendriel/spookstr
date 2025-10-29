/**
 * Offline Status Indicator
 * 
 * Shows the current online/offline status and sync progress
 * Provides user feedback about offline mode and pending actions
 */

import { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineNostr';
import { useOfflineSync } from '@/lib/offlineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ className, showDetails = false }: OfflineIndicatorProps) {
  const status = useOfflineStatus();
  const { forceSync } = useOfflineSync();
  const [isForceSync, setIsForceSync] = useState(false);

  const handleForceSync = async () => {
    if (!status.isOnline || status.isSyncing) return;
    
    setIsForceSync(true);
    try {
      await forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsForceSync(false);
    }
  };

  // Simple indicator for header/toolbar
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2", className)}>
              {status.isOnline ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              
              {status.pendingActions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {status.pendingActions}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">
                {status.isOnline ? 'Connected' : 'Offline Mode'}
              </div>
              {status.pendingActions > 0 && (
                <div className="text-muted-foreground">
                  {status.pendingActions} actions pending sync
                </div>
              )}
              {status.isSyncing && (
                <div className="text-blue-600">
                  Syncing... {status.syncProgress}%
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed status card
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="pt-4">
        <div className="space-y-4">
          
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-700">Offline</span>
                </>
              )}
            </div>
            
            {status.isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceSync}
                disabled={status.isSyncing || isForceSync}
                className="h-8"
              >
                <RefreshCw className={cn(
                  "h-3 w-3 mr-1",
                  (status.isSyncing || isForceSync) && "animate-spin"
                )} />
                Sync
              </Button>
            )}
          </div>

          {/* Sync Progress */}
          {status.isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Syncing...</span>
                <span className="font-medium">{status.syncProgress}%</span>
              </div>
              <Progress value={status.syncProgress} className="h-2" />
            </div>
          )}

          {/* Pending Actions */}
          {status.pendingActions > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">
                  {status.pendingActions} action{status.pendingActions !== 1 ? 's' : ''} pending
                </div>
                <div className="text-xs text-blue-700">
                  {status.isOnline 
                    ? 'Will sync automatically' 
                    : 'Will sync when back online'}
                </div>
              </div>
            </div>
          )}

          {/* Failed Actions */}
          {status.failedActions > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900">
                  {status.failedActions} failed action{status.failedActions !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-red-700">
                  Will retry automatically
                </div>
              </div>
            </div>
          )}

          {/* Last Sync */}
          {status.lastSync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>
                Last sync: {new Date(status.lastSync).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Offline Features Available */}
          {!status.isOnline && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Offline Features Available
                </span>
              </div>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Read cached posts and profiles</li>
                <li>• Write posts (will sync later)</li>
                <li>• Like and repost (will sync later)</li>
                <li>• View cached images</li>
              </ul>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact offline indicator for mobile/header use
 */
export function CompactOfflineIndicator({ className }: { className?: string }) {
  const status = useOfflineStatus();

  if (status.isOnline && status.pendingActions === 0 && status.failedActions === 0) {
    // Don't show anything when fully online and synced
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            {!status.isOnline && (
              <WifiOff className="h-4 w-4 text-orange-600" />
            )}
            
            {status.isSyncing && (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            )}
            
            {(status.pendingActions > 0 || status.failedActions > 0) && (
              <Badge 
                variant={status.failedActions > 0 ? "destructive" : "secondary"} 
                className="h-5 px-1.5 text-xs"
              >
                {status.pendingActions + status.failedActions}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>{status.isOnline ? 'Online' : 'Offline'}</div>
            {status.pendingActions > 0 && (
              <div>{status.pendingActions} pending</div>
            )}
            {status.failedActions > 0 && (
              <div>{status.failedActions} failed</div>
            )}
            {status.isSyncing && (
              <div>Syncing {status.syncProgress}%</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}