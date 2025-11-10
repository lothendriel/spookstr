import { useState } from 'react';
import { useGlobalRelayDiscoveryStatus, type DiscoveryContext } from '@/hooks/useContextualRelayDiscovery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Zap,
  Activity,
  Search,
  Bell,
  MessageSquare,
  Heart,
  Repeat2,
  User,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelayDiscoveryIndicatorProps {
  context: DiscoveryContext;
  eventsFound?: number;
  hintsUsed?: boolean;
  isLoading?: boolean;
  className?: string;
  variant?: 'badge' | 'detailed' | 'minimal';
  showProgress?: boolean;
}

/**
 * Visual indicator that shows relay discovery status in different contexts.
 * Provides real-time feedback about discovery effectiveness and content found.
 */
export function RelayDiscoveryIndicator({
  context,
  eventsFound = 0,
  hintsUsed = false,
  isLoading = false,
  className,
  variant = 'badge',
  showProgress = false,
}: RelayDiscoveryIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getContextIcon = (ctx: DiscoveryContext) => {
    const iconClass = "h-3 w-3";
    switch (ctx) {
      case 'feed':
        return <Activity className={iconClass} />;
      case 'post-detail':
        return <Eye className={iconClass} />;
      case 'profile':
        return <User className={iconClass} />;
      case 'notifications':
        return <Bell className={iconClass} />;
      case 'interactions':
        return <TrendingUp className={iconClass} />;
      case 'replies':
        return <MessageSquare className={iconClass} />;
      case 'zaps':
        return <Zap className={iconClass} />;
      case 'reposts':
        return <Repeat2 className={iconClass} />;
      default:
        return <Search className={iconClass} />;
    }
  };

  const getContextLabel = (ctx: DiscoveryContext) => {
    switch (ctx) {
      case 'feed': return 'Feed';
      case 'post-detail': return 'Post Detail';
      case 'profile': return 'Profile';
      case 'notifications': return 'Notifications';
      case 'interactions': return 'Interactions';
      case 'replies': return 'Replies';
      case 'zaps': return 'Zaps';
      case 'reposts': return 'Reposts';
      default: return 'Discovery';
    }
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (hintsUsed && eventsFound > 0) return 'bg-lime-50 text-lime-700 border-lime-200';
    if (eventsFound > 0) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusText = () => {
    if (isLoading) return 'Discovering...';
    if (hintsUsed && eventsFound > 0) return `Enhanced: ${eventsFound}`;
    if (eventsFound > 0) return `Found: ${eventsFound}`;
    return 'Standard';
  };

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center text-xs", className)}>
            {hintsUsed ? (
              <Zap className="h-3 w-3 text-lime-500" />
            ) : (
              <Activity className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="z-[9999]">
          <div className="text-xs font-medium">
            {hintsUsed ? `Enhanced discovery: ${eventsFound} events` : 'Standard discovery'}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'badge') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-xs cursor-help transition-colors hover:opacity-80",
              getStatusColor(),
              className
            )}
          >
            {getContextIcon(context)}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="z-[9999] max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-1 text-sm">
              {getContextIcon(context)}
              {getContextLabel(context)} Discovery
            </div>
            <div className="text-xs text-muted-foreground">
              {hintsUsed ? (
                <>Enhanced relay discovery found {eventsFound} events using relay hints</>
              ) : (
                <>Standard discovery from {eventsFound > 0 ? `${eventsFound} events` : 'configured relays'}</>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Detailed variant
  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs",
            getStatusColor(),
            className
          )}
        >
          {getContextIcon(context)}
          <span className="ml-1">{getContextLabel(context)}</span>
          {hintsUsed && <Zap className="ml-1 h-3 w-3" />}
          <span className="ml-1 font-mono">{eventsFound}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-3">
          <div>
            <div className="font-semibold flex items-center gap-2">
              {getContextIcon(context)}
              {getContextLabel(context)} Discovery
              {hintsUsed && <CheckCircle2 className="h-4 w-4 text-lime-500" />}
            </div>
            <div className="text-sm text-muted-foreground">
              Real-time relay discovery status
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">{eventsFound}</div>
              <div className="text-xs text-muted-foreground">Events Found</div>
            </div>
            <div>
              <div className="font-medium">{hintsUsed ? 'Enhanced' : 'Standard'}</div>
              <div className="text-xs text-muted-foreground">Discovery Mode</div>
            </div>
          </div>

          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Discovery Progress</span>
                <span>{hintsUsed ? '100%' : '50%'}</span>
              </div>
              <Progress value={hintsUsed ? 100 : 50} className="h-1" />
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            {hintsUsed ? (
              <>
                ✨ Using relay hints for enhanced content discovery across the network
              </>
            ) : (
              <>
                📡 Standard discovery from your configured relays
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Global status panel showing relay discovery across all contexts
 */
export function GlobalRelayDiscoveryStatus({ className }: { className?: string }) {
  const { data: status, isLoading } = useGlobalRelayDiscoveryStatus();

  if (isLoading || !status) {
    return null;
  }

  return (
    <Card className={cn("border-lime-500/20", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Discovery Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-semibold text-lg">{status.baseRelayCount}</div>
            <div className="text-xs text-muted-foreground">Base Relays</div>
          </div>
          <div>
            <div className="font-semibold text-lg">{status.hasSearchRelays ? '✓' : '✗'}</div>
            <div className="text-xs text-muted-foreground">Search Relays</div>
          </div>
        </div>

        {status.isOptimized ? (
          <Badge className="w-full bg-lime-500 text-black justify-center">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Optimized
          </Badge>
        ) : (
          <Badge variant="outline" className="w-full bg-orange-50 text-orange-700 border-orange-200 justify-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Improvement
          </Badge>
        )}

        {status.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Recommendations:</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {status.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-lime-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Context-aware discovery indicator that automatically detects the best variant
 */
export function SmartRelayDiscoveryIndicator({
  context,
  eventsFound = 0,
  hintsUsed = false,
  isLoading = false,
  className,
}: Omit<RelayDiscoveryIndicatorProps, 'variant'>) {
  // Choose variant based on context and space constraints
  const getVariant = (): 'badge' | 'detailed' | 'minimal' => {
    if (context === 'notifications' || context === 'feed') {
      return eventsFound > 20 ? 'detailed' : 'badge';
    }
    if (context === 'post-detail' || context === 'profile') {
      return 'badge';
    }
    return 'minimal';
  };

  return (
    <RelayDiscoveryIndicator
      context={context}
      eventsFound={eventsFound}
      hintsUsed={hintsUsed}
      isLoading={isLoading}
      className={className}
      variant={getVariant()}
    />
  );
}