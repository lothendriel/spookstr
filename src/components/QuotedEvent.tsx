import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { useMultiRelayEvent } from '@/hooks/useMultiRelayQuery';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';

interface QuotedEventProps {
  eventId: string;
  className?: string;
}

/** Renders a quoted Nostr event by fetching and displaying its content */
export function QuotedEvent({ eventId, className }: QuotedEventProps) {
  // Extract actual event ID from NIP-19 format
  const actualEventId = useMemo(() => {
    try {
      const decoded = nip19.decode(eventId);
      if (decoded.type === 'note') {
        return decoded.data;
      } else if (decoded.type === 'nevent') {
        return decoded.data.id;
      }
      return eventId; // Fallback to original
    } catch {
      return eventId; // Fallback to original
    }
  }, [eventId]);

  // Fetch quoted event from multiple relays
  const { data: quotedEvent, isLoading, error } = useMultiRelayEvent(actualEventId, !!eventId);

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

  if (error) {
    console.log('QuotedEvent: Error fetching event:', error);
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center text-lime-500/60 text-sm">
            Unable to load quoted post
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotedEvent) {
    console.log('QuotedEvent: No event found for ID:', actualEventId);
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center">
            <div className="text-lime-500/60 text-sm mb-1">
              Quoted post not found
            </div>
            <a
              href={`https://njump.me/nostr:${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lime-400 hover:text-lime-300 hover:underline"
            >
              View on Nostr →
            </a>
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