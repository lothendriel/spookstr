import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';

interface QuotedEventProps {
  eventId: string;
  className?: string;
}

/** Renders a quoted Nostr event by fetching and displaying its content */
export function QuotedEvent({ eventId, className }: QuotedEventProps) {
  const { nostr } = useNostr();

  // Fetch the quoted event
  const { data: quotedEvent, isLoading, error } = useQuery({
    queryKey: ['quoted-event', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Try to decode as NIP-19 identifier first
        const decoded = nip19.decode(eventId);
        
        if (decoded.type === 'note') {
          const events = await nostr.query([{ ids: [decoded.data] }], { signal });
          return events[0] || null;
        } else if (decoded.type === 'nevent') {
          const events = await nostr.query([{ ids: [decoded.data.id] }], { signal });
          return events[0] || null;
        } else {
          return null;
        }
      } catch {
        // If it's not a NIP-19 ID, try as raw hex ID
        const events = await nostr.query([{ ids: [eventId] }], { signal });
        return events[0] || null;
      }
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-start space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quotedEvent) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center text-lime-500/60 text-sm">
            Quoted post not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return <QuotedEventContent event={quotedEvent} className={className} />;
}

interface QuotedEventContentProps {
  event: NostrEvent;
  className?: string;
}

function QuotedEventContent({ event, className }: QuotedEventContentProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  return (
    <Card className={`border-lime-500/20 bg-lime-500/5 hover:border-lime-500/30 transition-colors cursor-pointer ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-2 mb-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-medium text-lime-400 text-sm truncate">
                {displayName}
              </span>
              <span className="text-lime-500/60 text-xs">•</span>
              <span className="text-lime-500/60 text-xs">{timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-lime-100 line-clamp-3">
          <NoteContent event={event} />
        </div>
      </CardContent>
    </Card>
  );
}