import { Zap, Activity, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RelayHintIndicatorProps {
  /** Whether relay hints were used for this query */
  usedHints?: boolean;
  /** Number of relay hints discovered */
  hintCount?: number;
  /** Base number of relays used */
  baseRelayCount?: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Visual indicator showing when relay hints are being used for better content discovery
 * Helps users understand when the app is using advanced relay discovery techniques
 */
export function RelayHintIndicator({
  usedHints = false,
  hintCount = 0,
  baseRelayCount = 0,
  className,
  size = 'sm'
}: RelayHintIndicatorProps) {
  if (!usedHints || hintCount === 0) {
    return null;
  }

  const totalRelays = baseRelayCount + hintCount;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "bg-lime-500/10 text-lime-400 border-lime-500/30 hover:bg-lime-500/20 transition-colors cursor-help",
            size === 'sm' ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
            className
          )}
        >
          <Zap className={cn(iconSize, "mr-1")} />
          {hintCount} hint{hintCount === 1 ? '' : 's'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Enhanced Relay Discovery
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Base relays: {baseRelayCount}</div>
            <div>• Discovered hints: {hintCount}</div>
            <div>• Total relays queried: {totalRelays}</div>
          </div>
          <div className="text-xs text-lime-400 pt-1 border-t">
            <CheckCircle className="h-3 w-3 inline mr-1" />
            Using advanced discovery for better results
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version for use in small spaces like post metadata
 */
export function CompactRelayHintIndicator({ usedHints, hintCount, className }: Pick<RelayHintIndicatorProps, 'usedHints' | 'hintCount' | 'className'>) {
  if (!usedHints || !hintCount) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center text-lime-400/60", className)}>
          <Zap className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Enhanced with {hintCount} relay hint{hintCount === 1 ? '' : 's'}
      </TooltipContent>
    </Tooltip>
  );
}