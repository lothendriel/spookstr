import { ZapDialog } from '@/components/ZapDialog';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Zap } from 'lucide-react';
import type { Event } from 'nostr-tools';

interface ZapButtonProps {
  target: Event;
  className?: string;
  showCount?: boolean;
  zapData?: { count: number; totalSats: number; isLoading?: boolean };
}

export function ZapButton({
  target,
  className = "text-xs ml-1",
  showCount = true,
  zapData: externalZapData
}: ZapButtonProps) {
  const { user } = useCurrentUser();
  const { data: author } = useAuthor(target?.pubkey || '');
  const { webln, activeNWC } = useWallet();

  const { totalSats: fetchedTotalSats, isLoading } = useZaps(
    externalZapData ? [] : target ? [target.id] : [],
    webln,
    activeNWC
  );

  if (!target) {
    return null;
  }

  const canZap = user && user.pubkey !== target.pubkey && (author?.metadata?.lud16 || author?.metadata?.lud06);
  const totalSats = externalZapData?.totalSats ?? fetchedTotalSats;
  const showLoading = externalZapData?.isLoading || isLoading;

  const formatZapAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      const formatted = (amount / 1000).toFixed(1);
      if (formatted.endsWith('.0')) {
        return `${formatted.split('.')[0]}K`;
      }
      return `${formatted}K`;
    }
    return amount.toLocaleString();
  };

  const content = (
    <div className={`flex items-center gap-1 ${className}`}> // Fixed missing closing bracket
      <Zap className="h-4 w-4" />
      <span className="text-xs">
        {showLoading ? '...' :
          showCount && totalSats > 0 ?
            formatZapAmount(totalSats)
          : 'Zap'}
      </span>
    </div>
  );

  if (!canZap) {
    return content;
  }

  return (
    <ZapDialog target={target}>
      {content}
    </ZapDialog>
  );
}